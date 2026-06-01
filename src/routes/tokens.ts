import { getTokenFromHeader } from '../utils/auth.ts'
import { authFromContext } from '../middleware/auth.ts'
import type {
  HonoContext,
  DatabaseOperations,
  TokenScope,
} from '../../types.ts'
import { createRoute, z } from '@hono/zod-openapi'

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function getDb(c: HonoContext): DatabaseOperations {
  return c.get('db')
}

/**
 * Resolve the authenticated user's id from either:
 *   1) a Better Auth session cookie (web flow), or
 *   2) the `Authorization: Bearer <api-key>` header (CLI flow).
 *
 * Returns `null` when the request is unauthenticated.
 */
async function getCallerUserId(
  c: HonoContext,
): Promise<string | null> {
  const sessionLike = (c as unknown as { get(name: string): unknown }
    ).get('session') as
    | { user?: { id?: string } }
    | null
    | undefined
  if (sessionLike?.user?.id) return sessionLike.user.id

  const token = getTokenFromHeader(c)
  if (!token) return null

  try {
    const auth = authFromContext(c as never)
    const result = await auth.api.verifyApiKey({ body: { key: token } })
    if (!result.valid || !result.key) return null
    return result.key.referenceId
  } catch {
    return null
  }
}

/**
 * Derive a Better Auth `permissions` map from our legacy
 * TokenScope[] shape. The plugin's `permissions` field only stores
 * the verb set; per-value targeting lives in `token_scopes`.
 */
function permissionsFromScope(
  scope: TokenScope[] | undefined,
): Record<string, string[]> {
  const out: Record<string, Set<string>> = {}
  for (const s of scope ?? []) {
    for (const target of ['pkg', 'user'] as const) {
      const t = s.types[target]
      if (!t) continue
      out[target] ??= new Set<string>()
      if (t.read) out[target].add('read')
      if (t.write) out[target].add('write')
    }
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v]]),
  )
}

/**
 * Decorate a list of plugin api-key rows with their corresponding
 * scope rows, joined from `token_scopes`. Returns an npm-friendly
 * shape so existing CLI tooling can read the response.
 */
async function decorateKeys(
  c: HonoContext,
  keys: Array<{
    id: string
    name?: string | null
    start?: string | null
    prefix?: string | null
    referenceId: string
    enabled?: boolean | null
    createdAt: Date | string
    updatedAt: Date | string
    expiresAt?: Date | string | null
  }>,
) {
  const db = getDb(c)
  const objects = await Promise.all(
    keys.map(async key => ({
      key: key.id,
      // Display-only token preview, e.g. "vsr_pat_abc123…". The raw
      // value is only returned at creation time.
      token: `${key.prefix ?? ''}${key.start ?? ''}…`,
      name: key.name ?? null,
      uuid: key.referenceId,
      scope: await db.getScopesForKey(key.id),
      readonly: false,
      automation: false,
      enabled: key.enabled !== false,
      created: new Date(key.createdAt).toISOString(),
      updated: new Date(key.updatedAt).toISOString(),
      expires:
        key.expiresAt ? new Date(key.expiresAt).toISOString() : null,
    })),
  )
  return objects
}

// ---------------------------------------------------------
// Handlers
// ---------------------------------------------------------

/**
 * GET /-/tokens — list the caller's api-keys (plus their scopes).
 */
export async function getToken(c: HonoContext) {
  const userId = await getCallerUserId(c)
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = getDb(c)
  const keys = await db.getKeysForUser(userId)
  const objects = await decorateKeys(c, keys)
  return c.json({ objects, total: objects.length })
}

/**
 * POST /-/tokens — mint a new api-key for the caller.
 *
 * Body: `{ name?, scope?, expiresIn?, metadata? }`
 *   - `scope` follows the legacy `TokenScope[]` shape.
 *   - `expiresIn` is seconds (forwarded to the plugin).
 *
 * Returns the plaintext key exactly once.
 */
export async function postToken(c: HonoContext) {
  try {
    const userId = await getCallerUserId(c)
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = (await c.req.json()) as {
      name?: string
      scope?: TokenScope[]
      expiresIn?: number
      metadata?: Record<string, unknown>
    }

    const auth = authFromContext(c as never)
    const created = await auth.api.createApiKey({
      body: {
        userId,
        name: body.name,
        prefix: 'vsr_pat_',
        ...(body.expiresIn ? { expiresIn: body.expiresIn } : {}),
        permissions: permissionsFromScope(body.scope),
        ...(body.metadata ? { metadata: body.metadata } : {}),
      },
    })

    if (body.scope && body.scope.length > 0) {
      await getDb(c).replaceScopesForKey(created.id, body.scope)
    }

    return c.json(
      {
        token: created.key,
        key: created.id,
        name: created.name ?? null,
        uuid: userId,
        scope: body.scope ?? [],
      },
      201,
    )
  } catch (error) {
    const err = error as Error
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('UNAUTHORIZED')
    ) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    return c.json(
      { error: 'Internal server error', message: err.message },
      500,
    )
  }
}

