/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { OPEN_API_CONFIG } from '../config.ts'
import { OpenAPIHono } from '@hono/zod-openapi'
import { requestId } from 'hono/request-id'
import { bearerAuth } from 'hono/bearer-auth'
import { cors } from 'hono/cors'
import { except } from 'hono/combine'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { telemetryMiddleware } from './middleware/telemetry.ts'
import { configMiddleware } from './middleware/config.ts'
import {
  betterAuthHandler,
  sessionContext,
} from './middleware/auth.ts'
import { verifyToken } from './utils/auth.ts'
import { mountDatabase } from './utils/database.ts'
import { jsonResponseHandler } from './utils/response.ts'
import { requiresToken } from './utils/routes.ts'
import {
  getUsername,
  getUserProfile,
  userProfileRoute,
  whoamiRoute,
} from './routes/users.ts'
import { pingRoute, handlePing } from './routes/ping.ts'
import { getDocs } from './routes/docs.ts'
import {
  getToken,
  putToken,
  postToken,
  deleteToken,
  getTokensRoute,
  createTokenRoute,
  updateTokenRoute,
  deleteTokenRoute,
} from './routes/tokens.ts'
import {
  getPackageDistTags,
  putPackageDistTag,
  deletePackageDistTag,
  handleRootPackageRoute,
  handlePackagePublish,
  handlePackageVersion,
  handlePackageTarball,
  handleUpstreamPackage,
  handleUpstreamScopedTarball,
  handleUpstreamScopedVersion,
  handleUpstreamEncodedScoped,
  handleUpstreamUnified,
  handleUpstreamTarball,
  // Local package route definitions
  getPackageRoute,
  getPackageVersionRoute,
  getPackageTarballRoute,
  publishPackageRoute,
  getPackageDistTagsRoute,
  putPackageDistTagRoute,
  deletePackageDistTagRoute,
  getPackageReadmeHandler,
  getPackageReadmeRoute,
  getScopedPackageReadmeRoute,
  // Upstream package route definitions
  getUpstreamPackageRoute,
  getUpstreamScopedPackageVersionRoute,
  getUpstreamPackageTarballRoute,
  getUpstreamScopedPackageTarballRoute,
  getUpstreamEncodedScopedPackageRoute,
  getUpstreamUnifiedRoute,
} from './routes/packages.ts'
import {
  listPackagesAccess,
  getPackageAccessStatus,
  setPackageAccessStatus,
  grantPackageAccess,
  revokePackageAccess,
  // OpenAPI route definitions
  getPackageAccessRoute,
  setPackageAccessRoute,
  getScopedPackageAccessRoute,
  setScopedPackageAccessRoute,
  listPackagesAccessRoute,
  grantPackageAccessRoute,
  revokePackageAccessRoute,
  grantScopedPackageAccessRoute,
  revokeScopedPackageAccessRoute,
} from './routes/access.ts'
import {
  searchPackages,
  searchPackagesRoute,
  getSearchSourcesHandler,
} from './routes/search.ts'
import {
  auditRoute,
  auditQuickRoute,
  advisoriesBulkRoute,
  dashboardDataRoute,
  appDataRoute,
  handleDashboardData,
  handleAppData,
  handleSecurityAudit,
  // Compatibility redirect routes
  searchRedirectRoute,
  userRedirectRoute,
  tokensRedirectRoute,
  createTokenRedirectRoute,
  updateTokenRedirectRoute,
  deleteTokenRedirectRoute,
} from './routes/misc.ts'

import { sessionMonitor } from './utils/tracing.ts'
import type { createDatabaseOperations } from './db/client.ts'
import {
  handleStaticAssets,
  handleFavicon,
  handleRobots,
  handleManifest,
} from './routes/static.ts'
import type { Environment } from '../types.ts'
import type { Context } from 'hono'

// Import queue handler from dedicated module
import { queue } from './queue/index.ts'

// ---------------------------------------------------------
// App Initialization
// ("strict mode" is turned off to ensure that routes like
// `/hello` & `/hello/` are handled the same way - ref.
// https://hono.dev/docs/api/hono#strict-mode)
// ---------------------------------------------------------

