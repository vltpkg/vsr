import semver from 'semver'

export type PublisherInfo = {
  username?: string
  email?: string
  name?: string
  avatarUrl?: string
}

export type VersionManifest = {
  version?: string
  deprecated?: string | boolean
  publisher?: PublisherInfo
}

export type VersionDownloadsMeta = {
  period: string
  periodLabel: string
  fetchedAt: string
  byVersion: Record<string, number>
}

export type VersionRow = {
  version: string
  publishedAt?: string
  deprecated?: string
  isPrerelease: boolean
  publisher?: PublisherInfo
  downloads?: number
}

export function getDeprecatedMessage(
  manifest: VersionManifest | undefined,
): string | undefined {
  if (!manifest?.deprecated) return undefined
  if (manifest.deprecated === true) return 'This version is deprecated.'
  if (typeof manifest.deprecated === 'string' && manifest.deprecated.trim()) {
    return manifest.deprecated.trim()
  }
  return undefined
}

export function isPrereleaseVersion(version: string): boolean {
  const parsed = semver.parse(version, { loose: true })
  if (parsed?.prerelease?.length) return true
  return /-/.test(version)
}

export function buildVersionRows(
  versions: Record<string, VersionManifest> | undefined,
  times: Record<string, string> | undefined,
  downloads?: VersionDownloadsMeta,
): VersionRow[] {
  if (!versions) return []

  return Object.entries(versions).map(([version, manifest]) => ({
    version: manifest.version ?? version,
    publishedAt: times?.[version],
    deprecated: getDeprecatedMessage(manifest),
    isPrerelease: isPrereleaseVersion(manifest.version ?? version),
    publisher: manifest.publisher,
    downloads: downloads?.byVersion[manifest.version ?? version],
  }))
}

export type VersionSort = 'newest' | 'oldest' | 'downloads'

export function sortVersionRows(
  rows: VersionRow[],
  sort: VersionSort,
): VersionRow[] {
  const copy = [...rows]
  copy.sort((a, b) => {
    if (sort === 'downloads') {
      const da = a.downloads ?? -1
      const db = b.downloads ?? -1
      if (da !== db) return db - da
      return semver.rcompare(a.version, b.version, true)
    }
    const cmp = semver.rcompare(a.version, b.version, true)
    return sort === 'newest' ? cmp : -cmp
  })
  return copy
}

export type VersionFilters = {
  query: string
  showPrerelease: boolean
  showDeprecated: boolean
}

export function filterVersionRows(
  rows: VersionRow[],
  filters: VersionFilters,
): VersionRow[] {
  const q = filters.query.trim().toLowerCase()

  return rows.filter(row => {
    if (!filters.showPrerelease && row.isPrerelease) return false
    if (!filters.showDeprecated && row.deprecated) return false
    if (q && !row.version.toLowerCase().includes(q)) return false
    return true
  })
}

export function formatDownloadCount(count: number | undefined): string {
  if (count === undefined) return '—'
  return new Intl.NumberFormat(undefined, {
    notation: count >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(count)
}
