import { DOMAIN } from '../config.js'
import { Buffer } from 'node:buffer'
import { extract } from 'streaming-tarball'
import semver from 'semver'

export async function extractPackageJSON (buffer) {
  const blob = new Blob([Buffer.from(buffer)])
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  for await (const obj of extract(stream)) {
    if (obj.header.name === 'package/package.json') {
      return JSON.parse(await obj.text())
    }
  }
  return {}
}

export function packageSpec (c) {
  let { scope, pkg, version } = c.req.param()
  const parsedByRoute = !scope
  if (parsedByRoute) {
    const parts = c.req.path.split('/')
    scope = parts[1]
    pkg = parts[2]
    version = parts[3]
  }
  const parsed = decodeURIComponent(scope)
  if (parsed.includes('/')) {
    const parts = parsed.split('/')
    scope = parts[0]
    pkg = parts[1]
  }
  const isScoped = scope && scope.startsWith('@')
  version = (isScoped) ? version : pkg
  version = version && semver.valid(version) ? version : 'latest'
  const ref = (isScoped) ? pkg : scope
  pkg = (isScoped) ? `${scope}/${ref}` : ref
  scope = (isScoped) ? scope : null
  return {
    isScoped,
    pkg,
    scope,
    ref,
    version
  }
}

export function createFile ({ ref, pkg, version }) {
  return `${pkg}/-/${ref}-${version}.tgz`
}

// ex. unscoped https://registry.npmjs.org/axios/-/axios-1.0.0.tgz
// ex. scoped https://registry.npmjs.org/@graphql-mesh/cli/-/cli-0.94.1.tgz
export function createVersion ({ ref, pkg, version, manifest }) {
  const keep = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
    'bundleDependencies',
    'bin'
  ]
  Object.keys(manifest).filter(key => !keep.includes(key)).forEach(key => delete manifest[key])
  const file = createFile({ ref, pkg, version })
  const temp = {
    name: pkg,
    version,
    dist: {
      tarball: `${DOMAIN}/${file}`
    }
  }
  return { ...manifest, ...temp }
}
