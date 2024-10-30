// TODO: check all SQL query strings for SQL injection vulnerabilities
// TODO: switch to using prepared statements/parameterized queries
// ex. c.env.DB.prepare("SELECT * FROM users WHERE user_id = ?1").bind(userId)
// ref. https://developers.cloudflare.com/d1/build-with-d1/d1-client-api/
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { bearerAuth } from 'hono/bearer-auth'
import { prettyJSON } from 'hono/pretty-json'
import { apiReference } from '@scalar/hono-api-reference'
import { secureHeaders } from 'hono/secure-headers'
import { trimTrailingSlash } from 'hono/trailing-slash'

import { PROXIES, API_DOCS } from '../config.js'
import { verifyToken } from './utils/auth'
import { getUsername, getUserProfile } from './routes/users'
import { getToken, putToken, postToken, deleteToken } from './routes/tokens'
import { packageSpec } from './utils/packages'

import {
  getPackageTarball,
  getPackagePackument,
  getPackageManifest,
  publishPackage,
} from './routes/packages'

// Hono instance
const app = new Hono({ strict: true })

// Trim trailing slash requests
app.use(trimTrailingSlash())

// Add requestId
app.use('*', requestId())

// Add secure headers
app.use(secureHeaders())

// Pretty JSON
app.use(prettyJSON({ space: 2 }))

// -------------------------
// Proxied Requests
// -------------------------

async function proxyRoute (c) {
  let { ref, version } = packageSpec(c)
  const ret = await fetch(`${PROXIES[ref]}${ref}/${version}`)
  const json = await ret.json()
  return c.json(json, 200)
}

if (PROXIES) {
  for (const proxy of PROXIES) {
    app.get(proxy, proxyRoute)
    app.get(`${proxy}/`, proxyRoute)
  }
}

// -------------------------
// Documentation
// -------------------------

// GET scalar API reference
app.get('/', apiReference(API_DOCS))
app.get('/-/docs', apiReference(API_DOCS))
app.get('/-/docs/', apiReference(API_DOCS))

// GET /-/ping
app.get('/-/ping', (c) => c.json({}, 200))
app.get('/-/ping/', (c) => c.json({}, 200))

// -------------------------
// Authorization
// -------------------------

// Verify token
app.use('*', bearerAuth({ verifyToken }))

// -------------------------
// Users / Authentication
// -------------------------

// GET a user profile
app.get('/-/whoami', getUsername)
app.get('/-/whoami/', getUsername)

// GET /-/npm/v1/user
app.get('/-/npm/v1/user', getUserProfile)
app.get('/-/npm/v1/user/', getUserProfile)

// -------------------------
// Tokens
// -------------------------

// GET a token profile (checked)
app.get('/-/npm/v1/tokens', getToken)
app.get('/-/npm/v1/tokens/', getToken)

// POST a new token
app.post('/-/npm/v1/tokens', postToken)
app.post('/-/npm/v1/tokens/', postToken)


// PUT an existing token
app.put('/-/npm/v1/tokens', putToken)
app.put('/-/npm/v1/tokens/', putToken)

// DELETE a new token
app.delete('/-/npm/v1/tokens/token/:token', deleteToken)
app.delete('/-/npm/v1/tokens/token/:token/', deleteToken)

// -------------------------
// Packages
// -------------------------

app.get('/:scope/:pkg/-/:tarball', getPackageTarball)
app.get('/:scope/:pkg/-/:tarball/', getPackageTarball)

app.get('/:scope/:pkg/:version', getPackageManifest)
app.get('/:scope/:pkg/:version/', getPackageManifest)

app.get('/:scope/:pkg', getPackagePackument)
app.get('/:scope/:pkg/', getPackagePackument)

app.put('/:scope/:pkg', publishPackage)
app.put('/:scope/:pkg/', publishPackage)

app.get('/:pkg', getPackagePackument)
app.get('/:pkg/', getPackagePackument)

app.put('/:pkg', publishPackage)
app.put('/:pkg/', publishPackage)

// -------------------------
// Fallbacks
// -------------------------

app.get('*', (c) => c.json({ error: 'Not found' }, 404))

export default app
