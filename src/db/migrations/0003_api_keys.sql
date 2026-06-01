-- Migrate from the legacy `tokens` table to Better Auth's `apikey`
-- plugin + a companion `token_scopes` table for per-value targeting.

-- Hard cutover: the legacy table cannot be transparently migrated
-- because the api-key plugin stores hashed key values. Operators
-- must re-mint tokens with `vlr db:seed` (or via the /-/tokens API
-- once a user has signed in).

DROP TABLE IF EXISTS "tokens";

CREATE TABLE IF NOT EXISTS "apikey" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "configId" TEXT NOT NULL DEFAULT 'default',
  "name" TEXT,
  "start" TEXT,
  "prefix" TEXT,
  "key" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "refillInterval" INTEGER,
  "refillAmount" INTEGER,
  "lastRefillAt" INTEGER,
  "enabled" INTEGER DEFAULT 1,
  "rateLimitEnabled" INTEGER DEFAULT 1,
  "rateLimitTimeWindow" INTEGER,
  "rateLimitMax" INTEGER,
  "requestCount" INTEGER DEFAULT 0,
  "remaining" INTEGER,
  "lastRequest" INTEGER,
  "expiresAt" INTEGER,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  "permissions" TEXT,
  "metadata" TEXT
);

CREATE INDEX IF NOT EXISTS "apikey_reference_id_idx"
  ON "apikey" ("referenceId");

CREATE INDEX IF NOT EXISTS "apikey_config_id_idx"
  ON "apikey" ("configId");

CREATE INDEX IF NOT EXISTS "apikey_key_idx"
  ON "apikey" ("key");

CREATE TABLE IF NOT EXISTS "token_scopes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "api_key_id" TEXT NOT NULL REFERENCES "apikey"("id") ON DELETE CASCADE,
  "target" TEXT NOT NULL CHECK ("target" IN ('pkg', 'user')),
  "value" TEXT NOT NULL,
  "read" INTEGER NOT NULL DEFAULT 0,
  "write" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "token_scopes_api_key_id_idx"
  ON "token_scopes" ("api_key_id");
