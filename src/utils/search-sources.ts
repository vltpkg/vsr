import type { HonoContext, UpstreamConfig } from '../../types.ts'
import {
  getDefaultUpstream,
  getUpstreamConfig,
  isValidUpstreamName,
} from './upstream.ts'

export type SearchSourceKind = 'index' | 'upstream'

export type SearchSourceOption = {
  id: string
  label: string
  kind: SearchSourceKind
  type: UpstreamConfig['type'] | 'index'
  description: string
}

export type SearchSourcesResponse = {
  sources: SearchSourceOption[]
  /** Default selection when no `sources` query param is provided. */
  defaultSources: string[]
}

const LOCAL_INDEX_ID = 'local'

function listRemoteUpstreams(c: HonoContext): [string, UpstreamConfig][] {
  const upstreams = c.env.ORIGIN_CONFIG.upstreams
  return Object.entries(upstreams).filter(
    ([, config]) => config.type !== 'local',
  )
}

/** Public metadata for configured search scopes (local index + upstream registries). */
export function listSearchSources(c: HonoContext): SearchSourcesResponse {
  const sources: SearchSourceOption[] = [
    {
      id: LOCAL_INDEX_ID,
      label: 'Local',
      kind: 'index',
      type: 'index',
      description: 'Packages published to this registry',
    },
  ]

  for (const [name, config] of listRemoteUpstreams(c)) {
    sources.push({
      id: name,
      label: name,
      kind: 'upstream',
      type: config.type,
      description: `Search ${config.url.replace(/\/$/, '')}`,
    })
  }

  const defaultSources = sources.map(s => s.id)
  return { sources, defaultSources }
}

export function getKnownSearchSourceIds(c: HonoContext): Set<string> {
  return new Set(listSearchSources(c).sources.map(s => s.id))
}

function normalizeSourceIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))].sort()
}

/** Serialize for URL query params (stable ordering). */
export function serializeSearchSources(ids: string[]): string {
  return normalizeSourceIds(ids).join(',')
}

/**
 * Resolve `sources=a,b,c` with legacy `source=all|local|npm` fallback.
 * Unknown ids are dropped; empty result falls back to defaults.
 */
export function parseSearchSources(
  c: HonoContext,
  sourcesParam?: string | null,
  legacySource?: string | null,
): string[] {
  const known = getKnownSearchSourceIds(c)
  const defaults = listSearchSources(c).defaultSources

  if (sourcesParam?.trim()) {
    const parsed = normalizeSourceIds(sourcesParam.split(',')).filter(id =>
      known.has(id),
    )
    if (parsed.length > 0) return parsed
  }

  if (legacySource === 'local') {
    return known.has(LOCAL_INDEX_ID) ? [LOCAL_INDEX_ID] : defaults
  }

  if (legacySource === 'npm' && known.has('npm')) {
    return ['npm']
  }

  if (legacySource === 'all') {
    return defaults
  }

  return defaults
}

export function validateSearchSourceIds(
  c: HonoContext,
  ids: string[],
): string | null {
  for (const id of ids) {
    if (id === LOCAL_INDEX_ID) continue
    if (!isValidUpstreamName(id)) {
      return `Invalid or reserved source: ${id}`
    }
    if (!getUpstreamConfig(id, c)) {
      return `Unknown upstream source: ${id}`
    }
  }
  return null
}

export function isLocalIndexIncluded(sourceIds: string[]): boolean {
  return sourceIds.includes(LOCAL_INDEX_ID)
}

export function upstreamSourceIds(sourceIds: string[]): string[] {
  return sourceIds.filter(id => id !== LOCAL_INDEX_ID)
}
