#!/usr/bin/env NODE_OPTIONS=--no-warnings node
import type { Args } from '../../types.ts'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { minArgs } from 'minargs'
import { load } from '@vltpkg/vlt-json'
import { createRequire } from 'node:module'

const defaults: Args = {
  telemetry: true,
  debug: false,
  help: false,
  port: 1337,
  host: 'localhost',
  config: undefined,
  env: undefined,
  'db-name': undefined,
  'bucket-name': undefined,
  'queue-name': undefined,
  'dry-run': false,
  'web-port': 3000,
  'no-web': false,
}
const usage = `USAGE:

  $ vsr [<command>] [<options>]
  
COMMANDS:

  dev                        Start registry + web UI (default)
  deploy                     Deploy registry to Cloudflare Workers
  
OPTIONS:                   DESCRIPTION:

--telemetry=<boolean>      Run with telemetry reporting (default: true)
-p, --port=<number>        Registry port (default: ${defaults.port})
-w, --web-port=<number>    Web UI port (default: ${defaults['web-port']})
--no-web                   Skip the web UI; run the registry only
-H, --host=<string>        Bind address for dev server (default: localhost)
-c, --config=<path>        Load configuration from vlt.json file
-d, --debug                Run in debug mode
-h, --help                 Print usage information

DEPLOY OPTIONS:

--env=<string>             Environment to deploy to (dev, staging, prod)
--db-name=<string>         Override D1 database name
--bucket-name=<string>     Override R2 bucket name
--queue-name=<string>      Override queue name
--dry-run                  Show what would be deployed without deploying

EXAMPLES:

  $ vsr                               # Run dev server with all defaults
  $ vsr dev --port=3000 --debug       # Custom port with debug
  $ vsr deploy                        # Deploy to default environment
  $ vsr deploy --env=prod             # Deploy to production
  $ vsr deploy --dry-run              # Preview deployment
  $ vsr --config=/path/to/vlt.json    # Use specific config file
`

const opts = {
  alias: {
    p: 'port',
    w: 'web-port',
    H: 'host',
    c: 'config',
    d: 'debug',
    h: 'help',
  },
  boolean: ['debug', 'help', 'telemetry', 'dry-run', 'no-web'],
  string: [
    'port',
    'web-port',
    'host',
    'config',
    'env',
    'db-name',
    'bucket-name',
    'queue-name',
  ],
  default: defaults,
  positionalValues: true, // Allow space-separated values like -p 3000
}

//  parse args
const { args, positionals } = minArgs(opts)

// Extract command (default to 'dev' if not specified)
const command = positionals[0] || 'dev'

// Helper functions to extract values from minArgs array format
function getBooleanValue(
  arg: string[] | undefined,
  defaultValue: boolean,
): boolean {
  if (!arg || arg.length === 0) return defaultValue
  const value = arg[0]
  if (value === '' || value === undefined) return true // flag present without value
  return value !== 'false' && value !== '0'
}

function getStringValue(
  arg: string[] | undefined,
  defaultValue?: string,
): string | undefined {
  if (!arg || arg.length === 0) return defaultValue
  return arg[0] || defaultValue
}

function getNumberValue(
  arg: string[] | undefined,
  defaultValue: number,
): number {
  if (!arg || arg.length === 0) return defaultValue
  const value = arg[0]
  return Number(value) || defaultValue
}

// Type definition for VSR config in vlt.json
interface VsrConfig {
  registry?: {
    telemetry?: boolean
    debug?: boolean
    port?: number
    host?: string
    deploy?: {
      environments?: {
        [key: string]: DeployEnvironment
      }
      sentry?: {
        dsn?: string
        environment?: string
        sampleRate?: number
        tracesSampleRate?: number
      }
    }
  }
  telemetry?: boolean
  debug?: boolean
  port?: number
  host?: string
}

interface DeployEnvironment {
  databaseName?: string
  bucketName?: string
  queueName?: string
  vars?: Record<string, any>
  sentry?: {
    dsn?: string
    environment?: string
    sampleRate?: number
    tracesSampleRate?: number
  }
}

