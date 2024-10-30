CREATE TABLE IF NOT EXISTS packages ('name' TEXT PRIMARY KEY, tags JSON);
CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, uuid TEXT, scope JSON);
CREATE TABLE IF NOT EXISTS versions (spex TEXT PRIMARY KEY, manifest JSON, published_at TIMESTAMP);
INSERT OR REPLACE INTO tokens (token, uuid, scope) VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'admin', '[ { "values": ["*"], "types": { "pkg": { "read": true, "write": true } } }, { "values": ["*"], "types": { "user": { "read": true, "write": true } } } ]');
