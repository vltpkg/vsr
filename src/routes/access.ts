import { getAuthedUser } from '../utils/auth.ts'
import { createRoute, z } from '@hono/zod-openapi'
import type {
  HonoContext,
  DatabaseOperations,
  AccessResponse,
  AuthUser,
} from '../../types.ts'

function getDb(c: HonoContext): DatabaseOperations {
  return c.get('db')
}

interface PackageAccessEntry {
  name: string
  collaborators: Record<string, 'read-only' | 'read-write'>
}

interface PackageListResponse {
  packages: PackageAccessEntry[]
  total: number
}

interface SetAccessRequestBody {
  collaborators?: Record<string, 'read-only' | 'read-write'>
}

interface GrantAccessRequestBody {
  permission: 'read-only' | 'read-write'
}

/**
 * Walk every `(api-key, scope)` row in the database and aggregate it
 * into the npm-shaped `{ [pkg]: { [userId]: 'read-only' | 'read-write' } }`
 * map. Used by every read endpoint in this module so we have a
 * single source of truth.
 */
async function collectCollaborators(c: HonoContext) {
  const db = getDb(c)
  const rows = await db.listAllScopes()
  const byPackage: Record<
    string,
    Record<string, 'read-only' | 'read-write'>
  > = {}
  for (const row of rows) {
    if (row.target !== 'pkg') continue
    byPackage[row.value] ??= {}
    const existing = byPackage[row.value][row.referenceId]
    const permission: 'read-only' | 'read-write' =
      row.write ? 'read-write' : 'read-only'
    // If multiple keys exist for the same user, surface the broader
    // permission so the UI doesn't lie about access.
    if (existing !== 'read-write') {
      byPackage[row.value][row.referenceId] = permission
    }
  }
  return byPackage
}

/**
 * Lists every package the authenticated user has access to.
 */
export async function listPackagesAccess(c: HonoContext) {
  try {
    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const map = await collectCollaborators(c)
    const packages: PackageAccessEntry[] = []
    for (const [name, collaborators] of Object.entries(map)) {
      // Wildcard rows expose the package to every user, but the npm
      // list endpoint expects concrete entries. We surface wildcards
      // only if the caller is the owner of the wildcard key.
      if (name === '*') continue
      if (
        Object.keys(collaborators).includes(user.uuid) ||
        Object.values(map['*'] ?? {}).length > 0
      ) {
        packages.push({ name, collaborators })
      }
    }

    const response: PackageListResponse = {
      packages,
      total: packages.length,
    }
    return c.json(response)
  } catch (_error) {
    return c.json({ error: 'Failed to list packages' }, 500)
  }
}

/**
 * Gets the access status for a specific package.
 */