// Load configuration from vlt.json
function loadVltConfig(configPath?: string): VsrConfig {
  try {
    const isVsrConfig = (
      x: unknown,
      _file: string,
    ): asserts x is VsrConfig => {
      if (x === null || typeof x !== 'object') {
        throw new Error('Config must be an object')
      }
    }

    let configData: VsrConfig | undefined

    if (configPath) {
      // Custom config path specified
      if (!existsSync(configPath)) {
        // eslint-disable-next-line no-console
        console.warn(`Config file not found: ${configPath}`)
        return {}
      }

      // For custom paths, we need to read the file manually
      const configContent = readFileSync(configPath, 'utf8')
      try {
        configData = JSON.parse(configContent) as VsrConfig
      } catch (_err) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to parse config file ${configPath}`)
        return {}
      }
    } else {
      // Use vlt-json to find and load project config
      try {
        configData = load('config', isVsrConfig)
      } catch (_err) {
        configData = undefined
      }
    }

    return configData ?? {}
  } catch (_err) {
    // Can't access DEBUG here since it hasn't been defined yet
    return {}
  }
}

// Get the config path from CLI args
const configPath = getStringValue(args.config)

// Load config and merge with CLI args (CLI args take precedence)
const vltConfig = loadVltConfig(configPath)
const registryConfig = vltConfig.registry ?? {}

// Extract parsed args with config fallbacks, CLI args take precedence
const PORT = getNumberValue(
  args.port,
  registryConfig.port ?? vltConfig.port ?? defaults.port,
)
const HOST = getStringValue(
  args.host,
  registryConfig.host ?? vltConfig.host ?? defaults.host,
)
const TELEMETRY = getBooleanValue(
  args.telemetry,
  registryConfig.telemetry ??
    vltConfig.telemetry ??
    defaults.telemetry,
)
const DEBUG = getBooleanValue(
  args.debug,
  registryConfig.debug ?? vltConfig.debug ?? defaults.debug,
)
const WEB_PORT = getNumberValue(
  args['web-port'],
  (defaults['web-port'] as number) ?? 3000,
)
const NO_WEB = getBooleanValue(
  args['no-web'],
  (defaults['no-web'] as boolean) ?? false,
)

// Deploy-specific configuration
const ENV = getStringValue(args.env, 'dev')
const DRY_RUN = getBooleanValue(
  args['dry-run'],
  defaults['dry-run'] ?? false,
)
const DB_NAME_OVERRIDE = getStringValue(args['db-name'])
const BUCKET_NAME_OVERRIDE = getStringValue(args['bucket-name'])
const QUEUE_NAME_OVERRIDE = getStringValue(args['queue-name'])

// Print usage information
function printUsage(): void {
  // eslint-disable-next-line no-console
  console.log(usage)
}

// Deploy function
async function deployToCloudflare(): Promise<void> {
  const deployConfig = registryConfig.deploy
  const envConfig = deployConfig?.environments?.[ENV ?? 'dev'] ?? {}

  // Determine resource names with precedence: CLI args > env config > defaults
  const databaseName =
    DB_NAME_OVERRIDE ?? envConfig.databaseName ?? 'vsr-database'
  const bucketName =
    BUCKET_NAME_OVERRIDE ?? envConfig.bucketName ?? 'vsr-bucket'
  const queueName =
    QUEUE_NAME_OVERRIDE ??
    envConfig.queueName ??
    'cache-refresh-queue'

  // Build Sentry configuration
  const sentryConfig = envConfig.sentry ?? deployConfig?.sentry ?? {}
  const sentryDsn =
    sentryConfig.dsn ??
    'https://909b085eb764c00250ad312660c2fdf1@o4506397716054016.ingest.us.sentry.io/4509492612300800'
  const sentryEnv = sentryConfig.environment ?? ENV

  // Build wrangler deploy arguments
  const wranglerArgs = [
    'deploy',
    indexPath,
    '--config',
    wranglerConfigPath,
    '--name',
    `vsr-${ENV}`,
    '--compatibility-date',
    '2024-09-23',
    '--var',
    `SENTRY_DSN:${sentryDsn}`,
    '--var',
    `SENTRY_ENVIRONMENT:${sentryEnv}`,
    '--var',
    `ARG_DEBUG:${DEBUG}`,
    '--var',
    `ARG_TELEMETRY:${TELEMETRY}`,
  ]

  // Add D1 database binding
  wranglerArgs.push('--d1', `DB=${databaseName}`)

  // Add R2 bucket binding
  wranglerArgs.push('--r2', `BUCKET=${bucketName}`)

  // Add queue bindings
  wranglerArgs.push(
    '--queue-producer',
    `CACHE_REFRESH_QUEUE=${queueName}`,
  )
  wranglerArgs.push('--queue-consumer', queueName)

  // Add custom environment variables from config
  if (envConfig.vars) {
    for (const [key, value] of Object.entries(envConfig.vars)) {
      wranglerArgs.push('--var', `${key}:${value}`)
    }
  }

  if (DRY_RUN) {
    wranglerArgs.push('--dry-run')
    // eslint-disable-next-line no-console
    console.log(
      '🔍 Dry run - would execute:',
      wranglerBin,
      wranglerArgs.join(' '),
    )
    // eslint-disable-next-line no-console
    console.log('\n📋 Deployment configuration:')
    // eslint-disable-next-line no-console
    console.log(`  Environment: ${ENV}`)
    // eslint-disable-next-line no-console
    console.log(`  Database: ${databaseName}`)
    // eslint-disable-next-line no-console
    console.log(`  Bucket: ${bucketName}`)
    // eslint-disable-next-line no-console
    console.log(`  Queue: ${queueName}`)
    // eslint-disable-next-line no-console
    console.log(`  Sentry DSN: ${sentryDsn}`)
    // eslint-disable-next-line no-console
    console.log(`  Sentry Environment: ${sentryEnv}`)
    return
  }

  // eslint-disable-next-line no-console
  console.log(`🚀 Deploying VSR to ${ENV} environment...`)

  return new Promise((resolve, reject) => {
    const deployProcess = spawn(wranglerBin, wranglerArgs, {
      cwd: registryRoot,
      stdio: 'inherit',
    })

    deployProcess.on('close', code => {
      if (code === 0) {
        // eslint-disable-next-line no-console
        console.log(`✅ Successfully deployed VSR to ${ENV}`)
        resolve()
      } else {
        reject(new Error(`Deployment failed with exit code ${code}`))
      }
    })

    deployProcess.on('error', error => {
      reject(
        new Error(`Failed to start deployment: ${error.message}`),
      )
    })
  })
}

// Check if the help flag was passed
if (args.help) {
  printUsage()
  process.exit(0)
}

// Validate command
if (!['dev', 'deploy'].includes(command)) {
  // eslint-disable-next-line no-console
  console.error(`❌ Unknown command: ${command}`)
  printUsage()
  process.exit(1)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// Resolve paths relative to this script's location
const registryRoot = path.resolve(__dirname, '../../')
const indexPath = path.resolve(registryRoot, 'dist/index.js')
const wranglerConfigPath = path.resolve(registryRoot, 'wrangler.json')
const webServerEntry = path.resolve(
  registryRoot,
  'dist/web-standalone/web/server.js',
)

// Find the wrangler binary from node_modules
const wranglerPkgPath = require.resolve('wrangler/package.json')
const wranglerRelBinPath = (
  JSON.parse(readFileSync(wranglerPkgPath, 'utf8')) as {
    bin: { wrangler: string }
  }
).bin.wrangler
const wranglerBinPath = require.resolve(
  path.join('wrangler', wranglerRelBinPath),
)
const wranglerBin =
  existsSync(wranglerBinPath) ? wranglerBinPath : 'wrangler'

/**
 * Spawn the registry worker (wrangler dev) and the optional web UI
 * (Next.js standalone server). Both run as direct children of this
 * process; SIGINT / SIGTERM and any child crash bring the whole
 * group down together so `vlx -y @vltpkg/vsr` behaves like a single
 * service from the user's terminal.
 */
function runDev(): void {
  const children: import('node:child_process').ChildProcess[] = []
  let shuttingDown = false

  /**
   * Kill an entire process subtree, leaves first. `detached: true`
   * isn't enough on its own — wrangler reparents workerd into a new
   * process group, and the Next.js standalone entry forks
   * `next-server` into its own group too. A `process.kill(-pgid)`
   * therefore only reaches the immediate child, leaving the
   * grandchildren orphaned and the ports stuck.
   *
   * Walking the tree via `pgrep -P` and signalling depth-first
   * catches every descendant regardless of which group they joined.
   */
  const killTree = (
    pid: number | undefined,
    signal: NodeJS.Signals,
  ) => {
    if (!pid || pid <= 1) return
    let children: number[] = []
    try {
      const out = execFileSync('pgrep', ['-P', String(pid)], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      children = out
        .split('\n')
        .map(s => Number(s.trim()))
        .filter(n => Number.isFinite(n) && n > 1)
    } catch {
      // No children, or pgrep failed — fall through to killing self.
    }
    for (const child of children) killTree(child, signal)
    try {
      process.kill(pid, signal)
    } catch {
      /* already gone */
    }
  }

  const shutdown = (signal: NodeJS.Signals | 'exit', code = 0) => {
    if (shuttingDown) return
    shuttingDown = true
    const sig: NodeJS.Signals =
      signal === 'exit' ? 'SIGTERM' : signal
    for (const child of children) {
      if (child.exitCode === null) killTree(child.pid, sig)
    }
    // Grace period, then SIGKILL anything that's still up.
    setTimeout(() => {
      for (const child of children) {
        if (child.exitCode === null) killTree(child.pid, 'SIGKILL')
      }
      setTimeout(() => process.exit(code), 100).unref()
    }, 1500).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT', 0))
  process.on('SIGTERM', () => shutdown('SIGTERM', 0))

  // --- registry ---------------------------------------------------
  // eslint-disable-next-line no-console
  console.log(`VSR registry  : http://${HOST}:${PORT}`)
  const registry = spawn(
    wranglerBin,
    [
      'dev',
      indexPath,
      '--config',
      wranglerConfigPath,
      '--local',
      '--persist-to=local-store',
      '--no-remote',
      `--port=${PORT}`,
      `--ip=${HOST}`,
      `--var=ARG_HOST:${HOST}`,
      `--var=ARG_PORT:${PORT}`,
      `--var=ARG_DEBUG:${DEBUG}`,
      `--var=ARG_TELEMETRY:${TELEMETRY}`,
      // Hand the registry the web UI origin (when one's running) so
      // it can: (a) trust the origin for CORS + Better Auth, and (b)
      // redirect `/` to the human-facing UI instead of `/-/docs`.
      ...(NO_WEB
        ? []
        : [`--var=WEB_URL:http://${HOST}:${WEB_PORT}`]),
    ],
    {
      cwd: registryRoot,
      stdio: DEBUG ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      // Own process group so SIGTERM to `-pid` kills wrangler + workerd.
      detached: true,
    },
  )
  children.push(registry)
  if (!DEBUG) {
    // Forward only stderr by default so failure modes are visible
    // without drowning the user in wrangler's banner spam.
    registry.stderr?.on('data', (b: Buffer) => process.stderr.write(b))
  }
  registry.on('exit', code => {
    if (shuttingDown) return
    // eslint-disable-next-line no-console
    console.error(`registry exited (code=${code})`)
    shutdown('exit', code ?? 1)
  })

  // --- web UI -----------------------------------------------------
  if (NO_WEB) {
    // eslint-disable-next-line no-console
    console.log('VSR web UI    : disabled (--no-web)')
    return
  }

  if (!existsSync(webServerEntry)) {
    // eslint-disable-next-line no-console
    console.warn(
      `VSR web UI    : missing build (${webServerEntry}). ` +
        'Run `vlr build` or pass `--no-web` to silence this.',
    )
    return
  }

  // eslint-disable-next-line no-console
  console.log(`VSR web UI    : http://${HOST}:${WEB_PORT}`)
  const web = spawn(
    process.execPath,
    [webServerEntry],
    {
      cwd: path.dirname(webServerEntry),
      stdio: DEBUG ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Next.js standalone reads these.
        PORT: String(WEB_PORT),
        HOSTNAME: HOST,
        // Where the web app's RSC fetches + `/-/*` rewrites resolve.
        VSR_ORIGIN: `http://${HOST}:${PORT}`,
        // Better Auth wants the user-facing origin so cookies and
        // redirect URLs line up with the browser.
        BETTER_AUTH_URL:
          process.env.BETTER_AUTH_URL ?? `http://${HOST}:${WEB_PORT}`,
      },
      detached: true,
    },
  )
  children.push(web)
  if (!DEBUG) {
    web.stderr?.on('data', (b: Buffer) => process.stderr.write(b))
  }
  web.on('exit', code => {
    if (shuttingDown) return
    // eslint-disable-next-line no-console
    console.error(`web UI exited (code=${code})`)
    shutdown('exit', code ?? 1)
  })

  // eslint-disable-next-line no-console
  console.log(`\nOpen http://${HOST}:${WEB_PORT} in your browser.\n`)
}

void (async () => {
  try {
    if (command === 'deploy') {
      await deployToCloudflare()
      return
    }
    runDev()
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Failed to start:', error)
    process.exit(1)
  }
})()
