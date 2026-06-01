import { notFound, redirect } from 'next/navigation'

import {
  loadPackageRoute,
  packageVersionPath,
} from '@/lib/package-route'

export const dynamic = 'force-dynamic'

/**
 * Visiting a package without a version segment forwards to the canonical
 * `latest`-resolved URL so every page in the app is always anchored to an
 * explicit version.
 */
type PageProps = {
  params: Promise<{ origin: string; name: string }>
}

export default async function PackageRootRedirect({ params }: PageProps) {
  const { origin, name } = await params
  const data = await loadPackageRoute(origin, name)
  if ('notFound' in data) notFound()

  const latest = data.packument['dist-tags']?.latest
  if (!latest) notFound()
  redirect(packageVersionPath(data.origin, data.name, latest))
}