const app = new OpenAPIHono<{
  Bindings: Environment
  Variables: {
    db: ReturnType<typeof createDatabaseOperations>
  }
}>({ strict: false })

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

app.use(trimTrailingSlash())
app.use('*', requestId())
app.use('*', logger())
app.use('*', configMiddleware)
app.use('*', telemetryMiddleware)
app.use('*', secureHeaders())

// CORS — allows the companion Next.js web UI (and any other operator-
// configured origins) to call the registry with credentials. Set
// `WEB_URL` to a comma-separated allowlist; localhost dev origins are
// always allowed.
app.use('*', (c, next) => {
  const allowlist = new Set<string>(
    [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      ...(c.env.WEB_URL?.split(',').map(s => s.trim()) ?? []),
    ].filter(Boolean),
  )
  return cors({
    origin: (origin: string) =>
      allowlist.has(origin) ? origin : null,
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Set-Cookie'],
    credentials: true,
    maxAge: 600,
  })(c as any, next)
})

app.use('*', jsonResponseHandler())
app.use('*', except(['/-/ping', '/-/docs'], mountDatabase as any))
app.use('*', sessionMonitor)

// ---------------------------------------------------------
// Home
// (Single Page Application or API Docs)
// ---------------------------------------------------------

app.get('/', async c => {
  // If a web UI origin is configured, bounce humans there — that's
  // the intended landing surface. `WEB_URL` is a comma-separated list
  // of trusted origins; the first entry is treated as canonical.
  const webOrigin = c.env.WEB_URL?.split(',')[0]?.trim()
  if (webOrigin) {
    return c.redirect(webOrigin, 302)
  }
  // No web UI deployed: fall back to the in-worker API docs.
  if (c.env.API_DOCS_ENABLED) {
    return c.redirect('/-/docs', 302)
  }
  return c.text('vlt serverless registry is alive.\n')
})

// ---------------------------------------------------------
// Documentation
// ---------------------------------------------------------

// Mount API documentation routes
app.doc('/-/api', OPEN_API_CONFIG)
app.get('/-/docs', getDocs)

// ---------------------------------------------------------
// Health Check
// ---------------------------------------------------------

// Pattern: /-/ping
app.openapi(pingRoute, handlePing as any)

// ---------------------------------------------------------
// Better Auth (web login, OAuth, 2FA)
// Mounted at /-/auth/* — must come BEFORE the bearer-token
// gate because session is established via cookies, not tokens.
// ---------------------------------------------------------

app.on(
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  '/-/auth/*',
  betterAuthHandler,
)

// Attach session (if any) for downstream routes.
app.use('*', sessionContext)

// ---------------------------------------------------------
// Authorization Verification Middleware
// ---------------------------------------------------------

// Custom auth middleware that checks if token is required
app.use('*', async (c, next) => {
  if (requiresToken(c as any)) {
    // Token is required, apply bearer auth
    return bearerAuth({ verifyToken: verifyToken as any })(
      c as any,
      next,
    )
  } else {
    // Token not required, skip auth
    await next()
  }
})

// ---------------------------------------------------------
// User Routes
// ---------------------------------------------------------

// Pattern: /-/whoami
app.openapi(whoamiRoute, getUsername as any)
// Pattern: /-/user
app.openapi(userProfileRoute, getUserProfile as any)

// Pattern: /dashboard.json
app.openapi(dashboardDataRoute, handleDashboardData as any)

// Pattern: /app-data.json
app.openapi(appDataRoute, handleAppData as any)

// ---------------------------------------------------------
// Token Routes
// ---------------------------------------------------------

// Pattern: /-/tokens
app.openapi(getTokensRoute, getToken as any)
// Pattern: /-/tokens
app.openapi(createTokenRoute, postToken as any)
// Pattern: /-/tokens
app.openapi(updateTokenRoute, putToken as any)
// Pattern: /-/tokens/{token}
app.openapi(deleteTokenRoute, deleteToken as any)

// ---------------------------------------------------------
// Dist-tag Routes
// ---------------------------------------------------------

