import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { isLocalOrigin, packagePath } from '@/lib/package-route'
import type { PackageVersionManifest } from '@/lib/vsr'

type Props = {
  manifest: PackageVersionManifest
  /** Used to build dependency links so they stay within the same origin. */
  origin: string
}

type Group = {
  id: string
  title: string
  description?: string
  entries: [name: string, range: string][]
  meta?: Record<string, { optional?: boolean }>
}

export function PackageDependencies({ manifest, origin }: Props) {
  const groups: Group[] = [
    {
      id: 'runtime',
      title: 'Dependencies',
      description: 'Required at install/runtime.',
      entries: Object.entries(manifest.dependencies ?? {}),
    },
    {
      id: 'peer',
      title: 'Peer dependencies',
      description: 'Expected to be provided by the host project.',
      entries: Object.entries(manifest.peerDependencies ?? {}),
      meta: manifest.peerDependenciesMeta,
    },
    {
      id: 'optional',
      title: 'Optional dependencies',
      description: "Installed when possible; failures don't break install.",
      entries: Object.entries(manifest.optionalDependencies ?? {}),
    },
  ]

  const total = groups.reduce((n, g) => n + g.entries.length, 0)
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dependencies</CardTitle>
          <CardDescription>No declared dependencies.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dependencies</CardTitle>
        <CardDescription>
          {total.toLocaleString()} declared across{' '}
          {groups.filter(g => g.entries.length > 0).length} group
          {groups.filter(g => g.entries.length > 0).length === 1 ? '' : 's'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map(group =>
          group.entries.length === 0 ?
            null
          : <DependencyGroup
              key={group.id}
              group={group}
              origin={origin}
            />,
        )}
      </CardContent>
    </Card>
  )
}

function DependencyGroup({
  group,
  origin,
}: {
  group: Group
  origin: string
}) {
  // Always resolve dependency links through the local origin first; the
  // package route's loader will redirect upstream-only packages to their
  // canonical origin URL when followed.
  const linkOrigin = isLocalOrigin(origin) ? 'local' : origin
  return (
    <section className="space-y-2">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{group.title}</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {group.entries.length.toLocaleString()}
        </span>
      </header>
      {group.description && (
        <p className="text-muted-foreground text-xs">{group.description}</p>
      )}
      <ul className="border-border divide-border bg-background divide-y rounded-md border text-sm">
        {group.entries.map(([name, range]) => {
          const optional = group.meta?.[name]?.optional
          return (
            <li
              key={name}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <Link
                href={packagePath(linkOrigin, name)}
                className="hover:text-foreground text-foreground/90 truncate font-mono text-sm hover:underline"
                title={name}
              >
                {name}
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {optional && (
                  <span className="text-muted-foreground text-xs">
                    optional
                  </span>
                )}
                <code className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  {range}
                </code>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
