import type { HonoContext, UpstreamConfig } from '../../types.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { scheduleSearchHydration } from '../utils/hydrate-upstream.ts'
import {
  isLocalIndexIncluded,
  listSearchSources,
  parseSearchSources,
  upstreamSourceIds,
  validateSearchSourceIds,
} from '../utils/search-sources.ts'
import {
  enrichSearchResponse,
  type EnrichedSearchObject,
} from '../utils/search-enrich.ts'
import {
  getUpstreamConfig,
  isValidUpstreamName,
} from '../utils/upstream.ts'

type VsrSearchMeta = {
  source: 'local' | 'npm'
  upstream?: string
}

type NpmSearchResponse = {
  objects: EnrichedSearchObject[]
  total: number
  time: string
}

type SearchPagination = { from: number; size: number }

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

const SEARCH_PASS_THROUGH = [
  'quality',
  'popularity',
  'maintenance',
] as const

function emptySearchResponse(): NpmSearchResponse {
  return { objects: [], total: 0, time: new Date().toISOString() }
}

function parsePagination(c: HonoContext): SearchPagination {
  const size = Math.min(
    Math.max(
      Number.parseInt(c.req.query('size') ?? String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
      1,
    ),
    MAX_PAGE_SIZE,
  )
  const from = Math.max(
    Number.parseInt(c.req.query('from') ?? '0', 10) || 0,
    0,
  )
  return { from, size }
}

function vsrFromDbRow(row: {
  origin?: string | null
  upstream?: string | null
}): VsrSearchMeta {
  if (row.origin === 'upstream') {
    return { source: 'npm', upstream: row.upstream ?? 'npm' }
  }
  return { source: 'local' }
}

/** Local index search — full match set; pagination applied separately. */
async function searchLocal(
  c: HonoContext,
  text: string,
): Promise<NpmSearchResponse> {
  const rows = await c.get('db').searchPackages(text)
  const objects = rows.map(row => ({
    package: {
      name: row.name,
      version: row.tags?.latest,
    },
    score: {
      final: 1,
      detail: { quality: 1, popularity: 1, maintenance: 1 },
    },
    searchScore: 1,
    vsr: vsrFromDbRow(row),
  }))
  return {
    objects,
    total: objects.length,
    time: new Date().toISOString(),
  }
}

function paginateLocal(
  local: NpmSearchResponse,
  pagination: SearchPagination,
): NpmSearchResponse {
  return {
    objects: local.objects.slice(
      pagination.from,
      pagination.from + pagination.size,
    ),
    total: local.total,
    time: local.time,
  }
}

function buildUpstreamSearchUrl(
  upstreamConfig: UpstreamConfig,
  c: HonoContext,
  pagination: SearchPagination,
): string {
  const base = upstreamConfig.url.replace(/\/$/, '')
  const params = new URLSearchParams()
  params.set('text', c.req.query('text')!)
  params.set('size', String(pagination.size))
  params.set('from', String(pagination.from))
  for (const key of SEARCH_PASS_THROUGH) {
    const value = c.req.query(key)
    if (value) params.set(key, value)
  }
  return `${base}/-/v1/search?${params.toString()}`
}

async function searchUpstream(
  upstreamConfig: UpstreamConfig,
  c: HonoContext,
  pagination: SearchPagination,
): Promise<NpmSearchResponse> {
  const url = buildUpstreamSearchUrl(upstreamConfig, c, pagination)
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'vlt-serverless-registry',
    },
  })

  if (!response.ok) {
    if (response.status === 404) return emptySearchResponse()
    throw new Error(
      `Upstream search failed: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as NpmSearchResponse
}

function countLocalOnly(objects: EnrichedSearchObject[]): number {
  return objects.filter(o => o.vsr?.source === 'local').length
}

/** Upstream totals include cached local upstream rows; count only local publishes separately. */
function mergedSearchTotal(
  local: NpmSearchResponse,
  upstreamTotal: number,
): number {
  return countLocalOnly(local.objects) + upstreamTotal
}

async function fetchUpstreamTotal(
  upstreamConfig: UpstreamConfig,
  c: HonoContext,
): Promise<number> {
  const meta = await searchUpstream(upstreamConfig, c, { from: 0, size: 1 })
  return meta.total
}

/**
 * Page through upstream search results while skipping package names already
 * represented in the local index (cached upstream rows).
 */
async function fetchUpstreamExcluding(
  upstreamConfig: UpstreamConfig,
  c: HonoContext,
  excludeNames: Set<string>,
  skip: number,
  take: number,
): Promise<NpmSearchResponse> {
  if (take <= 0) return emptySearchResponse()

  let npmFrom = 0
  const batchSize = Math.max(take * 2, 20)
  let skipped = 0
  const collected: EnrichedSearchObject[] = []
  let upstreamTotal = 0

  while (collected.length < take) {
    const batch = await searchUpstream(upstreamConfig, c, {
      from: npmFrom,
      size: batchSize,
    })
    upstreamTotal = batch.total

    if (batch.objects.length === 0) break

    for (const obj of batch.objects) {
      if (excludeNames.has(obj.package.name)) continue
      if (skipped < skip) {
        skipped++
        continue
      }
      collected.push(obj)
      if (collected.length >= take) break
    }

    npmFrom += batch.objects.length
    if (npmFrom >= batch.total) break
  }

  return {
    objects: collected,
    total: upstreamTotal,
    time: new Date().toISOString(),
  }
}

function tagUpstreamResults(
  response: NpmSearchResponse,
  upstreamName: string,
): NpmSearchResponse {
  return {
    ...response,
    objects: response.objects.map(obj => ({
      ...obj,
      vsr: { source: 'npm' as const, upstream: upstreamName },
    })),
  }
}

/**
 * Merge local + upstream with offset pagination. Local hits always appear
 * first; upstream pages account for how many local rows precede them.
 */
async function searchLocalAndUpstream(
  c: HonoContext,
  upstreamName: string,
  pagination: SearchPagination,
  opts: { mergeLocal?: boolean; hydrate?: boolean } = {},
): Promise<NpmSearchResponse> {
  const { mergeLocal = true, hydrate = true } = opts
  const { from, size } = pagination

  const local = mergeLocal ? await searchLocal(c, c.req.query('text')!) : emptySearchResponse()
  const localCount = local.objects.length
  const localNames = new Set(local.objects.map(o => o.package.name))

  const upstreamConfig = getUpstreamConfig(upstreamName, c)
  if (!upstreamConfig) {
    return mergeLocal ? paginateLocal(local, pagination) : emptySearchResponse()
  }

  // Upstream-only: pass pagination straight through to npm.
  if (!mergeLocal) {
    const remote = tagUpstreamResults(
      await searchUpstream(upstreamConfig, c, pagination),
      upstreamName,
    )
    if (hydrate) {
      scheduleSearchHydration(
        c,
        remote.objects.map(o => o.package.name),
        localNames,
        upstreamName,
      )
    }
    return remote
  }

  // Page spans local rows first, then upstream rows not already in the index.
  let localSlice: EnrichedSearchObject[] = []
  let upstreamSkip = 0
  let upstreamTake = 0

  if (from < localCount) {
    localSlice = local.objects.slice(from, from + size)
    upstreamTake = size - localSlice.length
    upstreamSkip = 0
  } else {
    upstreamSkip = from - localCount
    upstreamTake = size
  }

  let remote = emptySearchResponse()
  let upstreamTotal = 0
  if (upstreamTake > 0) {
    try {
      remote = await fetchUpstreamExcluding(
        upstreamConfig,
        c,
        localNames,
        upstreamSkip,
        upstreamTake,
      )
      upstreamTotal = remote.total
      remote = tagUpstreamResults(remote, upstreamName)
      if (hydrate) {
        scheduleSearchHydration(
          c,
          remote.objects.map(o => o.package.name),
          localNames,
          upstreamName,
        )
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Upstream search failed:', err)
      if (localSlice.length === 0) return paginateLocal(local, pagination)
      upstreamTotal = await fetchUpstreamTotal(upstreamConfig, c).catch(
        () => 0,
      )
    }
  } else {
    upstreamTotal = await fetchUpstreamTotal(upstreamConfig, c).catch(() => 0)
  }

  return {
    objects: [...localSlice, ...remote.objects].slice(0, size),
    total: mergedSearchTotal(local, upstreamTotal),
    time: new Date().toISOString(),
  }
}

/**
 * Merge local index + multiple upstream registries. Local hits first, then
 * upstreams in configured order; duplicate package names are skipped.
 */
async function searchMultipleSources(
  c: HonoContext,
  sourceIds: string[],
  pagination: SearchPagination,
): Promise<NpmSearchResponse> {
  const { from, size } = pagination
  const need = from + size
  const includeLocal = isLocalIndexIncluded(sourceIds)
  const upstreamNames = upstreamSourceIds(sourceIds)

  const local = includeLocal ?
    await searchLocal(c, c.req.query('text')!)
  : emptySearchResponse()
  const localNames = new Set(local.objects.map(o => o.package.name))

  const merged: EnrichedSearchObject[] = []
  const seen = new Set<string>()

  for (const obj of local.objects) {
    if (seen.has(obj.package.name)) continue
    seen.add(obj.package.name)
    merged.push(obj)
  }

  let upstreamTotalSum = 0
  for (const upstreamName of upstreamNames) {
    const upstreamConfig = getUpstreamConfig(upstreamName, c)
    if (!upstreamConfig) continue

    try {
      upstreamTotalSum += await fetchUpstreamTotal(upstreamConfig, c)

      const remote = tagUpstreamResults(
        await searchUpstream(upstreamConfig, c, { from: 0, size: need }),
        upstreamName,
      )

      if (remote.objects.length > 0) {
        scheduleSearchHydration(
          c,
          remote.objects.map(o => o.package.name),
          localNames,
          upstreamName,
        )
      }

      for (const obj of remote.objects) {
        if (seen.has(obj.package.name)) continue
        seen.add(obj.package.name)
        merged.push(obj)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Upstream search failed (${upstreamName}):`, err)
    }
  }

  const pageObjects = merged.slice(from, from + size)
  const total = mergedSearchTotal(local, upstreamTotalSum)

  return {
    objects: pageObjects,
    total,
    time: new Date().toISOString(),
  }
}

