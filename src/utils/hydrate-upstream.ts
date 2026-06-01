import * as semver from 'semver'

import type {
  DatabaseOperations,
  HonoContext,
  PackageManifest,
} from '../../types.ts'
import { getCachedPackageWithRefresh } from './cache.ts'
import { slimManifest } from './packages.ts'
import { refreshNpmVersionDownloadsIfStale } from './npm-downloads.ts'
import {
  buildUpstreamUrl,
  getUpstreamConfig,
} from './upstream.ts'

type UpstreamData = {
  'dist-tags'?: Record<string, string>
  versions?: Record<string, PackageManifest>
  time?: Record<string, string>
}

type PackageData = {
  name: string
  'dist-tags': Record<string, string>
  versions: Record<string, unknown>
  time: Record<string, string>
}

function getDb(c: HonoContext): DatabaseOperations {
  return c.get('db')
}

function defer(c: HonoContext, promise: Promise<unknown>) {
  const ctx = c.executionCtx as
    | { waitUntil?: (p: Promise<unknown>) => void }
    | undefined
  if (ctx?.waitUntil) {
    ctx.waitUntil(promise)
    return
  }
  if (c.waitUntil) {
    c.waitUntil(promise)
    return
  }
  void promise.catch(() => {})
}

/** Max upstream packuments to hydrate per search request. */
const HYDRATE_LIMIT = 20

/**
 * Fetch a packument from an upstream registry and persist it to D1 using
 * the same strategy as `GET /npm/:pkg` — essential versions synchronously,
 * the rest via `waitUntil`.
 */
export async function hydrateUpstreamPackage(
  c: HonoContext,
  packageName: string,
  upstream = 'npm',
): Promise<void> {
  const existing = await getDb(c).getPackage(packageName)
  if (existing) return

  const upstreamConfig = getUpstreamConfig(upstream, c)
  if (!upstreamConfig) return

  const fetchUpstreamFn = async (): Promise<PackageData> => {
    const upstreamUrl = buildUpstreamUrl(upstreamConfig, packageName)
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'vlt-registry/1.0.0',
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Package not found')
      }
      throw new Error(`Upstream error: ${response.status}`)
    }

    const upstreamData = (await response.json()) as UpstreamData

    const packageData: PackageData = {
      name: packageName,
      'dist-tags': upstreamData['dist-tags'] ?? {
        latest: Object.keys(upstreamData.versions ?? {}).pop() ?? '',
      },
      versions: {},
      time: {
        modified:
          upstreamData.time?.modified ?? new Date().toISOString(),
      },
    }

    if (upstreamData.time) {
      for (const [version, time] of Object.entries(upstreamData.time)) {
        if (version !== 'modified' && version !== 'created') {
          packageData.time[version] = time
        }
      }
    }

    if (upstreamData.versions) {
      const requestUrl = new globalThis.URL(c.req.url)
      const protocol = requestUrl.protocol.slice(0, -1)
      const host = c.req.header('host') ?? 'localhost:1337'
      const context = { protocol, host, upstream }

      const distTags = upstreamData['dist-tags'] ?? {}
      const latestVersion = distTags.latest
      const essentialVersions = new Set<string>()

      if (latestVersion) essentialVersions.add(latestVersion)

      const sortedVersions = Object.keys(upstreamData.versions)
        .sort((a, b) => semver.rcompare(a, b))
        .slice(0, 5)
      for (const v of sortedVersions) essentialVersions.add(v)

      for (const version of essentialVersions) {
        const manifest = upstreamData.versions[version]
        if (!manifest) continue
        const slimmed = slimManifest(manifest, context, c)
        if (slimmed) packageData.versions[version] = slimmed
      }

      defer(
        c,
        (async () => {
          try {
            const versionPromises: Promise<unknown>[] = []

            for (const [version, manifest] of Object.entries(
              upstreamData.versions ?? {},
            )) {
              const versionSpec = `${packageName}@${version}`
              const manifestForStorage = {
                name: packageName,
                version,
                ...slimManifest(manifest, context, c),
              } as PackageManifest

              versionPromises.push(
                getDb(c)
                  .upsertCachedVersion(
                    versionSpec,
                    manifestForStorage,
                    upstream,
                    upstreamData.time?.[version] ??
                      new Date().toISOString(),
                  )
                  .catch(() => {}),
              )
            }

            await Promise.all([
              ...versionPromises,
              getDb(c)
                .upsertCachedPackage(
                  packageName,
                  packageData['dist-tags'],
                  upstream,
                  packageData.time.modified,
                )
                .catch(() => {}),
            ])

            if (upstream === 'npm') {
              await refreshNpmVersionDownloadsIfStale(
                c,
                packageName,
                'last-week',
              )
            }
          } catch {
            /* background hydration must not throw */
          }
        })(),
      )
    }

    return packageData
  }

  await getCachedPackageWithRefresh(c, packageName, fetchUpstreamFn, {
    upstream,
    packumentTtlMinutes: 60,
    staleWhileRevalidateMinutes: 240,
  })
}

/**
 * Background-hydrate upstream search hits that are not already in the
 * local index so the next local search (and packument GET) finds them.
 */
export function scheduleSearchHydration(
  c: HonoContext,
  packageNames: string[],
  knownLocal: Set<string>,
  upstream = 'npm',
): void {
  const missing = packageNames
    .filter(name => !knownLocal.has(name))
    .slice(0, HYDRATE_LIMIT)

  if (missing.length === 0) return

  defer(
    c,
    Promise.all(
      missing.map(name => hydrateUpstreamPackage(c, name, upstream)),
    ),
  )
}
