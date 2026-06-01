import type { Context, MiddlewareHandler } from 'hono'
import { createAuth } from '../auth.ts'

/**
 * Extract a `waitUntil` from the Hono context if available. In the
 * Cloudflare Workers runtime this is `executionCtx.waitUntil`, which
 * lets Better Auth's api-key plugin defer rate-limit counter
 * updates until after the response is flushed.
 */
function getWaitUntil(
  c: Context,
): ((promise: Promise<unknown>) => void) | undefined {
  const ctx =
    (c.executionCtx as { waitUntil?: (p: Promise<unknown>) => void }
    | undefined) ?? undefined
  if (ctx && typeof ctx.waitUntil === 'function') {
    return ctx.waitUntil.bind(ctx)
  }
  return undefined
}

/**
 * Build a Better Auth instance bound to the current request.
 */
export function authFromContext(c: Context) {
  return createAuth(c.env, { waitUntil: getWaitUntil(c) })
}

/**
 * Mount the Better Auth handler at /-/auth/*.
 *
 * The handler owns its own sub-tree (sign-up, sign-in, sessions,
 * OAuth callbacks, 2FA, etc.) so we forward the raw request to it.
 */
export const betterAuthHandler = (async (c: Context) => {
  const auth = authFromContext(c)
  return auth.handler(c.req.raw)
}) as MiddlewareHandler

/**
 * Attach the current Better Auth session (if any) onto the Hono
 * context as `c.var.session` / `c.var.auth`. This lets downstream
 * routes know whether the request is coming from a logged-in web
 * user vs. a bearer-token client.
 *
 * Typed loosely so it can be `app.use('*', sessionContext)`'d on
 * the existing OpenAPIHono app without changing its Variables map.
 */
export const sessionContext: MiddlewareHandler = async (c, next) => {
  if (!c.env.BETTER_AUTH_SECRET || !c.env.DB) {
    await next()
    return
  }
  try {
    const auth = authFromContext(c)
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })
    c.set('auth', auth)
    c.set('session', session)
  } catch {
    // Treat session lookup failures as anonymous — the route can
    // still fall back to bearer-token auth.
  }
  await next()
}
