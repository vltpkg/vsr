import { notFound, redirect } from 'next/navigation'

import { PackageDistTags } from '@/components/package-dist-tags'
import { PackageHeader } from '@/components/package-header'
import { PackageInstallInstructions } from '@/components/package-install-instructions'
import { PackageTabs } from '@/components/package-tabs'
import {
  loadPackageRoute,
  packageVersionPath,
  resolveVersionSegment,
} from '@/lib/package-route'

export const dynamic = 'force-dynamic'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ origin: string; name: string; version: string }>
}

export default async function PackageVersionLayout({
  children,
  params,
}: LayoutProps) {
  const { origin, name, version: rawVersion } = await params
  const data = await loadPackageRoute(origin, name)
  if ('notFound' in data) notFound()

  const resolved = resolveVersionSegment(data.packument, rawVersion)
  if (resolved.kind === 'not-found') notFound()
  if (resolved.kind === 'tag') {
    redirect(packageVersionPath(data.origin, data.name, resolved.version))
  }

  const versionBasePath = packageVersionPath(
    data.origin,
    data.name,
    resolved.version,
  )

  return (
    <div className="space-y-6">
      <PackageHeader
        packument={data.packument}
        source={data.source}
        version={resolved.version}
        isLatest={resolved.isLatest}
        collaboratorsHref={data.collaboratorsHref}
      />

      <PackageInstallInstructions
        name={data.packument.name}
        source={data.source}
        upstream={data.packument._vsr?.upstream}
        version={resolved.version}
      />

      <PackageTabs basePath={versionBasePath} />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="min-w-0 space-y-6 md:col-span-2">{children}</div>
        <aside className="space-y-6">
          <PackageDistTags
            tags={data.packument['dist-tags']}
            packagePath={data.packagePath}
            currentVersion={resolved.version}
          />
        </aside>
      </div>
    </div>
  )
}
