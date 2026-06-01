/**
 * Typed fetch wrappers around the VSR HTTP API.
 *
 * Origin resolution:
 *   • Browser: defaults to `''` (relative URLs). Next.js rewrites
 *     `/-/*` to the registry worker (see `next.config.ts`), and
 *     packument GETs run server-side, so the browser stays on a
 *     single origin and Better Auth cookies are first-party.
 *     Override with `NEXT_PUBLIC_VSR_URL` if you really need the
 *     client to call a different origin (cross-origin then needs
 *     credentialed CORS — see `src/index.ts`).
 *   • Server (RSC / route handlers): uses `VSR_ORIGIN` (defaulting
 *     to `http://localhost:1337`) because Node's `fetch` requires
 *     an absolute URL. Forward cookies explicitly via
 *     `fetchVSR(path, { headers: { cookie } })`.
 */

const isServer = typeof window === 'undefined'

export const VSR_URL = isServer
  ? (process.env.VSR_ORIGIN ?? 'http://localhost:1337')
  : (process.env.NEXT_PUBLIC_VSR_URL ?? '')

export type TokenScope = {
  values: string[]
  types: {
    pkg?: { read: boolean; write: boolean }
    user?: { read: boolean; write: boolean }
  }
}

export type ApiKeyView = {
  key: string // apikey.id
  token: string // "vsr_pat_abc123…" preview
  name: string | null
  uuid: string
  scope: TokenScope[]
  readonly: boolean
  automation: boolean
  enabled: boolean
  created: string
  updated: string
  expires: string | null
}

export type CreateTokenInput = {
  name?: string
  scope?: TokenScope[]
  expiresIn?: number
  metadata?: Record<string, unknown>
}

export type CreateTokenResponse = {
  token: string // PLAINTEXT — only returned once
  key: string
  name: string | null
  uuid: string
  scope: TokenScope[]
}

async function vsrFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${VSR_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(
      `VSR ${init.method ?? 'GET'} ${path} → ${res.status}: ${text}`,
    )
  }
  return (await res.json()) as T
}

// ---------------------------------------------------------
// Tokens
// ---------------------------------------------------------

export const listTokens = () =>
  vsrFetch<{ objects: ApiKeyView[]; total: number }>('/-/tokens')

export const createToken = (input: CreateTokenInput) =>
  vsrFetch<CreateTokenResponse>('/-/tokens', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const updateToken = (
  keyId: string,
  patch: { name?: string; scope?: TokenScope[] },
) =>
  vsrFetch<{ success: boolean; key: string }>('/-/tokens', {
    method: 'PUT',
    body: JSON.stringify({ keyId, ...patch }),
  })

export const revokeToken = (keyId: string) =>
  vsrFetch<{ success: boolean }>(
    `/-/tokens/token/${encodeURIComponent(keyId)}`,
    { method: 'DELETE' },
  )

// ---------------------------------------------------------
// Packages (public + authenticated)
// ---------------------------------------------------------

export type PackumentVersion = {
  version?: string
  deprecated?: string | boolean
  publisher?: {
    username?: string
    email?: string
    name?: string
    avatarUrl?: string
  }
}

export type PackumentSummary = {
  name: string
  'dist-tags'?: Record<string, string>
  versions?: Record<string, PackumentVersion>
  description?: string
  time?: Record<string, string>
  _vsr?: {
    source: 'local' | 'npm'
    upstream?: string
    indexedAt?: string
    downloads?: {
      period: string
      periodLabel: string
      fetchedAt: string
      byVersion: Record<string, number>
    }
  }
}

/** Resolve whether install instructions should target npm or this registry. */
export function resolvePackageSource(
  packument: PackumentSummary,
  upstreamParam?: string,
): 'local' | 'npm' {
  if (upstreamParam === 'npm') return 'npm'
  if (packument._vsr?.source === 'npm') return 'npm'
  return 'local'
}

export const getPackument = (
  name: string,
  opts?: RequestInit & { upstream?: string },
) => {
  const { upstream, ...init } = opts ?? {}
  const encodedName = encodeURIComponent(name)
  const path =
    upstream ?
      `/${encodeURIComponent(upstream)}/${encodedName}`
    : `/${encodedName}`
  return vsrFetch<PackumentSummary>(path, init)
}

export type PackageReadme = {
  name: string
  version: string
  readme: string
  filename: string
}

export const getPackageReadme = async (
  name: string,
  opts?: RequestInit & { upstream?: string; version?: string },
): Promise<PackageReadme | null> => {
  const { upstream, version, ...init } = opts ?? {}
  // The endpoint is mounted at the registry-internal `/-/package/...` namespace.
  // For scoped packages we keep the URL-encoded form (a `/` in `@scope/pkg`)
  // because the route's scope/pkg pattern expects two segments.
  const encoded =
    name.startsWith('@') ?
      `${encodeURIComponent(name.split('/')[0]!)}/${encodeURIComponent(name.split('/')[1] ?? '')}`
    : encodeURIComponent(name)
  const params = new URLSearchParams()
  if (upstream) params.set('upstream', upstream)
  if (version) params.set('version', version)
  const qs = params.toString() ? `?${params.toString()}` : ''
  try {
    const res = await fetch(
      `${VSR_URL}/-/package/${encoded}/readme${qs}`,
      {
        credentials: 'include',
        ...init,
        headers: {
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...(init.headers ?? {}),
        },
      },
    )
    if (res.status === 404) return null
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(
        `VSR GET /-/package/${name}/readme → ${res.status}: ${text}`,
      )
    }
    return (await res.json()) as PackageReadme
  } catch (err) {
    if (err instanceof Error && err.message.includes('→ 404')) {
      return null
    }
    throw err
  }
}

