import type { HonoContext, ParsedPackage } from '../../types.ts'
import {
  NPM_DOWNLOAD_PERIOD_LABELS,
  refreshNpmVersionDownloadsIfStale,
  type NpmDownloadPeriod,
} from './npm-downloads.ts'

type PackumentVsr = {
  source: 'local' | 'npm'
  upstream?: string
  indexedAt?: string
  downloads?: {
    period: NpmDownloadPeriod
    periodLabel: string
    fetchedAt: string
    byVersion: Record<string, number>
  }
}

type PackageDataLike = {
  _vsr?: PackumentVsr
}

function packumentSource(
  pkg: {
    origin?: string | null
    upstream?: string | null
    cachedAt?: string | null
    lastUpdated?: string | null
  } | null,
  explicitUpstream?: string | null,
): PackumentVsr {
  const indexedAt =
    pkg?.origin === 'upstream' ?
      (pkg.cachedAt ?? pkg.lastUpdated ?? undefined)
    : undefined

  if (explicitUpstream) {
    return {
      source: 'npm',
      upstream: explicitUpstream,
      ...(indexedAt ? { indexedAt } : {}),
    }
  }
  if (pkg?.origin === 'upstream') {
    return {
      source: 'npm',
      upstream: pkg.upstream ?? 'npm',
      ...(indexedAt ? { indexedAt } : {}),
    }
  }
  return { source: 'local' }
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

function getDb(c: HonoContext) {
  return c.get('db')
}

/** Attach `_vsr` metadata (source, indexedAt, download snapshots) to a packument. */
export async function enrichPackumentMeta(
  c: HonoContext,
  name: string,
  packageData: PackageDataLike,
  indexMeta: ParsedPackage | null,
  explicitUpstream?: string | null,
): Promise<void> {
  const meta = (await getDb(c).getPackage(name)) ?? indexMeta
  const vsr = packumentSource(meta, explicitUpstream ?? null)

  const upstreamName = vsr.upstream ?? 'npm'
  if (vsr.source === 'npm' && upstreamName === 'npm') {
    const period: NpmDownloadPeriod = 'last-week'
    const snapshot = await getDb(c).getVersionDownloadsSnapshot(
      name,
      period,
    )
    if (snapshot) {
      vsr.downloads = {
        period,
        periodLabel: NPM_DOWNLOAD_PERIOD_LABELS[period],
        fetchedAt: snapshot.fetchedAt,
        byVersion: snapshot.byVersion,
      }
    }
    defer(c, refreshNpmVersionDownloadsIfStale(c, name, period))
  }

  packageData._vsr = vsr
}