export async function getPackageAccessStatus(c: HonoContext) {
  try {
    const { scope, pkg } = c.req.param()
    const packageName = scope && pkg ? `${scope}/${pkg}` : scope
    if (!packageName) {
      return c.json({ error: 'Package name required' }, 400)
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const hasAccess = await checkPackageAccess(c, packageName, user)
    if (!hasAccess) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const map = await collectCollaborators(c)
    const collaborators = {
      ...(map['*'] ?? {}),
      ...(map[packageName] ?? {}),
    }
    if (!collaborators[user.uuid]) {
      collaborators[user.uuid] = 'read-write'
    }

    const response: AccessResponse = {
      name: packageName,
      collaborators,
    }
    return c.json(response)
  } catch (_error) {
    return c.json({ error: 'Failed to get package access' }, 500)
  }
}

/**
 * Bulk-set collaborator permissions for a package. Replaces every
 * existing collaborator scope row for the package.
 */
export async function setPackageAccessStatus(c: HonoContext) {
  try {
    const { scope, pkg } = c.req.param()
    const packageName = scope && pkg ? `${scope}/${pkg}` : scope
    if (!packageName) {
      return c.json({ error: 'Package name required' }, 400)
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const body =
      (await c.req.json()) as unknown as SetAccessRequestBody

    const hasAdminAccess = await checkPackageAdminAccess(
      c,
      packageName,
      user,
    )
    if (!hasAdminAccess) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const db = getDb(c)
    // First, remove the package from every key's scopes…
    await db.removeScopeRows(null, 'pkg', packageName)

    // …then re-apply the requested collaborators.
    const collaborators = body.collaborators ?? {}
    for (const [username, permission] of Object.entries(
      collaborators,
    )) {
      const userId = await db.getUserIdByName(username)
      if (!userId) continue
      const keys = await db.getKeysForUser(userId)
      const write = permission === 'read-write'
      for (const key of keys) {
        await db.addScopeForKey(key.id, {
          target: 'pkg',
          value: packageName,
          read: true,
          write,
        })
      }
    }

    const response: AccessResponse = {
      name: packageName,
      collaborators,
    }
    return c.json(response)
  } catch (_error) {
    return c.json({ error: 'Failed to set package access' }, 500)
  }
}

/**
 * Grants a single user read or read-write access to a package by
 * adding a scope row to every api-key they own.
 */
export async function grantPackageAccess(c: HonoContext) {
  try {
    const { scope, pkg, username } = c.req.param()
    const packageName = scope && pkg ? `${scope}/${pkg}` : scope
    if (!packageName || !username) {
      return c.json(
        { error: 'Package name and username required' },
        400,
      )
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const body =
      (await c.req.json()) as unknown as GrantAccessRequestBody

    const hasAdminAccess = await checkPackageAdminAccess(
      c,
      packageName,
      user,
    )
    if (!hasAdminAccess) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const db = getDb(c)
    const targetUserId = await db.getUserIdByName(username)
    if (!targetUserId) {
      return c.json({ error: 'User not found' }, 404)
    }

    const keys = await db.getKeysForUser(targetUserId)
    if (keys.length === 0) {
      return c.json(
        {
          error:
            'Target user has no api-keys; ask them to mint one first',
        },
        409,
      )
    }

    const write = body.permission === 'read-write'
    for (const key of keys) {
      await db.removeScopeRows(key.id, 'pkg', packageName)
      await db.addScopeForKey(key.id, {
        target: 'pkg',
        value: packageName,
        read: true,
        write,
      })
    }

    const map = await collectCollaborators(c)
    const response: AccessResponse = {
      name: packageName,
      collaborators: {
        ...(map[packageName] ?? {}),
        [user.uuid]: 'read-write',
      },
    }
    return c.json(response)
  } catch (_error) {
    return c.json({ error: 'Failed to grant package access' }, 500)
  }
}

/**
 * Revokes a user's access to a package by removing every matching
 * scope row across all of their api-keys.
 */
export async function revokePackageAccess(c: HonoContext) {
  try {
    const { scope, pkg, username } = c.req.param()
    const packageName = scope && pkg ? `${scope}/${pkg}` : scope
    if (!packageName || !username) {
      return c.json(
        { error: 'Package name and username required' },
        400,
      )
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const hasAdminAccess = await checkPackageAdminAccess(
      c,
      packageName,
      user,
    )
    if (!hasAdminAccess) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const db = getDb(c)
    const targetUserId = await db.getUserIdByName(username)
    if (!targetUserId) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (targetUserId === user.uuid) {
      return c.json({ error: 'Cannot revoke your own access' }, 400)
    }

    const keys = await db.getKeysForUser(targetUserId)
    for (const key of keys) {
      await db.removeScopeRows(key.id, 'pkg', packageName)
    }

    const map = await collectCollaborators(c)
    const response: AccessResponse = {
      name: packageName,
      collaborators: map[packageName] ?? {},
    }
    return c.json(response)
  } catch (_error) {
    return c.json({ error: 'Failed to revoke package access' }, 500)
  }
}

/**
 * Helper function to check if user has access to a package
 */
async function checkPackageAccess(
  _c: HonoContext,
  packageName: string,
  user: AuthUser,
): Promise<boolean> {
  if (!user.scope || !user.uuid) {
    return false
  }

  // Check if user has global access or specific package access
  for (const scope of user.scope) {
    if (scope.types.pkg) {
      // Check for global access
      if (scope.values.includes('*') && scope.types.pkg.read) {
        return true
      }

      // Check for specific package access
      if (
        scope.values.includes(packageName) &&
        scope.types.pkg.read
      ) {
        return true
      }
    }
  }

  return false
}

/**
 * Helper function to check if user has admin access to a package
 */
async function checkPackageAdminAccess(
  _c: HonoContext,
  packageName: string,
  user: AuthUser,
): Promise<boolean> {
  if (!user.scope || !user.uuid) {
    return false
  }

  // Check if user has global write access or specific package write access
  for (const scope of user.scope) {
    if (scope.types.pkg) {
      // Check for global write access
      if (scope.values.includes('*') && scope.types.pkg.write) {
        return true
      }

      // Check for specific package write access
      if (
        scope.values.includes(packageName) &&
        scope.types.pkg.write
      ) {
        return true
      }
    }
  }

  return false
}

// Route definitions for OpenAPI documentation
export const getPackageAccessRoute = createRoute({
  method: 'get',
  path: '/-/package/{pkg}/access',
  tags: ['Access Control'],
  summary: 'Get Package Access',
  description: `Get access control information for a package`,
  request: {
    params: z.object({
      pkg: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Package access information',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const setPackageAccessRoute = createRoute({
  method: 'post',
  path: '/-/package/{pkg}/access',
  tags: ['Access Control'],
  summary: 'Set Package Access',
  description: `Set access control information for a package`,
  request: {
    params: z.object({
      pkg: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            collaborators: z
              .record(z.enum(['read-only', 'read-write']))
              .optional(),
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
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Package access updated successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const getScopedPackageAccessRoute = createRoute({
  method: 'get',
  path: '/-/package/{scope}%2f{pkg}/access',
  tags: ['Access Control'],
  summary: 'Get Scoped Package Access',
  description: `Get access control information for a scoped package`,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Package access information',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const setScopedPackageAccessRoute = createRoute({
  method: 'post',
  path: '/-/package/{scope}%2f{pkg}/access',
  tags: ['Access Control'],
  summary: 'Set Scoped Package Access',
  description: `Set access control information for a scoped package`,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            collaborators: z
              .record(z.enum(['read-only', 'read-write']))
              .optional(),
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
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Package access updated successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const listPackagesAccessRoute = createRoute({
  method: 'get',
  path: '/-/package/list',
  tags: ['Access Control'],
  summary: 'List Package Access',
  description: `List all packages the authenticated user has access to`,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            packages: z.array(
              z.object({
                name: z.string(),
                collaborators: z.record(
                  z.enum(['read-only', 'read-write']),
                ),
              }),
            ),
            total: z.number(),
          }),
        },
      },
      description: 'List of packages with access information',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
  },
})

export const grantPackageAccessRoute = createRoute({
  method: 'put',
  path: '/-/package/{pkg}/collaborators/{username}',
  tags: ['Access Control'],
  summary: 'Grant Package Access',
  description: `Grant access to a package for a specific user`,
  request: {
    params: z.object({
      pkg: z.string(),
      username: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            permission: z.enum(['read-only', 'read-write']),
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
            name: z.string(),
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Access granted successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const revokePackageAccessRoute = createRoute({
  method: 'delete',
  path: '/-/package/{pkg}/collaborators/{username}',
  tags: ['Access Control'],
  summary: 'Revoke Package Access',
  description: `Revoke access to a package for a specific user`,
  request: {
    params: z.object({
      pkg: z.string(),
      username: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Access revoked successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const grantScopedPackageAccessRoute = createRoute({
  method: 'put',
  path: '/-/package/{scope}%2f{pkg}/collaborators/{username}',
  tags: ['Access Control'],
  summary: 'Grant Scoped Package Access',
  description: `Grant access to a scoped package for a specific user`,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
      username: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            permission: z.enum(['read-only', 'read-write']),
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
            name: z.string(),
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Access granted successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const revokeScopedPackageAccessRoute = createRoute({
  method: 'delete',
  path: '/-/package/{scope}%2f{pkg}/collaborators/{username}',
  tags: ['Access Control'],
  summary: 'Revoke Scoped Package Access',
  description: `Revoke access to a scoped package for a specific user`,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
      username: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Access revoked successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})
