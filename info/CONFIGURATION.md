# Configuration

You can use `vsr` as a private local registry, a proxy registry, or
both. If you want to publish into or consume from the local registry
you can use `http://localhost:<port>`.

To proxy requests to `npm` you can just add `npm` to the pathname (ex.
`http://localhost:<port>/npm` will proxy all requests to `npmjs.org`)

## CLI Configuration

VSR supports both development and deployment commands with various
configuration options:

### Development Server (`vsr dev`)

```bash
# Start with defaults
vsr dev

# Custom configuration
vsr dev --port 3000 --debug --config ./vlt.json
```

### Deployment (`vsr deploy`)

```bash
# Deploy to default environment (dev)
vsr deploy

# Deploy to specific environment
vsr deploy --env=prod

# Override resource names
vsr deploy --env=staging --db-name=custom-db --bucket-name=custom-bucket

# Preview deployment
vsr deploy --dry-run --env=prod
```

## Configuration File (`vlt.json`)

VSR can be configured using a `vlt.json` file that supports both
development and deployment settings:

### Development Configuration

```json
{
  "registry": {
    "port": 4000,
    "debug": true,
    "telemetry": false
  }
}
```

### Deployment Configuration

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
        "staging": {
          "databaseName": "vsr-staging-database",
          "bucketName": "vsr-staging-bucket",
          "queueName": "vsr-staging-cache-refresh-queue",
          "sentry": {
            "environment": "staging"
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

See the [Deployment Guide](../DEPLOY.md) for complete deployment
configuration documentation.

## Package Manager Integration

##### For `vlt`:

In your project or user-level `vlt.json` file add the relevant
configuration.

```json
{
  "registries": {
    "npm": "http://localhost:1337/npm",
    "local": "http://localhost:1337"
  }
}
```

##### For `npm`, `pnpm`, `yarn` & `bun`:

To use `vsr` as your registry you must either pass a registry config
through a client-specific flag (ex. `--registry=...` for `npm`) or
define client-specific configuration which stores the reference to
your registry (ex. `.npmrc` for `npm`).

Access to the registry & packages is private by default. As of
rc.19, VSR uses [Better Auth](https://better-auth.com)'s API Key
plugin instead of the legacy `tokens` table — there is no longer a
pre-baked default admin token. Mint one with the seed script:

```bash
ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD='a-strong-password' \
  vlr db:seed
```

The script prints the generated `vsr_pat_…` key on stdout exactly
once. Put it in your client config:

```ini
; .npmrc
registry=http://localhost:1337
//localhost:1337/:_authToken=vsr_pat_…
```

#### Admin seed environment

| Variable          | Purpose                                                 |
|-------------------|---------------------------------------------------------|
| `ADMIN_EMAIL`     | Required. Email for the admin user.                     |
| `ADMIN_PASSWORD`  | Required. At least 8 characters; bcrypt-hashed by Better Auth. |
| `ADMIN_NAME`      | Optional. Display name (defaults to `admin`).           |
| `VSR_URL`         | Optional. Base URL of the running VSR (defaults to `http://localhost:1337`). |

The seed script is HTTP-only — it requires a running worker. Run it
once after `vlr db:setup` on each environment.