// Pattern: /-/package/{pkg}/dist-tags
app.openapi(getPackageDistTagsRoute, getPackageDistTags as any)
// Pattern: /-/package/{pkg}/dist-tags/{tag}
app.openapi(putPackageDistTagRoute, putPackageDistTag as any)
// Pattern: /-/package/{pkg}/dist-tags/{tag}
app.openapi(deletePackageDistTagRoute, deletePackageDistTag as any)

// Pattern: /-/package/{pkg}/readme (unscoped)
app.openapi(getPackageReadmeRoute, getPackageReadmeHandler as any)
// Pattern: /-/package/{scope}/{pkg}/readme (scoped)
app.openapi(
  getScopedPackageReadmeRoute,
  getPackageReadmeHandler as any,
)

// ---------------------------------------------------------
// Access Control Routes
// ---------------------------------------------------------

// Pattern: /-/package/{pkg}/access (unscoped packages)
app.openapi(getPackageAccessRoute, getPackageAccessStatus as any)
app.openapi(setPackageAccessRoute, setPackageAccessStatus as any)

// Pattern: /-/package/{scope}%2f{pkg}/access (scoped packages)
app.openapi(
  getScopedPackageAccessRoute,
  getPackageAccessStatus as any,
)
app.openapi(
  setScopedPackageAccessRoute,
  setPackageAccessStatus as any,
)

// Pattern: /-/package/list
app.openapi(listPackagesAccessRoute, listPackagesAccess as any)

// Pattern: /-/package/{pkg}/collaborators/{username} (unscoped packages)
app.openapi(grantPackageAccessRoute, grantPackageAccess as any)
app.openapi(revokePackageAccessRoute, revokePackageAccess as any)

// Pattern: /-/package/{scope}%2f{pkg}/collaborators/{username} (scoped packages)
app.openapi(grantScopedPackageAccessRoute, grantPackageAccess as any)
app.openapi(
  revokeScopedPackageAccessRoute,
  revokePackageAccess as any,
)

// ---------------------------------------------------------
// Search Packages
// ---------------------------------------------------------

// Pattern: /-/search
app.openapi(searchPackagesRoute, searchPackages as any)

// Pattern: /-/search/sources — configured search scopes for UI
app.get('/-/search/sources', getSearchSourcesHandler as any)

// ---------------------------------------------------------
// Handle Audit Requests
// ---------------------------------------------------------

// Pattern: /-/npm/audit (security audit - not implemented)
app.openapi(auditRoute, handleSecurityAudit as any)

// ---------------------------------------------------------
// NPM Compatibility Routes (Legacy API Redirects)
// (maximizes backwards compatibility with npm clients)
// ---------------------------------------------------------

// Pattern: /-/v1/search → /-/search
app.openapi(searchRedirectRoute, (c: Context) => {
  const qs = new URL(c.req.url).search
  return c.redirect(`/-/search${qs}`, 308)
})

// Pattern: /-/npm/v1/user → /-/user
app.openapi(userRedirectRoute, (c: Context) =>
  c.redirect('/-/user', 308),
)

// Pattern: /-/npm/v1/tokens → /-/tokens (GET)
app.openapi(tokensRedirectRoute, (c: Context) =>
  c.redirect('/-/tokens', 308),
)

// Pattern: /-/npm/v1/tokens → /-/tokens (POST)
app.openapi(createTokenRedirectRoute, (c: Context) =>
  c.redirect('/-/tokens', 308),
)

// Pattern: /-/npm/v1/tokens → /-/tokens (PUT)
app.openapi(updateTokenRedirectRoute, (c: Context) =>
  c.redirect('/-/tokens', 308),
)

// Pattern: /-/npm/v1/tokens/token/{token} → /-/tokens/{token} (DELETE)
app.openapi(deleteTokenRedirectRoute, (c: Context) => {
  return c.redirect(`/-/tokens/${c.req.param('token')}`, 308)
})

