import { execSync } from 'node:child_process';

const action = process.argv[2];

const LOCAL_DB_ARGS = 'vsr_local_database --local --persist-to local-store';

function runLocalDbCommand(queries) {
  execSync(`dwrangler d1 execute ${LOCAL_DB_ARGS} --command "${queries.join(' ').replaceAll('"', '\\\"')}"`);
}

if (action === 'init') {
  const DEFAULT_PERMS = [
    {
      "values": ["*"],
      "types": {
        "pkg": { "read": true, "write": true }
      }
    },
    {
      "values": ["*"],
      "types": {
        "user": { "read": true, "write": true }
      }
    }
  ];

  runLocalDbCommand([
    "CREATE TABLE IF NOT EXISTS packages ('name' TEXT PRIMARY KEY, tags JSON);",
    "CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, uuid TEXT, scope JSON);",
    "CREATE TABLE IF NOT EXISTS versions (spec TEXT PRIMARY KEY, manifest JSON, published_at TEXT);",
    `INSERT OR REPLACE INTO tokens (token, uuid, scope) VALUES ('${process.env.BEARER_TOKEN}', 'admin', '${JSON.stringify(DEFAULT_PERMS)}');`,
  ]);

} else if (action === 'drop') {
  runLocalDbCommand([
    "DROP TABLE IF EXISTS packages;",
    "DROP TABLE IF EXISTS tokens;",
    "DROP TABLE IF EXISTS versions;",
  ]);
  execSync('rm -rf local-store && rm -rf .wrangler');

} else if (action === 'migrate') {
  execSync(`dwrangler d1 migrations apply ${LOCAL_DB_ARGS}`);
}
