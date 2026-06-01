import {
  sqliteTable,
  text,
  integer,
} from 'drizzle-orm/sqlite-core'

// ---------------------------------------------------------
// Registry tables
// ---------------------------------------------------------

// Define the packages table
export const packages = sqliteTable('packages', {
  name: text('name').primaryKey(),
  tags: text('tags').$type<string>(), // JSON stored as string
  lastUpdated: text('last_updated'), // Timestamp for when this package was last updated
  origin: text('origin').notNull().default('local'), // 'local' or 'upstream'
  upstream: text('upstream'), // Name of upstream registry (null for local packages)
  cachedAt: text('cached_at'), // When this package was cached from upstream
})

// Define the versions table
export const versions = sqliteTable('versions', {
  spec: text('spec').primaryKey(),
  manifest: text('manifest').$type<string>(), // JSON stored as string
  publishedAt: text('published_at'),
  origin: text('origin').notNull().default('local'), // 'local' or 'upstream'
  upstream: text('upstream'), // Name of upstream registry (null for local packages)
  cachedAt: text('cached_at'), // When this version was cached from upstream
})

/** npm per-version download snapshots (relative windows like `last-week`). */
export const versionDownloads = sqliteTable('version_downloads', {
  packageName: text('package_name').notNull(),
  version: text('version').notNull(),
  period: text('period').notNull().default('last-week'),
  downloads: integer('downloads').notNull(),
  fetchedAt: text('fetched_at').notNull(),
})

/** README markdown extracted from the latest tarball, cached per `<name>@<version>`. */
export const packageReadmes = sqliteTable('package_readmes', {
  spec: text('spec').primaryKey(),
  readme: text('readme').notNull(),
  filename: text('filename').notNull(),
  extractedAt: text('extracted_at').notNull(),
})

// ---------------------------------------------------------
// Better Auth tables
// ---------------------------------------------------------
// Column / table names follow Better Auth's default conventions
// so the drizzle adapter can resolve them with no extra mapping.
// See: https://better-auth.com/docs/concepts/database#core-schema
// ---------------------------------------------------------

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  // twoFactor plugin
  twoFactorEnabled: integer('twoFactorEnabled', { mode: 'boolean' }),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', {
    mode: 'timestamp',
  }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', {
    mode: 'timestamp',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
})

// twoFactor plugin table
export const twoFactor = sqliteTable('twoFactor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backupCodes').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

// ---------------------------------------------------------
// API Key plugin schema
// Field set matches @better-auth/api-key's `apiKeySchema`.
// See node_modules/@better-auth/api-key/dist/index.mjs (apiKeySchema).
// ---------------------------------------------------------

export const apikey = sqliteTable('apikey', {
  id: text('id').primaryKey(),
  configId: text('configId').notNull().default('default'),
  name: text('name'),
  start: text('start'),
  prefix: text('prefix'),
  key: text('key').notNull(),
  referenceId: text('referenceId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  refillInterval: integer('refillInterval'),
  refillAmount: integer('refillAmount'),
  lastRefillAt: integer('lastRefillAt', { mode: 'timestamp' }),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  rateLimitEnabled: integer('rateLimitEnabled', {
    mode: 'boolean',
  }).default(true),
  rateLimitTimeWindow: integer('rateLimitTimeWindow'),
  rateLimitMax: integer('rateLimitMax'),
  requestCount: integer('requestCount').default(0),
  remaining: integer('remaining'),
  lastRequest: integer('lastRequest', { mode: 'timestamp' }),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  permissions: text('permissions'),
  metadata: text('metadata'),
})

// Companion table for per-value scope targeting (e.g. specific
// packages or users). The plugin's `permissions` field only carries
// the verb set (e.g. { pkg: ['read','write'] }); this table records
// which values those verbs apply to.
export const tokenScopes = sqliteTable('token_scopes', {
  id: text('id').primaryKey(),
  apiKeyId: text('api_key_id')
    .notNull()
    .references(() => apikey.id, { onDelete: 'cascade' }),
  target: text('target', { enum: ['pkg', 'user'] }).notNull(),
  value: text('value').notNull(), // '*' | '@scope/pkg' | '~uuid'
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  write: integer('write', { mode: 'boolean' })
    .notNull()
    .default(false),
})
