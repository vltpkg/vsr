-- Cached README markdown extracted from the latest tarball for each package.
-- Keyed by `<name>@<version>`; populated lazily on first overview request.

CREATE TABLE IF NOT EXISTS "package_readmes" (
  "spec" TEXT PRIMARY KEY,
  "readme" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "extracted_at" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "package_readmes_extracted_at_idx"
  ON "package_readmes" ("extracted_at");