/** List configured search sources for the web UI and API clients. */
export async function getSearchSourcesHandler(c: HonoContext) {
  return c.json(listSearchSources(c))
}

async function jsonSearch(c: HonoContext, response: NpmSearchResponse) {
  return c.json(await enrichSearchResponse(c, response))
}

/**
 * Search for packages by text query.
 *
 * Pagination: `size` (default 20, max 100) and `from` (default 0).
 * Local results are listed first; upstream pages follow.
 */
export async function searchPackages(c: HonoContext) {
  try {
    const text = c.req.query('text')
    if (!text) {
      return c.json({ error: 'Missing required parameter "text"' }, 400)
    }

    const pagination = parsePagination(c)
    const upstreamParam = c.req.param('upstream')

    if (upstreamParam) {
      if (!isValidUpstreamName(upstreamParam)) {
        return c.json(
          { error: `Invalid or reserved upstream name: ${upstreamParam}` },
          400,
        )
      }

      if (upstreamParam === 'local') {
        return jsonSearch(
          c,
          paginateLocal(await searchLocal(c, text), pagination),
        )
      }

      const upstreamConfig = getUpstreamConfig(upstreamParam, c)
      if (!upstreamConfig) {
        return c.json({ error: `Unknown upstream: ${upstreamParam}` }, 404)
      }

      return jsonSearch(
        c,
        await searchLocalAndUpstream(c, upstreamParam, pagination, {
          mergeLocal: true,
          hydrate: true,
        }),
      )
    }

    const sourceIds = parseSearchSources(
      c,
      c.req.query('sources'),
      c.req.query('source'),
    )
    const sourceError = validateSearchSourceIds(c, sourceIds)
    if (sourceError) {
      return c.json({ error: sourceError }, 400)
    }

    const upstreamOnly = upstreamSourceIds(sourceIds)
    const includeLocal = isLocalIndexIncluded(sourceIds)

    if (upstreamOnly.length === 0 && includeLocal) {
      return jsonSearch(
        c,
        paginateLocal(await searchLocal(c, text), pagination),
      )
    }

    if (upstreamOnly.length === 1 && !includeLocal) {
      return jsonSearch(
        c,
        await searchLocalAndUpstream(c, upstreamOnly[0]!, pagination, {
          mergeLocal: false,
          hydrate: true,
        }),
      )
    }

    if (upstreamOnly.length === 1 && includeLocal) {
      return jsonSearch(
        c,
        await searchLocalAndUpstream(c, upstreamOnly[0]!, pagination, {
          mergeLocal: true,
          hydrate: true,
        }),
      )
    }

    return jsonSearch(
      c,
      await searchMultipleSources(c, sourceIds, pagination),
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Search error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

// Route definition for OpenAPI documentation
export const searchPackagesRoute = createRoute({
  method: 'get',
  path: '/-/search',
  tags: ['Search'],
  summary: 'Search Packages',
  description: `Search for packages by text query. By default the local index is
queried first, then the public npm registry; upstream hits that are not yet
cached locally are hydrated into D1 in the background (same as fetching a
packument).

Pagination uses \`size\` (default 20) and \`from\` (default 0). Local matches
always appear before upstream results.

\`\`\`bash
$ curl '/-/search?text=react&size=20&from=0'
$ curl '/-/search?text=react&size=20&from=20'
\`\`\``,
  request: {
    query: z.object({
      text: z.string().describe('Search query string'),
      sources: z
        .string()
        .optional()
        .describe(
          'Comma-separated search scopes (e.g. local,npm,acme). Defaults to local + all configured upstreams.',
        ),
      source: z
        .enum(['local', 'npm', 'all'])
        .optional()
        .describe('Legacy scope alias — prefer `sources`'),
      size: z
        .string()
        .optional()
        .describe('Number of results per page (default: 20, max: 100)'),
      from: z
        .string()
        .optional()
        .describe('Result offset for pagination (default: 0)'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            objects: z.array(
              z.object({
                package: z.object({
                  name: z.string(),
                  version: z.string().optional(),
                  description: z.string().optional(),
                  keywords: z.array(z.string()).optional(),
                  date: z.string().optional(),
                }),
                score: z.object({
                  final: z.number(),
                  detail: z.object({
                    quality: z.number(),
                    popularity: z.number(),
                    maintenance: z.number(),
                  }),
                }),
                searchScore: z.number(),
              }),
            ),
            total: z.number(),
            time: z.string(),
          }),
        },
      },
      description: 'Search results',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Bad request - missing text parameter',
    },
  },
})
