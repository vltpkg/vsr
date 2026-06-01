-- Per-version download snapshots from npm's relative window API
-- (e.g. GET https://api.npmjs.org/versions/{package}/last-week).
-- One row per (package, version, period); refreshed on a TTL in the worker.

CREATE TABLE IF NOT EXISTS "version_downloads" (
  "package_name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "period" TEXT NOT NULL DEFAULT 'last-week',
  "downloads" INTEGER NOT NULL,
  "fetched_at" TEXT NOT NULL,
  PRIMARY KEY ("package_name", "version", "period")
);

CREATE INDEX IF NOT EXISTS "version_downloads_package_period_idx"
  ON "version_downloads" ("package_name", "period");

CREATE INDEX IF NOT EXISTS "version_downloads_fetched_at_idx"
  ON "version_downloads" ("fetched_at");
