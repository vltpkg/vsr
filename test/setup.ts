// Cloudflare Workers test setup using @cloudflare/vitest-pool-workers
import { beforeEach, afterEach, afterAll } from 'vitest'
import { env } from 'cloudflare:test'

const TEST_ADMIN_TOKEN = 'test-admin-token-12345'
const TEST_ADMIN_USER_ID = 'admin-uuid'
const TEST_ADMIN_KEY_ID = 'admin-apikey-id'
const TEST_ADMIN_SCOPE_ID = 'admin-scope-id'

/**
 * SHA-256 + base64url (no padding) — matches the api-key plugin's
 * `defaultKeyHasher` so we can pre-compute the hash for our test
 * admin token without importing the plugin (which keeps the test
 * worker bundle slim and avoids cycling node:vm).
 */
async function hashApiKey(plaintext: string) {
  const bytes = new TextEncoder().encode(plaintext)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  // base64url (no padding)
  let bin = ''
  const view = new Uint8Array(digest)
  for (let i = 0; i < view.byteLength; i++)
    bin += String.fromCharCode(view[i])
  return btoa(bin)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

beforeEach(async () => {
  // Set environment variables that the app expects
  process.env.ARG_DEBUG = 'false'
  process.env.ARG_TELEMETRY = 'false'

  // With @cloudflare/vitest-pool-workers, real bindings are
  // automatically provided and isolated per test. Set up the schema
  // and seed an admin api-key whose plaintext is the well-known
  // test token (`test-admin-token-12345`).
  try {
    // Registry tables
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS packages (name TEXT PRIMARY KEY, tags TEXT, last_updated TEXT, origin TEXT NOT NULL DEFAULT 'local', upstream TEXT, cached_at TEXT)",
    )
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS versions (spec TEXT PRIMARY KEY, manifest TEXT, published_at TEXT, origin TEXT NOT NULL DEFAULT 'local', upstream TEXT, cached_at TEXT)",
    )

    // Better Auth core tables (minimum subset needed by api-key)
    await env.DB.exec(
      'CREATE TABLE IF NOT EXISTS user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, emailVerified INTEGER NOT NULL DEFAULT 0, image TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, twoFactorEnabled INTEGER)',
    )
    await env.DB.exec(
      'CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, expiresAt INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, ipAddress TEXT, userAgent TEXT, userId TEXT NOT NULL)',
    )
    await env.DB.exec(
      'CREATE TABLE IF NOT EXISTS account (id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL, userId TEXT NOT NULL, accessToken TEXT, refreshToken TEXT, idToken TEXT, accessTokenExpiresAt INTEGER, refreshTokenExpiresAt INTEGER, scope TEXT, password TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
    )
    await env.DB.exec(
      'CREATE TABLE IF NOT EXISTS verification (id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, expiresAt INTEGER NOT NULL, createdAt INTEGER, updatedAt INTEGER)',
    )

    // api-key plugin tables
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS apikey (id TEXT PRIMARY KEY, configId TEXT NOT NULL DEFAULT 'default', name TEXT, start TEXT, prefix TEXT, key TEXT NOT NULL, referenceId TEXT NOT NULL, refillInterval INTEGER, refillAmount INTEGER, lastRefillAt INTEGER, enabled INTEGER DEFAULT 1, rateLimitEnabled INTEGER DEFAULT 1, rateLimitTimeWindow INTEGER, rateLimitMax INTEGER, requestCount INTEGER DEFAULT 0, remaining INTEGER, lastRequest INTEGER, expiresAt INTEGER, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, permissions TEXT, metadata TEXT)",
    )
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS token_scopes (id TEXT PRIMARY KEY, api_key_id TEXT NOT NULL, target TEXT NOT NULL, value TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, write INTEGER NOT NULL DEFAULT 0)",
    )

    const now = Date.now()
    const hashed = await hashApiKey(TEST_ADMIN_TOKEN)

    // Seed admin user
    await env.DB.prepare(
      'INSERT OR REPLACE INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)',
    )
      .bind(
        TEST_ADMIN_USER_ID,
        'admin',
        'admin@test.local',
        now,
        now,
      )
      .run()

    // Seed admin api-key (plaintext = TEST_ADMIN_TOKEN, stored hashed)
    await env.DB.prepare(
      "INSERT OR REPLACE INTO apikey (id, configId, name, start, prefix, key, referenceId, enabled, rateLimitEnabled, requestCount, createdAt, updatedAt, permissions) VALUES (?, 'default', ?, ?, ?, ?, ?, 1, 0, 0, ?, ?, ?)",
    )
      .bind(
        TEST_ADMIN_KEY_ID,
        'test-admin',
        TEST_ADMIN_TOKEN.slice(0, 6),
        '',
        hashed,
        TEST_ADMIN_USER_ID,
        now,
        now,
        JSON.stringify({
          pkg: ['read', 'write'],
          user: ['read', 'write'],
        }),
      )
      .run()

    // Wildcard pkg+user scope so the test admin can hit every route
    await env.DB.prepare(
      "INSERT OR REPLACE INTO token_scopes (id, api_key_id, target, value, read, write) VALUES (?, ?, 'pkg', '*', 1, 1)",
    )
      .bind(TEST_ADMIN_SCOPE_ID + '-pkg', TEST_ADMIN_KEY_ID)
      .run()
    await env.DB.prepare(
      "INSERT OR REPLACE INTO token_scopes (id, api_key_id, target, value, read, write) VALUES (?, ?, 'user', '*', 1, 1)",
    )
      .bind(TEST_ADMIN_SCOPE_ID + '-user', TEST_ADMIN_KEY_ID)
      .run()
  } catch (error) {
    // Database might already be set up, that's okay
    console.log('Database setup skipped:', error)
  }
})

