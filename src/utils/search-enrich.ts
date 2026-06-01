import { createHash } from 'node:crypto'

import type { HonoContext } from '../../types.ts'
import { extractPublisher } from './packages.ts'

type NpmSearchPublisher = {
  username?: string
  email?: string
  name?: string
}

export type SearchPublisher = {
  username?: string
  email?: string
  name?: string
  avatarUrl?: string
}

export type SearchPackagePayload = {
  name: string
  version?: string
  description?: string
  date?: string
  keywords?: string[]
  license?: string
  publisher?: SearchPublisher
  maintainers?: NpmSearchPublisher[]
}

export type SearchVsrMeta = {
  source: 'local' | 'npm'
  upstream?: string
  originLabel: string
  downloads?: number
}

export type EnrichedSearchObject = {
  package: SearchPackagePayload
  score?: {
    final: number
    detail: {
      quality: number
      popularity: number
      maintenance: number
    }
  }
  searchScore?: number
  vsr?: SearchVsrMeta
}

function gravatarUrl(email: string): string {
  const hash = createHash('md5')
    .update(email.trim().toLowerCase())
    .digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?s=64&d=identicon`
}

function normalizePublisher(
  publisher?: NpmSearchPublisher | SearchPublisher,
): SearchPublisher | undefined {
  if (!publisher) return undefined
  if ('avatarUrl' in publisher && publisher.avatarUrl) {
    return publisher as SearchPublisher
  }
  const email =
    typeof publisher.email === 'string' ? publisher.email : undefined
  const username =
    typeof publisher.username === 'string' ? publisher.username : undefined
  const name =
    (typeof publisher.name === 'string' && publisher.name) ||
    username ||
    undefined
  if (!email && !username && !name) return undefined
  return {
    username,
    email,
    name,
    avatarUrl: email ? gravatarUrl(email) : undefined,
  }
}

function publisherFromManifest(
  manifest: Record<string, unknown>,
): SearchPublisher | undefined {
  const embedded = manifest.publisher
  if (embedded && typeof embedded === 'object') {
    const fromSlim = normalizePublisher(embedded as NpmSearchPublisher)
    if (fromSlim) return fromSlim
  }
  return normalizePublisher(extractPublisher(manifest))
}

function resolvePublisher(
  pkg: SearchPackagePayload,
  manifest: Record<string, unknown> | null,
  allManifests: Record<string, unknown>[],
): SearchPublisher | undefined {
  const direct = normalizePublisher(pkg.publisher)
  if (direct) return direct

  if (manifest) {
    const fromLatest = publisherFromManifest(manifest)
    if (fromLatest) return fromLatest
  }

  for (const m of allManifests) {
    const found = publisherFromManifest(m)
    if (found) return found
  }

  const maintainer = pkg.maintainers?.[0]
  if (maintainer) return normalizePublisher(maintainer)

  return undefined
}

function parseLicense(manifest: Record<string, unknown>): string | undefined {
  const license = manifest.license
  if (typeof license === 'string' && license.trim()) return license.trim()
  if (license && typeof license === 'object') {
    const l = license as Record<string, unknown>
    if (typeof l.type === 'string' && l.type.trim()) return l.type.trim()
  }
  return undefined
}

function originLabel(vsr: {
  source: 'local' | 'npm'
  upstream?: string
}): string {
  if (vsr.source === 'local') return 'Local'
  return vsr.upstream ?? 'npm'
}

async function enrichSearchObject(
  c: HonoContext,
  obj: EnrichedSearchObject,
): Promise<EnrichedSearchObject> {
  const db = c.get('db')
  const pkg = obj.package
  const baseVsr = obj.vsr ?? { source: 'local' as const }
  const vsr: SearchVsrMeta = {
    ...baseVsr,
    originLabel: originLabel(baseVsr),
  }

  const row = await db.getPackage(pkg.name)
  let manifest: Record<string, unknown> | null = null
  let publishedAt = pkg.date ?? undefined
  const latestVersion = pkg.version ?? row?.tags?.latest
  let allManifests: Record<string, unknown>[] = []

  if (row) {
    const versions = await db.getVersionsByPackage(pkg.name)
    allManifests = versions.map(v => v.manifest as Record<string, unknown>)
    if (row.tags?.latest) {
      const latest = versions.find(v => v.version === row.tags.latest)
      if (latest) {
        manifest = latest.manifest as Record<string, unknown>
        publishedAt =
          publishedAt ?? latest.published_at ?? row.lastUpdated ?? undefined
      }
    }
  }

  const publisher = resolvePublisher(pkg, manifest, allManifests)

  const keywords =
    (pkg.keywords?.length ? pkg.keywords : undefined) ??
    (Array.isArray(manifest?.keywords) ?
      (manifest.keywords as string[])
    : undefined)

  const description =
    (typeof pkg.description === 'string' && pkg.description) ||
    (typeof manifest?.description === 'string' ?
      manifest.description
    : undefined)

  const license =
    (typeof pkg.license === 'string' && pkg.license) ||
    (manifest ? parseLicense(manifest) : undefined)

  if (latestVersion) {
    const snapshot = await db.getVersionDownloadsSnapshot(
      pkg.name,
      'last-week',
    )
    const count = snapshot?.byVersion[latestVersion]
    if (typeof count === 'number') {
      vsr.downloads = count
    }
  }

  return {
    ...obj,
    package: {
      ...pkg,
      version: latestVersion ?? pkg.version,
      description,
      date: publishedAt,
      keywords,
      license,
      publisher,
    },
    vsr,
  }
}

export async function enrichSearchResults(
  c: HonoContext,
  objects: EnrichedSearchObject[],
): Promise<EnrichedSearchObject[]> {
  return Promise.all(objects.map(obj => enrichSearchObject(c, obj)))
}

export async function enrichSearchResponse<
  T extends { objects: EnrichedSearchObject[] },
>(c: HonoContext, response: T): Promise<T> {
  return {
    ...response,
    objects: await enrichSearchResults(c, response.objects),
  }
}
