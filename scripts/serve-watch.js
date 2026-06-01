#!/usr/bin/env node
/**
 * Dev watch: start the registry immediately, rebuild on src changes,
 * and restart only the registry worker (leave :3000 / `vlr web:dev` alone).
 */
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const require = createRequire(import.meta.url)
const vsrBin = path.join(root, 'dist/bin/vsr.js')
const indexPath = path.join(root, 'dist/index.js')

function loadChokidar() {
  try {
    return require('chokidar')
  } catch {
    const cliRoot = path.dirname(require.resolve('chokidar-cli/package.json'))
    return require(require.resolve('chokidar', { paths: [cliRoot] }))
  }
}

function runNpmScript(script) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    })
    child.on('close', code =>
      code === 0 ?
        resolve()
      : reject(new Error(`npm run ${script} failed (${code})`)),
    )
    child.on('error', reject)
  })
}

async function ensureBuilt() {
  if (existsSync(indexPath)) return
  // eslint-disable-next-line no-console
  console.log('[serve:watch] No dist/ build — running initial build…')
  await runNpmScript('build:assets')
  await runNpmScript('build:worker')
  await runNpmScript('build:bin')
}

function killRegistry() {
  try {
    execFileSync('pkill', ['-f', 'wrangler.*dev'], { stdio: 'ignore' })
  } catch {
    /* none running */
  }
  try {
    execFileSync('pkill', ['-f', 'dist/bin/vsr.js'], { stdio: 'ignore' })
  } catch {
    /* none running */
  }
  try {
    const out = execFileSync('lsof', ['-ti', ':1337'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    for (const pid of out.trim().split('\n').filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGKILL')
      } catch {
        /* gone */
      }
    }
  } catch {
    /* port free */
  }
}

let vsrProcess = null
let reloading = false
let reloadPending = false

function startRegistry() {
  if (!existsSync(vsrBin)) {
    throw new Error('Missing dist/bin/vsr.js — run `vlr build` first')
  }

  vsrProcess = spawn(process.execPath, [vsrBin, '--debug', '--no-web'], {
    cwd: root,
    stdio: 'inherit',
    detached: true,
  })

  vsrProcess.on('exit', (code, signal) => {
    if (reloading) return
    if (signal === 'SIGTERM' || signal === 'SIGKILL') return
    // eslint-disable-next-line no-console
    console.error(`[serve:watch] registry exited (code=${code ?? signal})`)
    process.exit(code ?? 1)
  })
}

async function rebuildAndRestart() {
  if (reloading) {
    reloadPending = true
    return
  }
  reloading = true
  // eslint-disable-next-line no-console
  console.log('\n[serve:watch] Rebuilding registry…')

  try {
    if (vsrProcess?.pid) {
      try {
        process.kill(-vsrProcess.pid, 'SIGTERM')
      } catch {
        try {
          vsrProcess.kill('SIGTERM')
        } catch {
          /* already gone */
        }
      }
    }
    killRegistry()
    await new Promise(r => setTimeout(r, 400))

    await runNpmScript('build:worker')
    await runNpmScript('build:bin')
    startRegistry()
    // eslint-disable-next-line no-console
    console.log('[serve:watch] Registry restarted on http://localhost:1337')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[serve:watch] Rebuild failed:', err?.message ?? err)
  } finally {
    reloading = false
    if (reloadPending) {
      reloadPending = false
      void rebuildAndRestart()
    }
  }
}

function shutdown() {
  if (vsrProcess?.pid) {
    try {
      process.kill(-vsrProcess.pid, 'SIGTERM')
    } catch {
      try {
        vsrProcess.kill('SIGTERM')
      } catch {
        /* gone */
      }
    }
  }
  killRegistry()
}

async function main() {
  await ensureBuilt()
  killRegistry()
  startRegistry()
  // eslint-disable-next-line no-console
  console.log(
    '[serve:watch] Registry running on http://localhost:1337\n' +
      '[serve:watch] Run `vlr web:dev` in another terminal for the web UI (:3000)\n' +
      '[serve:watch] Watching src/, types.ts, config.ts…',
  )

  const chokidar = loadChokidar()
  let debounce

  const scheduleReload = () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => void rebuildAndRestart(), 800)
  }

  chokidar
    .watch(['src', 'types.ts', 'config.ts'], {
      cwd: root,
      ignoreInitial: true,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/migrations/meta/**',
      ],
    })
    .on('add', scheduleReload)
    .on('change', scheduleReload)
    .on('unlink', scheduleReload)

  process.on('SIGINT', () => {
    shutdown()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    shutdown()
    process.exit(0)
  })
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
