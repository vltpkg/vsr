import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins'
import { apiKey } from '@better-auth/api-key'
import { drizzle } from 'drizzle-orm/d1'
import type { D1Database } from '@cloudflare/workers-types'
import * as schema from './db/schema.ts'
import type { Environment } from '../types.ts'

export type CreateAuthOptions = {
  /**
   * Hook to defer non-critical writes (api-key rate-limit counters,
   * `lastRequest` timestamps, etc.) until after the response is
   * flushed. In a Cloudflare Worker this should be
   * `executionCtx.waitUntil`.
   */
  waitUntil?: (promise: Promise<unknown>) => void
}

/**
 * Create a Better Auth instance bound to the request's D1 database
 * and environment. Better Auth is configured per-request because
 * the D1 binding only exists inside the worker fetch handler.
 */
export function createAuth(
  env: Environment,
  opts: CreateAuthOptions = {},
) {
  const d1 = env.DB as D1Database | undefined
  if (!d1) {
    throw new Error(
      'Cannot initialize Better Auth: D1 database binding (DB) is missing',
    )
  }

  const db = drizzle(d1, { schema })

  return betterAuth({
    // Storage
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
        apikey: schema.apikey,
      },
    }),

    // Secrets / URLs (provided via env / wrangler secrets)
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/-/auth',

    // Treat the registry origin (and any vlt.json-configured one) as
    // a trusted origin so the worker can serve auth from the same host.
    // `WEB_URL` is the optional companion Next.js app; comma-separated
    // values are also supported for multi-environment setups.
    trustedOrigins: [
      env.BETTER_AUTH_URL,
      env.URL,
      ...(env.WEB_URL?.split(',').map(s => s.trim()) ?? []),
    ].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    ),

    // Credential auth (email + password)
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      // Email verification is recommended for publish flows; flip on
      // once an email sender is wired up.
      requireEmailVerification: false,
      minPasswordLength: 8,
    },

    // Social providers — only enabled when both env vars are present.
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ?
        {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ?
        {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    },

    // Cloudflare Workers: defer non-critical writes via waitUntil.
    ...(opts.waitUntil ?
      {
        advanced: {
          backgroundTasks: {
            handler: opts.waitUntil,
          },
        } as never, // typed loosely; older type defs lag the runtime
      }
    : {}),

    plugins: [
      // Two-factor auth — required before publishing per npm convention.
      // `issuer` is the label authenticator apps display next to the
      // account ("Google Authenticator", "1Password", …). Fall back to a
      // friendly default so dev environments don't show `localhost`.
      twoFactor({
        issuer: env.AUTH_2FA_ISSUER || 'vsr',
      }),

      // npm-style personal access tokens, owned by users.
      apiKey({
        defaultPrefix: 'vsr_pat_',
        defaultKeyLength: 64,
        startingCharactersConfig: {
          shouldStore: true,
          charactersLength: 6,
        },
        // npm CLIs send `Authorization: Bearer <token>` — pick it up
        // in addition to the default `x-api-key` header so existing
        // tooling keeps working.
        customAPIKeyGetter: ctx => {
          const raw = ctx.headers?.get('authorization') ?? ''
          if (raw.toLowerCase().startsWith('bearer ')) {
            return raw.slice(7).trim() || null
          }
          return ctx.headers?.get('x-api-key') ?? null
        },
        // An api-key counts as a session for downstream routes that
        // call `auth.api.getSession`.
        enableSessionForAPIKeys: true,
        enableMetadata: true,
        rateLimit: { enabled: false },
        // Push counter / lastRequest writes off the response path.
        deferUpdates: Boolean(opts.waitUntil),
        // Default permissions for newly-created keys; per-value
        // targeting lives in the companion `token_scopes` table.
        permissions: {
          defaultPermissions: { pkg: ['read'] },
        },
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
export type AuthSession = Awaited<
  ReturnType<Auth['api']['getSession']>
>
