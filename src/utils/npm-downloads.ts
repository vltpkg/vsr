import type { DatabaseOperations, HonoContext } from '../../types.ts'

/** npm download windows exposed by api.npmjs.org/versions/{pkg}/{period} */
export type NpmDownloadPeriod = 'last-week'

export const NPM_DOWNLOAD_PERIOD_LABELS: Record<NpmDownloadPeriod, string> = {
  'last-week': 'Last 7 days',
}

/** Refetch at most once per day — the upstream window is weekly. */
export const NPM_DOWNLOADS_TTL_MS = 24 * 60 * 60 * 1000

const NPM_DOWNLOADS_BASE = 'https://api.npmjs.org/versions'

type NpmDownloadsResponse = {
  package?: string
  downloads?: Record<string, number>
}

function encodePackageForNpmDownloads(name: string): string {
  return encodeURIComponent(name).replace(/%2F/gi, '%2F')
}

export async function fetchNpmVersionDownloads(
  packageName: string,
  period: NpmDownloadPeriod = 'last-week',
): Promise<{ fetchedAt: string; byVersion: Record<string, number> }> {
  const url = `${NPM_DOWNLOADS_BASE}/${encodePackageForNpmDownloads(packageName)}/${period}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'vlt-serverless-registry',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return { fetchedAt: new Date().toISOString(), byVersion: {} }
    }
    throw new Error(
      `npm downloads API error: ${response.status} ${response.statusText}`,
    )
  }

  const data = (await response.json()) as NpmDownloadsResponse
  const byVersion: Record<string, number> = {}
  for (const [version, count] of Object.entries(data.downloads ?? {})) {
    if (typeof count === 'number' && Number.isFinite(count)) {
      byVersion[version] = count
    }
  }

  return { fetchedAt: new Date().toISOString(), byVersion }
}

export async function refreshNpmVersionDownloads(
  db: DatabaseOperations,
  packageName: string,
  period: NpmDownloadPeriod = 'last-week',
): Promise<void> {
  const { fetchedAt, byVersion } = await fetchNpmVersionDownloads(
    packageName,
    period,
  )
  await db.replaceVersionDownloads(
    packageName,
    period,
    fetchedAt,
    byVersion,
  )
}

export async function refreshNpmVersionDownloadsIfStale(
  c: HonoContext,
  packageName: string,
  period: NpmDownloadPeriod = 'last-week',
): Promise<void> {
  const db = c.get('db')
  const fetchedAt = await db.getVersionDownloadsFetchedAt(
    packageName,
    period,
  )
  if (fetchedAt) {
    const age = Date.now() - new Date(fetchedAt).getTime()
    if (age < NPM_DOWNLOADS_TTL_MS) return
  }

  try {
    await refreshNpmVersionDownloads(db, packageName, period)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to refresh npm downloads for ${packageName}:`,
      err,
    )
  }
}
