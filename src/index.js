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

import { API_DOCS } from './config.js'
import { verifyToken } from './utils/auth'
import { getUsername, getUserProfile } from './routes/users'
import { getToken, putToken, postToken, deleteToken } from './routes/tokens'

import {
  getPackageTarball,
  getPackagePackument,
  getPackageManifest,
  publishPackage,
} from './routes/packages'

// Hono instance
const app = new Hono()

// Add requestId
app.use('*', requestId())

// Add secure headers
app.use(secureHeaders())

// Pretty JSON
app.use(prettyJSON({ space: 2 }))

// -------------------------
// Docs
// -------------------------

// GET /-/ping
app.get('/-/ping', (c) => c.json({}, 200))

// GET scalar API reference
app.get('/-/docs', apiReference(API_DOCS))

// -------------------------
// Users / Authentication
// -------------------------

// Verify token
app.use('*', bearerAuth({ verifyToken }))

// GET a user profile
app.get('/-/whoami', getUsername)

// GET /-/npm/v1/user
app.get('/-/npm/v1/user', getUserProfile)

// -------------------------
// Tokens
// -------------------------

// GET a token profile (checked)
app.get('/-/npm/v1/tokens', getToken)

// POST a new token
app.post('/-/npm/v1/tokens', postToken)

// PUT an existing token
app.put('/-/npm/v1/tokens', putToken)

// DELETE a new token
app.delete('/-/npm/v1/tokens/token/:token', deleteToken)

// -------------------------
// Packages
// -------------------------

app.get('/:scope/:pkg/-/:tarball', getPackageTarball)
app.get('/:scope/:pkg/:version', getPackageManifest)
app.get('/:scope/:pkg', getPackagePackument)
app.put('/:scope/:pkg', publishPackage)
app.get('/:pkg', getPackagePackument)
app.put('/:pkg', publishPackage)

// -------------------------
// Fallbacks
// -------------------------

app.get('*', (c) => c.json({ error: 'Not found' }, 404))

export default app
