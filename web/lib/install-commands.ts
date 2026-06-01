import {
  NPM_PROXY_REGISTRY_URL,
  REGISTRY_URL,
} from '@/lib/registry-url'

export type PackageManagerId =
  | 'vlt'
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'bun'
  | 'deno'

export type PackageSource = 'local' | 'npm'

export const PACKAGE_MANAGERS: { id: PackageManagerId; label: string }[] = [
  { id: 'vlt', label: 'vlt' },
  { id: 'npm', label: 'npm' },
  { id: 'pnpm', label: 'pnpm' },
  { id: 'yarn', label: 'yarn' },
  { id: 'bun', label: 'bun' },
  { id: 'deno', label: 'deno' },
]

type InstallCommandInput = {
  name: string
  source: PackageSource
  packageManager: PackageManagerId
  /** Optional explicit version to pin in the install command (e.g. `1.0.4`). */
  version?: string
}

function pkg(name: string): string {
  return /^[@a-zA-Z0-9._-]+$/.test(name) ? name : `"${name}"`
}

function registryUrl(source: PackageSource): string {
  return source === 'npm' ? NPM_PROXY_REGISTRY_URL : REGISTRY_URL
}

/** One-line install command for the selected client and package source. */
export function getInstallCommand({
  name,
  source,
  packageManager,
  version,
}: InstallCommandInput): string {
  const base = pkg(name)
  const spec = version ? `${base}@${version}` : base
  const registry = registryUrl(source)

  switch (packageManager) {
    case 'npm':
      return `npm install ${spec} --registry=${registry}`
    case 'pnpm':
      return `pnpm add ${spec} --registry=${registry}`
    case 'yarn':
      return `yarn add ${spec} --registry ${registry}`
    case 'bun':
      return `bun add ${spec} --registry ${registry}`
    case 'deno':
      return `deno add npm:${spec} --registry=${registry}`
    case 'vlt':
      // Matches named registries in vlt.json (`local`, `npm`).
      return source === 'npm' ?
          `vlt install ${spec} --registry=npm`
        : `vlt install ${spec} --registry=local`
  }
}

export function getInstallHint(
  source: PackageSource,
  upstream = 'npm',
): string {
  if (source === 'npm') {
    return `Fetched from public ${upstream} through this registry's /npm proxy. Configure vlt with "npm": "${NPM_PROXY_REGISTRY_URL}" in vlt.json.`
  }
  return `Published to this registry. Configure vlt with "local": "${REGISTRY_URL}" in vlt.json.`
}
