#!/usr/bin/env node
/**
 * Bake the Next.js web app into `dist/web-standalone/` so the
 * published package can serve the UI without `vlt install` /
 * `npm install` at runtime.
 *
 * Layout after this script runs:
 *
 *   dist/web-standalone/
 *     web/
 *       server.js                   <- spawn target
 *       package.json
 *       .next/
 *         static/                   <- copied in from web/.next/static
 *         (server build output)
 *       node_modules/               <- workspace-local traced deps
 *     node_modules/                 <- hoisted traced deps
 *
 * Runtime entry: `node dist/web-standalone/web/server.js`
 */

import { cp, rm, mkdir, access } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const WEB_DIR = join(REPO_ROOT, 'web')
const STANDALONE_SRC = join(WEB_DIR, '.next', 'standalone')
const STATIC_SRC = join(WEB_DIR, '.next', 'static')
const PUBLIC_SRC = join(WEB_DIR, 'public')
const CONTENT_SRC = join(WEB_DIR, 'content')
const DIST_DIR = join(REPO_ROOT, 'dist', 'web-standalone')

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...opts,
    })
    child.on('close', code => {
      code === 0 ? resolve()
      : reject(new Error(`${cmd} exited ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  console.log('Building web (next build, standalone) …')
  await run('vlt', ['run', '-w', 'web', 'build'], { cwd: REPO_ROOT })

  if (!(await exists(STANDALONE_SRC))) {
    throw new Error(
      `Expected ${STANDALONE_SRC} after build. ` +
        "Is `output: 'standalone'` set in web/next.config.ts?",
    )
  }

  console.log('Copying standalone output → dist/web-standalone …')
  await rm(DIST_DIR, { recursive: true, force: true })
  await mkdir(DIST_DIR, { recursive: true })
  await cp(STANDALONE_SRC, DIST_DIR, { recursive: true })

  // Next.js intentionally does NOT copy `.next/static` or `public`
  // into the standalone folder — the deploy step has to.
  const staticDest = join(DIST_DIR, 'web', '.next', 'static')
  console.log('Copying .next/static …')
  await mkdir(dirname(staticDest), { recursive: true })
  await cp(STATIC_SRC, staticDest, { recursive: true })

  if (await exists(PUBLIC_SRC)) {
    const publicDest = join(DIST_DIR, 'web', 'public')
    console.log('Copying public/ …')
    await cp(PUBLIC_SRC, publicDest, { recursive: true })
  }

  if (await exists(CONTENT_SRC)) {
    const contentDest = join(DIST_DIR, 'web', 'content')
    console.log('Copying content/ …')
    await cp(CONTENT_SRC, contentDest, { recursive: true })
  }

  console.log('Web build baked into dist/web-standalone')
}

main().catch(err => {
  console.error('build:web failed:')
  console.error(err)
  process.exit(1)
})