afterEach(async () => {
  // Clean up test data after each test
  // While Cloudflare Workers pool provides isolated storage per test,
  // explicit cleanup ensures no test data leaks between tests

  // Clean up database tables (ignore errors if tables don't exist)
  await env.DB.exec(
    'DELETE FROM packages WHERE name LIKE "test-%"',
  ).catch(() => {})
  await env.DB.exec(
    'DELETE FROM versions WHERE spec LIKE "test-%"',
  ).catch(() => {})
  // Drop everything except the seeded admin row so other tests can
  // still authenticate.
  await env.DB.exec(
    `DELETE FROM token_scopes WHERE api_key_id != '${TEST_ADMIN_KEY_ID}'`,
  ).catch(() => {})
  await env.DB.exec(
    `DELETE FROM apikey WHERE id != '${TEST_ADMIN_KEY_ID}'`,
  ).catch(() => {})

  // Clean up any test objects from R2 bucket
  const testObjects = await env.BUCKET.list({
    prefix: 'test-',
  }).catch(() => ({ objects: [] }))
  for (const obj of testObjects.objects || []) {
    await env.BUCKET.delete(obj.key).catch(() => {})
  }

  // Clean up any test keys from KV store
  if (env.KV) {
    const testKvKeys = await env.KV.list({ prefix: 'test-' }).catch(
      () => ({ keys: [] }),
    )
    for (const key of testKvKeys.keys || []) {
      await env.KV.delete(key.name).catch(() => {})
    }
  }

  console.log('✓ Test cleanup completed')
})

afterAll(async () => {
  // Global cleanup after all tests complete
  console.log('🧹 Running global test cleanup...')

  // Clean up all test data from database (ignore errors if tables don't exist)
  await env.DB.exec(
    'DELETE FROM packages WHERE name LIKE "test-%" OR name LIKE "%test%"',
  ).catch(() => {})
  await env.DB.exec(
    'DELETE FROM versions WHERE spec LIKE "test-%" OR spec LIKE "%test%"',
  ).catch(() => {})
  await env.DB.exec('DELETE FROM token_scopes').catch(() => {})
  await env.DB.exec('DELETE FROM apikey').catch(() => {})
  await env.DB.exec('DELETE FROM user').catch(() => {})

  // Clean up all test objects from R2 bucket
  const allTestObjects = await env.BUCKET.list({
    prefix: 'test-',
  }).catch(() => ({ objects: [] }))
  for (const obj of allTestObjects.objects || []) {
    await env.BUCKET.delete(obj.key).catch(() => {})
  }

  // Also clean up any objects that might have test in the name
  const moreTestObjects = await env.BUCKET.list().catch(() => ({
    objects: [],
  }))
  for (const obj of moreTestObjects.objects || []) {
    if (obj.key.includes('test')) {
      await env.BUCKET.delete(obj.key).catch(() => {})
    }
  }

  // Clean up all test keys from KV store
  if (env.KV) {
    const allTestKvKeys = await env.KV.list({
      prefix: 'test-',
    }).catch(() => ({ keys: [] }))
    for (const key of allTestKvKeys.keys || []) {
      await env.KV.delete(key.name).catch(() => {})
    }

    // Clean up any KV keys that might have test in the name
    const allKvKeys = await env.KV.list().catch(() => ({
      keys: [],
    }))
    for (const key of allKvKeys.keys || []) {
      if (key.name.includes('test')) {
        await env.KV.delete(key.name).catch(() => {})
      }
    }
  }

  console.log('✓ Global test cleanup completed successfully')
})