// Pattern: /-/npm/v1/security/audits/quick → /-/npm/audit
app.openapi(auditQuickRoute, (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// Pattern: /-/npm/v1/security/advisories/bulk → /-/npm/audit
app.openapi(advisoriesBulkRoute, (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// ---------------------------------------------------------
// Upstream Utility Routes
// (Registry utility endpoints for upstream registries)
// (MUST come before upstream package routes to avoid conflicts)
// ---------------------------------------------------------

// Pattern: /{upstream}/-/ping (upstream registry ping)
app.get('/:upstream/-/ping', handlePing)

// Pattern: /{upstream}/-/docs (upstream registry docs)
app.get('/:upstream/-/docs', getDocs)

// Pattern: /{upstream}/-/whoami (upstream registry whoami)
app.get('/:upstream/-/whoami', getUsername)

// Pattern: /{upstream}/-/user (upstream registry user profile)
app.get('/:upstream/-/user', getUserProfile)

// Pattern: /{upstream}/-/tokens (upstream registry token management)
app.get('/:upstream/-/tokens', getToken)
app.post('/:upstream/-/tokens', postToken)
app.put('/:upstream/-/tokens', putToken)
app.delete('/:upstream/-/tokens/:token', deleteToken)

// Pattern: /{upstream}/-/search (upstream registry search)
app.get('/:upstream/-/search', searchPackages)

// Pattern: /{upstream}/-/npm/audit (upstream registry audit)
app.post('/:upstream/-/npm/audit', handleSecurityAudit)

// ---------------------------------------------------------
// Upstream Package Routes
// (must come before catch-all package routes)
// ---------------------------------------------------------

// Pattern: /{upstream}/@{scope}/{pkg}/-/{tarball} (scoped package tarball)
app.openapi(
  getUpstreamScopedPackageTarballRoute,
  handleUpstreamScopedTarball as any,
)
// Pattern: /{upstream}/@{scope}/{pkg}/{version} (scoped package version)
app.openapi(
  getUpstreamScopedPackageVersionRoute,
  handleUpstreamScopedVersion as any,
)
// Pattern: /{upstream}/{pkg}/-/{tarball} (unscoped package tarball)
app.openapi(
  getUpstreamPackageTarballRoute,
  handleUpstreamTarball as any,
)
// Pattern: /{upstream}/@{scope}%2f{pkg} (URL-encoded scoped package)
app.openapi(
  getUpstreamEncodedScopedPackageRoute,
  handleUpstreamEncodedScoped as any,
)
// Pattern: /{upstream}/{param2}/{param3} (unified handler for ambiguous 3-segment paths)
app.openapi(getUpstreamUnifiedRoute, handleUpstreamUnified as any)
// Pattern: /{upstream}/{pkg} (unscoped package manifest)
app.openapi(getUpstreamPackageRoute, handleUpstreamPackage as any)

// Pattern: /-/npm/v1/security/advisories/bulk → /-/npm/audit
app.openapi(advisoriesBulkRoute, async (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// ---------------------------------------------------------
// Local Package Routes
// (catch-all patterns, must come after upstream routes)
// ---------------------------------------------------------

// Pattern: /{pkg} (package publishing via PUT)
app.openapi(publishPackageRoute, handlePackagePublish as any)
// Pattern: /{pkg}/-/{tarball} (package tarball download)
app.openapi(getPackageTarballRoute, handlePackageTarball as any)
// Pattern: /{pkg}/{version} (specific package version)
app.openapi(getPackageVersionRoute, handlePackageVersion as any)
// Pattern: /{pkg} (package manifest/packument)
app.openapi(getPackageRoute, handleRootPackageRoute as any)

// ---------------------------------------------------------
// Handle Static Assets
// ---------------------------------------------------------

// Pattern: /public/* (static assets from public directory)
app.get('/public/*', handleStaticAssets)
// Pattern: /favicon.ico (browser favicon)
app.get('/favicon.ico', handleFavicon)
// Pattern: /robots.txt (web crawler instructions)
app.get('/robots.txt', handleRobots)
// Pattern: /manifest.json (PWA web app manifest)
app.get('/manifest.json', handleManifest)
// Pattern: /* (catch-all for any other static assets)
app.get('/*', handleStaticAssets)

export { app }

export default {
  fetch: app.fetch,
  queue,
}
