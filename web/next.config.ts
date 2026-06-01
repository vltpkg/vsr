import type { NextConfig } from 'next'
import { join } from 'node:path'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

// Make the Cloudflare bindings available in `next dev` too. This is
// a no-op in `next build`.
initOpenNextCloudflareForDev()

// Where to reach the registry worker for server-side rewrites.
// Defaults to the local dev port; override with `VSR_ORIGIN` in
// `.env.local` (or via wrangler vars in prod).
const VSR_ORIGIN = process.env.VSR_ORIGIN ?? 'http://localhost:1337'

const nextConfig: NextConfig = {
  // Pin the workspace root for Turbopack to the monorepo root. vlt's
  // content-addressed store at `<repo>/node_modules/.vlt/` is what
  // `web/node_modules/next` symlinks into, and Turbopack's default
  // security boundary refuses to follow links above the project
  // directory. Setting `root` one level up makes that store
  // reachable while keeping the workspace boundary explicit.
  turbopack: {
    root: join(import.meta.dirname, '..'),
  },

  // Produce a self-contained Node server at `.next/standalone/web/server.js`
  // with every traced dependency copied in. The `vsr` CLI bin spawns this
  // server alongside the registry worker so `vlx -y @vltpkg/vsr` can ship
  // both processes from a single published package — no `next start`, no
  // workspace `node_modules`, no `vlt install` required at runtime.
  //
  // `outputFileTracingRoot` widens the trace beyond `web/` so files in
  // the monorepo's hoisted `node_modules` (vlt's `.vlt/` store and the
  // root `node_modules`) are followed and copied into the standalone
  // output. Without it Next.js logs warnings and may miss deps.
  output: 'standalone',
  outputFileTracingRoot: join(import.meta.dirname, '..'),

  // Same-origin proxy so the browser only ever talks to the web
  // origin. `/-/*` is the registry's reserved meta namespace
  // (auth, tokens, search, access, ping, docs, etc.) and packument
  // GETs for `/:name` and `/:name/:version` are intentionally left
  // unproxied — the npm CLI hits the registry worker directly on
  // its own port / route, and the UI uses explicit `/-/v1/search`
  // for browse.
  //
  // Benefits of this rewrite:
  //   • Better Auth cookies are first-party (no SameSite=None tax).
  //   • No credentialed CORS in the browser.
  //   • Single URL bar: `http://localhost:3000` covers everything.
  //
  // In production this becomes a Cloudflare Worker Route (or a
  // service binding) — see `web/README.md`.
  async rewrites() {
    return [
      {
        source: '/-/:path*',
        destination: `${VSR_ORIGIN}/-/:path*`,
      },
    ]
  },
}

export default nextConfig
