import { cache } from 'react'

import { getPackument, resolvePackageSource } from '@/lib/vsr'
import type { PackumentSummary } from '@/lib/vsr'

/**
 * `/packages/<origin>/<name>` segregates packages by where they came from so
 * an upstream-cached package can never collide with (or shadow) a locally
 * published one. The reserved alias `local` represents this registry; any
 * other value is treated as the upstream identifier.
 */
export const LOCAL_ORIGIN = 'local'

export type PackageRouteData = {
  origin: string
  name: string
  packument: PackumentSummary
  source: 'local' | 'npm'
  /** `/packages/<origin>/<name>` — package-level base, not version-specific. */
  packagePath: string
  collaboratorsHref: string
}

/** True if the origin alias represents the local registry, not an upstream. */
export function isLocalOrigin(origin: string | undefined | null): boolean {
  return !origin || origin === LOCAL_ORIGIN
}

/**
 * Canonical origin alias for a package, derived from its packument metadata.
 * Used when redirecting visitors who land on a non-canonical URL.
 */
export function canonicalOrigin(packument: PackumentSummary): string {
  if (packument._vsr?.source === 'npm') {
    return packument._vsr.upstream ?? 'npm'
  }
  return LOCAL_ORIGIN
}

/** Build the `/packages/<origin>/<name>` href (package, not version). */
export function packagePath(origin: string, name: string): string {
  return `/packages/${encodeURIComponent(origin)}/${encodeURIComponent(name)}`
}

/** Build the `/packages/<origin>/<name>/<version>` href (current version). */
export function packageVersionPath(
  origin: string,
  name: string,
  version: string,
): string {
  return `${packagePath(origin, name)}/${encodeURIComponent(version)}`
}

/**
 * Memoized packument fetch + source resolution, shared by the layout and any
 * leaf pages so we only hit the registry once per request.
 *
 * Layouts cannot read `searchParams`, so the upstream is encoded in the route
 * itself; the local origin alias maps to no upstream override (i.e. the local
 * index), every other alias is sent through as `?upstream=<alias>`.
 */
export const loadPackageRoute = cache(
  async (
    rawOrigin: string,
    rawName: string,
  ): Promise<PackageRouteData | { notFound: true }> => {
    const origin = decodeURIComponent(rawOrigin)
    const name = decodeURIComponent(rawName)
    const upstream = isLocalOrigin(origin) ? undefined : origin
    try {
      const packument = await getPackument(name, { upstream })
      const source = resolvePackageSource(packument, upstream)
      return {
        origin: isLocalOrigin(origin) ? LOCAL_ORIGIN : origin,
        name,
        packument,
        source,
        packagePath: packagePath(origin, name),
        collaboratorsHref: `/dashboard/packages/${encodeURIComponent(name)}/collaborators`,
      }
    } catch {
      return { notFound: true }
    }
  },
)

export type ResolvedVersion =
  | {
      kind: 'explicit'
      version: string
      isLatest: boolean
    }
  | {
      kind: 'tag'
      requested: string
      version: string
    }
  | { kind: 'not-found' }

/**
 * Resolve a `[version]` URL segment against the packument. Returns an
 * `explicit` match when the segment is a published version, a `tag` match
 * (with the resolved explicit version) when it points to a dist-tag, or
 * `not-found` otherwise. Callers should redirect on `tag` so URLs are
 * always canonical.
 */
export function resolveVersionSegment(
  packument: PackumentSummary,
  raw: string,
): ResolvedVersion {
  const requested = decodeURIComponent(raw)
  const versions = packument.versions ?? {}
  const tags = packument['dist-tags'] ?? {}

  if (requested in versions) {
    return {
      kind: 'explicit',
      version: requested,
      isLatest: tags.latest === requested,
    }
  }

  const tagged = tags[requested]
  if (tagged) {
    return { kind: 'tag', requested, version: tagged }
  }

  return { kind: 'not-found' }
}
