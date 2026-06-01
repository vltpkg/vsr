import { notFound } from 'next/navigation'

import { PackageVersionList } from '@/components/package-version-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  loadPackageRoute,
  resolveVersionSegment,
} from '@/lib/package-route'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ origin: string; name: string; version: string }>
}

export default async function PackageVersionsPage({ params }: PageProps) {
  const { origin, name, version: rawVersion } = await params
  const data = await loadPackageRoute(origin, name)
  if ('notFound' in data) notFound()

  const resolved = resolveVersionSegment(data.packument, rawVersion)
  if (resolved.kind !== 'explicit') notFound()

  const { packument } = data
  const versionCount = Object.keys(packument.versions ?? {}).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Versions</CardTitle>
        <CardDescription>
          {versionCount.toLocaleString()} published
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PackageVersionList
          versions={packument.versions}
          times={packument.time}
          downloads={packument._vsr?.downloads}
          packagePath={data.packagePath}
          currentVersion={resolved.version}
        />
      </CardContent>
    </Card>
  )
}
