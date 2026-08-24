# VSR Contributing Docs

### Getting Started

#### Installing

- `vlt install`

#### Building

- `vlr build` - will build all parts of the project
- `vlr build:dist` - will build dist directories
- `vlr build:assets` - will build & move static assets
- `vlr build:bin` - will build the bin script
- `vlr build:worker` - will build the worker

#### Database Operations

- `vlr db:setup`
- `vlr db:drop`
- `vlr db:studio`
- `vlr db:generate`
- `vlr db:migrate`
- `vlr db:push`

#### Serving

- `vlr serve:build` - will build & start the services
- `vlr serve:death` - will kill any hanging `wrangler` processes
  (which can happen if you're developing with agents a lot)
- Post-build you can also run the bin directly:
  `node ./dist/bin/vsr.js`
- To make `vsr` available globally: `npm link`, then run `vsr` from anywhere

### Troubleshooting

#### `setRawMode EBADF` or `kqueue.c` assertion during `vlr build`

Next.js 16/Turbopack tries to set stdin to raw mode for progress display.
When running inside a non-TTY wrapper (e.g. varlock, CI, agent shells),
this fails with `EBADF` or a libuv kqueue assertion.

**Fix:** `TERM=dumb vlr build`

#### `ERR_PACKAGE_PATH_NOT_EXPORTED` for wrangler

The built binary resolves wrangler via `require.resolve()`, which fails if
wrangler's `package.json` exports map doesn't expose `./bin/wrangler.js`.

**Fix:** Ensure `src/bin/vsr.ts` resolves the bin path relative to the
wrangler package directory (`path.resolve(path.dirname(pkgPath), relBinPath)`)
rather than through `require.resolve()`.

#### `Better Auth: Base URL is not set`

This warning is non-fatal. The web UI process sets `BETTER_AUTH_URL` via
env vars; the registry worker derives it from the incoming request. Auth
callbacks work as long as the browser hits the web UI origin.

#### `vlr serve:death` — hanging processes

After crashes or force-kills, wrangler/workerd child processes can linger.
Run `vlr serve:death` to clean them up before restarting.
