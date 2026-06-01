
# Deployment

The VSR CLI includes a `deploy` subcommand that allows you to
deploy your VSR instance to Cloudflare Workers using configuration
from your `vlt.json` file.

## Usage

```bash
# Deploy to default environment (dev)
vsr deploy

# Deploy to specific environment
vsr deploy --env=prod

# Preview deployment without actually deploying
vsr deploy --dry-run

# Override specific resource names
vsr deploy --env=staging --db-name=my-custom-db --bucket-name=my-custom-bucket
```

## Configuration

Add a `deploy` section to your `vlt.json` file under the `registry`
key:

```json
{
  "registry": {
    "deploy": {
      "sentry": {
        "dsn": "https://your-default-sentry-dsn@sentry.io/project-id",
        "sampleRate": 1.0,
        "tracesSampleRate": 0.1
      },
      "environments": {
        "dev": {
          "databaseName": "vsr-dev-database",
          "bucketName": "vsr-dev-bucket",
          "queueName": "vsr-dev-cache-refresh-queue",
          "sentry": {
            "environment": "development"
          },
          "vars": {
            "CUSTOM_VAR": "dev-value"
          }
        },
        "prod": {
          "databaseName": "vsr-prod-database",
          "bucketName": "vsr-prod-bucket",
          "queueName": "vsr-prod-cache-refresh-queue",
          "sentry": {
            "environment": "production",
            "dsn": "https://your-prod-sentry-dsn@sentry.io/project-id",
            "sampleRate": 0.1,
            "tracesSampleRate": 0.01
          },
          "vars": {
            "API_BASE_URL": "https://api.example.com"
          }
        }
      }
    }
  }
}
```

See [Configuration](/docs/configuration) for the full `vlt.json`
schema including staging environments.

## Configuration options

### Global deploy settings

- `sentry.dsn` — Default Sentry DSN for error reporting
- `sentry.sampleRate` — Default error sample rate (0.0 to 1.0)
- `sentry.tracesSampleRate` — Default performance traces sample rate (0.0 to 1.0)

### Environment-specific settings

Each environment can override any global setting and specify:

- `databaseName` — D1 database name for this environment
- `bucketName` — R2 bucket name for this environment
- `queueName` — Queue name for cache refresh operations
- `sentry` — Environment-specific Sentry configuration
- `vars` — Custom environment variables to pass to the Worker

### CLI options

- `--env=<string>` — Environment to deploy to (defaults to `dev`)
- `--db-name=<string>` — Override D1 database name
- `--bucket-name=<string>` — Override R2 bucket name
- `--queue-name=<string>` — Override queue name
- `--dry-run` — Show what would be deployed without actually deploying

## Precedence

Configuration values are resolved in the following order (highest
precedence first):

1. CLI arguments (`--db-name`, `--bucket-name`, etc.)
2. Environment-specific config (`environments.prod.databaseName`)
3. Default values

## Examples

### Basic deployment

```bash
# Deploy to development environment
vsr deploy --env=dev

# Deploy to production
vsr deploy --env=prod
```

### Custom resource names

```bash
vsr deploy --env=staging --db-name=my-staging-db --bucket-name=my-staging-bucket
```

### Preview deployment

```bash
vsr deploy --env=prod --dry-run
```

### Using a custom config file

```bash
vsr deploy --config=/path/to/custom-vlt.json --env=prod
```

## Generated wrangler command

The deploy command generates a `wrangler deploy` command with the
appropriate bindings and variables. For example:

```bash
wrangler deploy dist/index.js \
  --name vsr-prod \
  --compatibility-date 2024-09-23 \
  --var SENTRY_DSN:https://your-sentry-dsn@sentry.io/project-id \
  --var SENTRY_ENVIRONMENT:production \
  --var ARG_TELEMETRY:true \
  --d1 DB=vsr-prod-database \
  --r2 BUCKET=vsr-prod-bucket \
  --queue-producer CACHE_REFRESH_QUEUE=vsr-prod-cache-refresh-queue \
  --queue-consumer vsr-prod-cache-refresh-queue
```

## Prerequisites

- Wrangler CLI must be installed and authenticated
- Cloudflare Workers account with appropriate permissions
- D1 databases, R2 buckets, and queues must exist (or be created by Wrangler)

## Web UI deployment

The registry worker and the web UI deploy as **sibling workers** on
Cloudflare. After deploying the registry:

```bash
vlr web:build
vlr web:deploy
```

Point both workers at the same hostname with Worker Routes:

```
registry.example.com/-/*   → vsr       (registry worker)
registry.example.com/*     → vsr-web   (Next.js worker)
```

Set `VSR_ORIGIN` on the web worker to the internal registry URL (or
use a service binding for zero-hop calls). Set `WEB_URL` on the
registry worker so `/` redirects to the web UI and CORS trusts the
app origin.

## First-run: minting the admin api-key

VSR no longer ships with a pre-seeded default admin token. After the
database has been migrated (`vlr db:setup:remote`) and the worker is
deployed, mint an admin key against the live URL:

```bash
ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD='a-strong-password' \
  VSR_URL=https://registry.example.com \
  vlr db:seed
```

The script prints the new `vsr_pat_…` key on stdout exactly once.
Copy it into your secret store — VSR only retains a SHA-256 hash and
cannot recover the original.

Re-running the script with the same email is safe: it will sign in
instead of erroring, then mint an additional api-key. Use
`DELETE /-/tokens/token/<keyId>` to retire obsolete keys.
