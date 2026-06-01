import {
  NPM_PROXY_REGISTRY_URL,
  REGISTRY_URL,
} from '@/lib/registry-url'

import type { PackageManagerId } from './install-commands'

export type RegistrySetupMode = 'local' | 'proxy'

type SetupInput = {
  mode: RegistrySetupMode
  packageManager: PackageManagerId
  /** Upstream name when mode is `proxy` (e.g. npm). */
  upstream?: string
}

function npmAuthKey(registryUrl: string): string {
  try {
    const u = new URL(registryUrl)
    const path = u.pathname.replace(/\/$/, '')
    return `//${u.host}${path}/`
  } catch {
    return '//localhost:1337/'
  }
}

function proxyRegistryUrl(upstream = 'npm'): string {
  const base = REGISTRY_URL.replace(/\/$/, '')
  return upstream === 'npm' ?
      NPM_PROXY_REGISTRY_URL
    : `${base}/${encodeURIComponent(upstream)}`
}

function registryUrl(mode: RegistrySetupMode, upstream?: string): string {
  return mode === 'proxy' ? proxyRegistryUrl(upstream) : REGISTRY_URL
}

export function getRegistrySetupIntro(mode: RegistrySetupMode, upstream?: string): string {
  if (mode === 'proxy') {
    const name = upstream ?? 'npm'
    return `Install public packages from ${name} through this registry's /${name} proxy. Packages are cached locally on first fetch.`
  }
  return 'Publish private packages to this registry and install them using the commands below. Authentication is required to publish.'
}

type SetupBlock = {
  title: string
  description?: string
  command: string
}

export function getRegistrySetupBlocks(input: SetupInput): SetupBlock[] {
  const { mode, packageManager, upstream = 'npm' } = input
  const url = registryUrl(mode, upstream)
  const authKey = npmAuthKey(url)
  const tokenPlaceholder = 'vsr_pat_YOUR_TOKEN'

  const blocks: SetupBlock[] = []

  if (mode === 'local') {
    blocks.push({
      title: 'Install a package',
      description: 'One-off install from this registry.',
      command: getLocalInstallExample(packageManager, url),
    })
    blocks.push({
      title: 'Publish a package',
      description: 'Requires a token with publish scope — create one after signing in.',
      command: getLocalPublishExample(packageManager, url),
    })
  } else {
    blocks.push({
      title: 'Install a package',
      description: `Packages resolve from public ${upstream} via ${url}.`,
      command: getProxyInstallExample(packageManager, url, upstream),
    })
  }

  blocks.push({
    title: 'Persistent configuration',
    description:
      mode === 'local' ?
        'Project or user-level config so you do not need --registry on every command.'
      : `Point your client at the /${upstream} proxy route.`,
    command: getPersistentConfig(
      packageManager,
      url,
      authKey,
      tokenPlaceholder,
      mode,
      upstream,
    ),
  })

  return blocks
}

function getLocalInstallExample(pm: PackageManagerId, url: string): string {
  switch (pm) {
    case 'npm':
      return `npm install lodash --registry=${url}`
    case 'pnpm':
      return `pnpm add lodash --registry=${url}`
    case 'yarn':
      return `yarn add lodash --registry ${url}`
    case 'bun':
      return `bun add lodash --registry ${url}`
    case 'deno':
      return `deno add npm:lodash --registry=${url}`
    case 'vlt':
      return `vlt install lodash --registry=local`
  }
}

function getLocalPublishExample(pm: PackageManagerId, url: string): string {
  switch (pm) {
    case 'npm':
      return `npm publish --registry=${url}`
    case 'pnpm':
      return `pnpm publish --registry=${url}`
    case 'yarn':
      return `yarn npm publish --registry ${url}`
    case 'bun':
      return `bun publish --registry ${url}`
    case 'deno':
      return `# deno publish uses JSR by default; use npm clients for this registry`
    case 'vlt':
      return `vlt publish --registry=local`
  }
}

function getProxyInstallExample(
  pm: PackageManagerId,
  url: string,
  upstream: string,
): string {
  switch (pm) {
    case 'npm':
      return `npm install react --registry=${url}`
    case 'pnpm':
      return `pnpm add react --registry=${url}`
    case 'yarn':
      return `yarn add react --registry ${url}`
    case 'bun':
      return `bun add react --registry ${url}`
    case 'deno':
      return `deno add npm:react --registry=${url}`
    case 'vlt':
      return `vlt install react --registry=${upstream}`
  }
}

function getPersistentConfig(
  pm: PackageManagerId,
  url: string,
  authKey: string,
  token: string,
  mode: RegistrySetupMode,
  upstream: string,
): string {
  if (pm === 'vlt') {
    if (mode === 'local') {
      return `{
  "registries": {
    "local": "${REGISTRY_URL}"
  }
}`
    }
    return `{
  "registries": {
    "${upstream}": "${url}"
  }
}`
  }

  if (pm === 'npm') {
    if (mode === 'local') {
      return `# .npmrc (project or ~/.npmrc)
registry=${url}
${authKey}:_authToken=${token}`
    }
    return `# .npmrc
registry=${url}`
  }

  if (pm === 'pnpm') {
    if (mode === 'local') {
      return `# .npmrc
registry=${url}
${authKey}:_authToken=${token}`
    }
    return `# .npmrc
registry=${url}`
  }

  if (pm === 'yarn') {
    if (mode === 'local') {
      return `# .yarnrc.yml
npmRegistryServer: "${url}"
npmAuthToken: "${token}"`
    }
    return `# .yarnrc.yml
npmRegistryServer: "${url}"`
  }

  if (pm === 'bun') {
    if (mode === 'local') {
      return `# bunfig.toml
[install]
registry = "${url}"

# ~/.npmrc also works for auth:
# ${authKey}:_authToken=${token}`
    }
    return `# bunfig.toml
[install]
registry = "${url}"`
  }

  if (pm === 'deno') {
    return `# deno.json
{
  "npmRegistry": "${url}"
}`
  }

  return url
}

export { REGISTRY_URL, proxyRegistryUrl }
