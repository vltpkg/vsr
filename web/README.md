# @vltpkg/vsr-web

Web UI for the **vlt serverless registry**. Public package browsing
plus an authenticated dashboard for token + collaborator management,
deployed as its own Cloudflare Worker via
[OpenNext](https://opennext.js.org/cloudflare).

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC) |
| Runtime | Cloudflare Workers via `@opennextjs/cloudflare` |
| UI primitives | [shadcn/ui](https://ui.shadcn.com) + Tailwind v4 |
| Auth | `better-auth` React client (cookie sessions) |
| Forms | `react-hook-form` + `zod` |

## Local development

```bash
# from the repo root (vlt workspace install handles both apps)
vlt install

# in one terminal — start the registry
vlr serve:watch              # :1337

# in another — start the web app
vlr web:dev                  # :3000  ← open this one
```

You only ever need to open `http://localhost:3000`. The web app
serves the UI from its own routes and Next.js rewrites every
`/-/*` request through to the registry worker on `:1337`:

```
browser ─► :3000/packages              (Next.js page)
browser ─► :3000/-/auth/sign-in/email  ─► :1337/-/auth/sign-in/email
browser ─► :3000/-/tokens              ─► :1337/-/tokens
browser ─► :3000/-/v1/search?text=foo  ─► :1337/-/v1/search?text=foo
```

Because the rewrite is server-side in Next, the browser sees a
single origin — Better Auth cookies are first-party and there is
no credentialed CORS in the hot path. Packument GETs (`/{name}`)
are fetched **server-side** from RSCs using `VSR_ORIGIN`, so they
never hit the browser.

The npm CLI continues to talk to the registry directly on `:1337`
(it doesn't know or care about the web origin).

### Env vars

| Var | Where | Purpose |
|---|---|---|
| `VSR_ORIGIN` | `web/.env.local` | Server-side proxy / RSC target. Defaults to `http://localhost:1337`. |
| `NEXT_PUBLIC_VSR_URL` | `web/.env.local` | Only set if the **browser** needs to call a cross-origin registry. Otherwise leave unset for same-origin via rewrites. |
| `BETTER_AUTH_URL` | `.dev.vars` (registry) | Must be the origin the browser uses — `http://localhost:3000` in dev. |
| `WEB_URL` | `.dev.vars` (registry) | Comma-separated additional trusted origins for CORS / Better Auth. |

## Production routing

The same one-origin model carries over to Cloudflare. Two options:

1. **Worker Routes** (recommended) — point both workers at the same
   hostname and let Cloudflare dispatch by path:
   ```
   registry.example.com/-/*   → vsr      (this repo's main worker)
   registry.example.com/*     → vsr-web  (this Next.js worker)
   ```
   Set `VSR_ORIGIN` on the web worker to the internal registry URL
   (or use a [service binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
   for zero-hop, zero-network calls).

2. **Separate subdomains** — `registry.example.com` for the API,
   `app.example.com` for the UI. Then set `NEXT_PUBLIC_VSR_URL`
   so the browser calls the registry directly, and add the app
   origin to `WEB_URL` on the registry so CORS + Better Auth
   `trustedOrigins` accept it.

## Routes

| Path | Auth | Notes |
|---|---|---|
| `/` | public | Landing page |
| `/packages` | public | Searchable list (proxies `/-/v1/search`) |
| `/packages/[name]` | public | Packument view — versions + dist-tags |
| `/sign-in`, `/sign-up` | public | Better Auth email + password |
| `/dashboard` | required | Account overview |
| `/dashboard/tokens` | required | List / mint / revoke api-keys |
| `/dashboard/packages` | required | Collaborator management entry |
| `/dashboard/packages/[name]/collaborators` | required | Per-package grant/revoke |

Package names that include `/` (scoped packages) are URL-encoded in
the path segment (`@scope%2Fname`), matching the npm registry
convention and Hono's existing `:scope%2f:pkg` parameters.

## Deploy

```bash
vlr web:build            # next build (Turbopack)
vlr web:preview          # local workerd preview
vlr web:deploy           # opennextjs-cloudflare deploy
```

Edit `wrangler.jsonc` for env-specific bindings, secrets, and
domain routing.
