
# Getting started

> A modern, npm-compatible serverless registry that's fast, secure,
> and ridiculously easy to deploy.

`vsr` is a minimal yet powerful npm-compatible registry that
replicates core npm features while adding cutting-edge capabilities.
Built for the modern web, it runs seamlessly on Cloudflare's global
edge network.

## Quick start

Get up and running in seconds:

```bash
# Try it locally (one command, both servers)
vlx -y @vltpkg/vsr
# or: npx -y @vltpkg/vsr

# Or install globally
vlt install -g @vltpkg/vsr
vsr
```

**Boom!**

- **Web UI:** `http://localhost:3000` — open this one
- **Registry API:** `http://localhost:1337` — point `npm` / `vlt` here

The `vsr` binary boots two things in one process:

1. The **registry worker** (`wrangler dev`) on `:1337` — npm-compatible HTTP API.
2. The **web UI** (Next.js standalone server) on `:3000` — public package browsing, sign-in, dashboard, tokens, collaborator management.

### Common flags

```bash
vsr --port 4000 --web-port 4001   # custom ports
vsr --no-web                      # registry only
vsr --debug                       # stream both children's logs
vsr --help                        # full flag reference
```

Ctrl-C brings down both processes cleanly.

## Create an account

1. Open `http://localhost:3000` and click **Sign up**.
2. After sign-up you land on the dashboard.
3. Go to [Tokens](/dashboard/tokens) and mint a new API key. Copy the `vsr_pat_…` value — it is shown exactly once.

Or use the seed script against a running registry:

```bash
ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD='a-strong-password' \
  vlr db:seed
```

## Point your client at vsr

### npm / pnpm / yarn / bun

```ini
; .npmrc
registry=http://localhost:1337
//localhost:1337/:_authToken=vsr_pat_…
```

### vlt

In your project or user-level `vlt.json`:

```json
{
  "registries": {
    "npm": "http://localhost:1337/npm",
    "local": "http://localhost:1337"
  }
}
```

Append `/npm` to proxy requests to the public npm registry through vsr.

## Publish a package

```bash
npm publish --registry http://localhost:1337
```

## Next steps

- [Configuration](/docs/configuration) — CLI flags, `vlt.json`, and environment variables
- [Deployment](/docs/deploy) — ship to Cloudflare Workers
- [Tokens & scopes](/docs/tokens) — granular API key permissions
- [API reference](/docs/api) — live OpenAPI docs