/**
 * PUT /-/tokens — update an existing key's name and/or scopes.
 *
 * Body: `{ keyId, name?, scope? }`
 */
export async function putToken(c: HonoContext) {
  try {
    const userId = await getCallerUserId(c)
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = (await c.req.json()) as {
      keyId?: string
      name?: string
      scope?: TokenScope[]
    }

    if (!body.keyId) {
      return c.json({ error: 'Missing required field: keyId' }, 400)
    }

    const db = getDb(c)
    const owned = await db.getKeysForUser(userId)
    if (!owned.some(k => k.id === body.keyId)) {
      return c.json({ error: 'Key not found' }, 404)
    }

    if (body.name !== undefined) {
      const auth = authFromContext(c as never)
      await auth.api.updateApiKey({
        body: { keyId: body.keyId, name: body.name, userId },
      })
    }

    if (body.scope) {
      await db.replaceScopesForKey(body.keyId, body.scope)
    }

    return c.json({ success: true, key: body.keyId })
  } catch (error) {
    const err = error as Error
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('UNAUTHORIZED')
    ) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    return c.json(
      { error: 'Internal server error', message: err.message },
      500,
    )
  }
}

/**
 * DELETE /-/tokens/token/{token} — revoke a key by its id (the
 * `apikey.id`, which is what the LIST endpoint surfaces as `key`).
 */
export async function deleteToken(c: HonoContext) {
  try {
    const userId = await getCallerUserId(c)
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const keyId = c.req.param('token')
    if (!keyId) {
      return c.json(
        { error: 'Key id parameter required (apikey.id)' },
        400,
      )
    }

    const db = getDb(c)
    const owned = await db.getKeysForUser(userId)
    if (!owned.some(k => k.id === keyId)) {
      // Return 404 (not 401) so we don't leak the existence of
      // keys owned by other users.
      return c.json({ error: 'Key not found' }, 404)
    }

    const auth = authFromContext(c as never)
    await auth.api.deleteApiKey({
      body: { keyId },
    })

    return c.json({ success: true })
  } catch (error) {
    const err = error as Error
    return c.json(
      { error: 'Internal server error', message: err.message },
      500,
    )
  }
}

// ---------------------------------------------------------
// OpenAPI route definitions
// ---------------------------------------------------------

const scopeSchema = z
  .array(
    z.object({
      values: z.array(z.string()),
      types: z.object({
        pkg: z
          .object({ read: z.boolean(), write: z.boolean() })
          .optional(),
        user: z
          .object({ read: z.boolean(), write: z.boolean() })
          .optional(),
      }),
    }),
  )
  .openapi('TokenScope')

export const getTokensRoute = createRoute({
  method: 'get',
  path: '/-/tokens',
  tags: ['Authentication'],
  summary: 'List Tokens',
  description: `List the authenticated user's api-keys.
\`\`\`bash
$ npm token list
\`\`\``,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            objects: z.array(
              z.object({
                key: z.string(),
                token: z.string(),
                name: z.string().nullable(),
                uuid: z.string(),
                scope: scopeSchema,
                readonly: z.boolean(),
                automation: z.boolean(),
                enabled: z.boolean(),
                created: z.string(),
                updated: z.string(),
                expires: z.string().nullable(),
              }),
            ),
            total: z.number(),
          }),
        },
      },
      description: 'List of tokens',
    },
  },
})

export const createTokenRoute = createRoute({
  method: 'post',
  path: '/-/tokens',
  tags: ['Authentication'],
  summary: 'Create Token',
  description: `Mint a new api-key. The plaintext value is only
returned in this response; record it now.`,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().optional(),
            scope: scopeSchema.optional(),
            expiresIn: z.number().optional(),
            metadata: z.record(z.unknown()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            key: z.string(),
            name: z.string().nullable(),
            uuid: z.string(),
            scope: scopeSchema,
          }),
        },
      },
      description: 'Token created successfully',
    },
  },
})

export const updateTokenRoute = createRoute({
  method: 'put',
  path: '/-/tokens',
  tags: ['Authentication'],
  summary: 'Update Token',
  description: `Update a key's name and/or scopes by its id.`,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            keyId: z.string(),
            name: z.string().optional(),
            scope: scopeSchema.optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            key: z.string(),
          }),
        },
      },
      description: 'Token updated successfully',
    },
  },
})

export const deleteTokenRoute = createRoute({
  method: 'delete',
  path: '/-/tokens/token/{token}',
  tags: ['Authentication'],
  summary: 'Delete Token',
  description: `Revoke a key by its id.
\`\`\`bash
$ npm token revoke <keyId>
\`\`\``,
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
      description: 'Token deleted successfully',
    },
  },
})