export type PackageVersionManifest = {
  name: string
  version: string
  description?: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  optionalDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  bundledDependencies?: string[]
  engines?: Record<string, string>
  bin?: Record<string, string>
  dist?: { tarball?: string; integrity?: string; shasum?: string }
  deprecated?: string | boolean
}

export const getPackageManifest = (
  name: string,
  version: string,
  opts?: RequestInit & { upstream?: string },
) => {
  const { upstream, ...init } = opts ?? {}
  const encodedName = encodeURIComponent(name)
  const encodedVersion = encodeURIComponent(version)
  const path =
    upstream ?
      `/${encodeURIComponent(upstream)}/${encodedName}/${encodedVersion}`
    : `/${encodedName}/${encodedVersion}`
  return vsrFetch<PackageVersionManifest>(path, init)
}

export type SearchSource = 'local' | 'npm' | 'all'

export type SearchSourceOption = {
  id: string
  label: string
  kind: 'index' | 'upstream'
  type: string
  description: string
}

export type SearchSourcesResponse = {
  sources: SearchSourceOption[]
  defaultSources: string[]
}

// VSR exposes `/-/search` with a `text=` query (npm-compatible).
export type SearchPublisher = {
  username?: string
  email?: string
  name?: string
  avatarUrl?: string
}

export type SearchResultPackage = {
  name: string
  version?: string
  description?: string
  date?: string
  keywords?: string[]
  license?: string
  publisher?: SearchPublisher
  maintainers?: SearchPublisher[]
}

export type SearchResultObject = {
  package: SearchResultPackage
  vsr?: {
    source: 'local' | 'npm'
    upstream?: string
    originLabel?: string
    downloads?: number
  }
}

export type SearchResponse = {
  objects: SearchResultObject[]
  total: number
}

export const getSearchSources = () =>
  vsrFetch<SearchSourcesResponse>('/-/search/sources')

export const searchPackages = (
  query: string,
  opts?: {
    sources?: string[]
    page?: number
    size?: number
  },
) => {
  const size = opts?.size ?? 20
  const page = Math.max(1, opts?.page ?? 1)
  const params = new URLSearchParams({
    text: query,
    size: String(size),
    from: String((page - 1) * size),
  })
  if (opts?.sources?.length) {
    params.set('sources', [...opts.sources].sort().join(','))
  }
  return vsrFetch<SearchResponse>(`/-/search?${params.toString()}`)
}

// ---------------------------------------------------------
// Access control
// ---------------------------------------------------------

export type AccessResponse = {
  name: string
  collaborators: Record<string, 'read-only' | 'read-write'>
}

export const getPackageAccess = (pkg: string) =>
  vsrFetch<AccessResponse>(
    `/-/package/${encodeURIComponent(pkg)}/access`,
  )

export const grantPackageAccess = (
  pkg: string,
  username: string,
  permission: 'read-only' | 'read-write',
) =>
  vsrFetch<AccessResponse>(
    `/-/package/${encodeURIComponent(pkg)}/collaborators/${encodeURIComponent(username)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ permission }),
    },
  )

export const revokePackageAccess = (pkg: string, username: string) =>
  vsrFetch<AccessResponse>(
    `/-/package/${encodeURIComponent(pkg)}/collaborators/${encodeURIComponent(username)}`,
    { method: 'DELETE' },
  )
