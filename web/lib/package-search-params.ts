import type { SearchSourceOption } from '@/lib/vsr'

export const PACKAGE_SEARCH_PAGE_SIZE = 20

/** Fallback when the registry sources endpoint is unreachable. */
export const FALLBACK_SEARCH_SOURCES: SearchSourceOption[] = [
  {
    id: 'local',
    label: 'Local',
    kind: 'index',
    type: 'index',
    description: 'Packages published to this registry',
  },
  {
    id: 'npm',
    label: 'npm',
    kind: 'upstream',
    type: 'npm',
    description: 'Search https://registry.npmjs.org',
  },
]

export const FALLBACK_DEFAULT_SOURCES = ['local', 'npm']

export function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function normalizeSourceIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))].sort()
}

export function parseSourcesParam(
  raw: string | undefined,
  knownIds: Set<string>,
  defaults: string[],
): string[] {
  if (!raw?.trim()) return defaults
  const parsed = normalizeSourceIds(raw.split(',')).filter(id =>
    knownIds.has(id),
  )
  return parsed.length > 0 ? parsed : defaults
}

export function serializeSourcesParam(ids: string[]): string | undefined {
  const normalized = normalizeSourceIds(ids)
  return normalized.length > 0 ? normalized.join(',') : undefined
}

export function isDefaultSources(
  selected: string[],
  defaults: string[],
): boolean {
  const a = normalizeSourceIds(selected)
  const b = normalizeSourceIds(defaults)
  return a.length === b.length && a.every((id, i) => id === b[i])
}

export function searchUrl(
  basePath: string,
  opts: {
    q?: string
    sources?: string[]
    defaultSources?: string[]
    page?: number
  },
): string {
  const params = new URLSearchParams()
  if (opts.q) params.set('q', opts.q)
  const defaults = opts.defaultSources ?? FALLBACK_DEFAULT_SOURCES
  const sources = opts.sources ?? defaults
  if (!isDefaultSources(sources, defaults)) {
    const serialized = serializeSourcesParam(sources)
    if (serialized) params.set('sources', serialized)
  }
  if (opts.page && opts.page > 1) params.set('page', String(opts.page))
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export function formatSourcesLabel(
  selected: string[],
  sources: SearchSourceOption[],
): string {
  if (selected.length === 0) return 'Sources'
  if (selected.length === sources.length) return 'All sources'

  const labels = selected
    .map(id => sources.find(s => s.id === id)?.label ?? id)
    .slice(0, 2)
  const extra = selected.length - labels.length
  if (extra > 0) return `${labels.join(', ')} +${extra}`
  return labels.join(', ')
}

export function sourceDescription(
  selected: string[],
  sources: SearchSourceOption[],
): string {
  return selected
    .map(id => {
      const meta = sources.find(s => s.id === id)
      return meta ? `${meta.label}: ${meta.description}` : id
    })
    .join(' · ')
}
