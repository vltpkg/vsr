import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PackageDependencies } from '@/components/package-dependencies'
import {
  PackageReadme,
  PackageReadmeEmpty,
  PackageReadmeSkeleton,
} from '@/components/package-readme'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  isLocalOrigin,
  loadPackageRoute,
  resolveVersionSegment,
} from '@/lib/package-route'
import { getPackageManifest, getPackageReadme } from '@/lib/vsr'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ origin: string; name: string; version: string }>
}

export default async function PackageOverviewPage({ params }: PageProps) {
  const { origin, name, version: rawVersion } = await params
  const data = await loadPackageRoute(origin, name)
  if ('notFound' in data) notFound()

  const resolved = resolveVersionSegment(data.packument, rawVersion)
  if (resolved.kind !== 'explicit') notFound()

  const upstream = isLocalOrigin(data.origin) ? undefined : data.origin

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PackageReadmeSkeleton />}>
            <ReadmeContent
              name={data.name}
              version={resolved.version}
              upstream={upstream}
            />
          </Suspense>
        </CardContent>
      </Card>

      <Suspense fallback={null}>
        <DependenciesContent
          name={data.name}
          version={resolved.version}
          upstream={upstream}
          origin={data.origin}
        />
      </Suspense>
    </>
  )
}

async function ReadmeContent({
  name,
  version,
  upstream,
}: {
  name: string
  version: string
  upstream: string | undefined
}) {
  const readme = await getPackageReadme(name, { upstream, version }).catch(
    () => null,
  )
  if (!readme) return <PackageReadmeEmpty />
  return <PackageReadme readme={readme.readme} />
}

async function DependenciesContent({
  name,
  version,
  upstream,
  origin,
}: {
  name: string
  version: string
  upstream: string | undefined
  origin: string
}) {
  const manifest = await getPackageManifest(name, version, { upstream }).catch(
    () => null,
  )
  if (!manifest) return null
  return <PackageDependencies manifest={manifest} origin={origin} />
}
