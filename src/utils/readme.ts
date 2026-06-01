/**
 * Resolve and cache the README markdown for a package.
 *
 * Strategy (per request):
 *   1. Resolve `latest` version from the local index, or from the configured
 *      upstream if the package isn't tracked locally.
 *   2. Check D1 (`package_readmes`) for `<name>@<version>` and short-circuit.
 *   3. Try the R2 bucket for the tarball. If absent, fetch it from upstream
 *      (mirroring the existing tarball proxy path) and write it back so the
 *      next read is local.
 *   4. Decompress, walk the tar entries, pick the best README candidate, and
 *      persist it to D1.
 */

import {
  buildUpstreamUrl,
  getDefaultUpstream,
  getUpstreamConfig,
} from './upstream.ts'
import {
  extractFilesFromTgz,
  isLikelyReadmePath,
  pickReadme,
} from './tarball.ts'
import type { HonoContext } from '../../types.ts'

export type ResolvedReadme = {
  name: string
  version: string
  readme: string
  filename: string
  cached: boolean
}

export type ResolveReadmeOptions = {
  /** Explicit upstream to use when the package isn't local (defaults to the configured default upstream). */
  upstream?: string
  /** Resolve the README for a specific version. When omitted, falls back to `latest`. */
  version?: string
}

export async function resolvePackageReadme(
  c: HonoContext,
  name: string,
  opts: ResolveReadmeOptions = {},
): Promise<ResolvedReadme | null> {
  const db = c.get('db')

  let version: string
  let upstream: string | null

  if (opts.version) {
    version = opts.version
    upstream = opts.upstream ?? null
  } else {
    const resolved = await resolveLatestVersion(c, name, opts.upstream)
    if (!resolved) return null
    version = resolved.version
    upstream = resolved.upstream
  }

  const spec = `${name}@${version}`

  const cached = await db.getPackageReadme(spec)
  if (cached) {
    return {
      name,
      version,
      readme: cached.readme,
      filename: cached.filename,
      cached: true,
    }
  }

  const tarball = await loadTarball(c, name, version, upstream)
  if (!tarball) return null

  const files = await extractFilesFromTgz(
    tarball,
    isLikelyReadmePath,
    { stopWhen: f => f.size >= 1 },
  )
  const picked = pickReadme(files)
  if (!picked) return null

  await db.upsertPackageReadme(
    spec,
    picked.text,
    picked.filename,
    new Date().toISOString(),
  )

  return {
    name,
    version,
    readme: picked.text,
    filename: picked.filename,
    cached: false,
  }
}

/**
 * Find the `latest` dist-tag for a package. Falls back to the configured
 * upstream when the package isn't indexed locally.
 */
async function resolveLatestVersion(
  c: HonoContext,
  name: string,
  preferredUpstream?: string,
): Promise<{ version: string; upstream: string | null } | null> {
  const db = c.get('db')

  if (!preferredUpstream) {
    const local = await db.getPackage(name).catch(() => null)
    const localLatest = local?.tags?.latest
    if (localLatest && local?.origin === 'local') {
      return { version: localLatest, upstream: null }
    }
  }

  const upstream = preferredUpstream ?? getDefaultUpstream(c)
  const upstreamConfig = getUpstreamConfig(upstream, c)
  if (!upstreamConfig) return null

  try {
    const res = await fetch(buildUpstreamUrl(upstreamConfig, name), {
      method: 'GET',
      headers: {
        'User-Agent': 'vlt-serverless-registry',
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      'dist-tags'?: Record<string, string>
    }
    const latest = data['dist-tags']?.latest
    if (!latest) return null
    return { version: latest, upstream }
  } catch {
    return null
  }
}

/**
 * Read the tarball ArrayBuffer for `<name>@<version>` from R2, fetching it
 * from upstream and persisting if necessary.
 */
async function loadTarball(
  c: HonoContext,
  name: string,
  version: string,
  upstream: string | null,
): Promise<ArrayBuffer | null> {
  const baseName = name.includes('/') ? name.split('/').pop() : name
  const tarballFile = `${baseName}-${version}.tgz`
  const key = `${name}/${tarballFile}`

  try {
    const existing = await c.env.BUCKET.get(key)
    if (existing) {
      return await existing.arrayBuffer()
    }
  } catch {
    // fall through to upstream fetch
  }

  if (!c.env.PROXY) return null

  const source =
    upstream ?
      (() => {
        const cfg = getUpstreamConfig(upstream, c)
        if (!cfg) return null
        return `${cfg.url.replace(/\/$/, '')}/${name}/-/${tarballFile}`
      })()
    : `${c.env.PROXY_URL.replace(/\/$/, '')}/${name}/-/${tarballFile}`

  if (!source) return null

  try {
    const res = await fetch(source, {
      headers: {
        Accept: 'application/octet-stream',
        'User-Agent': 'vlt-serverless-registry',
      },
    })
    if (!res.ok || !res.body) return null

    const buf = await res.arrayBuffer()

    c.executionCtx.waitUntil(
      (async () => {
        try {
          await c.env.BUCKET.put(key, buf, {
            httpMetadata: {
              contentType: 'application/octet-stream',
              cacheControl: 'public, max-age=31536000',
            },
          })
        } catch {
          // best-effort cache; ignore
        }
      })(),
    )

    return buf
  } catch {
    return null
  }
}
