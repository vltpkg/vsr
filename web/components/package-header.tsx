import { ExternalLink, Settings2 } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PackumentSummary } from '@/lib/vsr'

type Props = {
  packument: PackumentSummary
  source: 'local' | 'npm'
  /** Currently selected version (drawn from the URL). */
  version: string
  /** True when `version === dist-tags.latest`. */
  isLatest: boolean
  collaboratorsHref: string
}

export function PackageHeader({
  packument,
  source,
  version,
  isLatest,
  collaboratorsHref,
}: Props) {
  const latest = packument['dist-tags']?.latest
  const upstream = packument._vsr?.upstream ?? 'npm'
  const upstreamHref =
    source === 'npm' ?
      `https://www.npmjs.com/package/${packument.name}`
    : undefined

  return (
    <header className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">
          {packument.name}
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href={collaboratorsHref}>
            <Settings2 className="size-4" />
            Manage access
          </Link>
        </Button>
      </div>
      {packument.description && (
        <p className="text-muted-foreground">{packument.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono">
          v{version}
        </Badge>
        {!isLatest && latest && (
          <Badge
            variant="outline"
            className="font-mono"
            title={`Latest published version is ${latest}`}
          >
            latest: {latest}
          </Badge>
        )}
        {source === 'npm' ?
          <Badge
            variant="outline"
            className="gap-1 font-normal"
            title={`This package is mirrored from ${upstream}`}
          >
            <span className="text-muted-foreground">Mirrored from</span>
            {upstreamHref ?
              <a
                href={upstreamHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground inline-flex items-center gap-1"
              >
                {upstream}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            : upstream}
          </Badge>
        : <Badge variant="outline" className="font-normal">
            <span className="text-muted-foreground">Published to</span>
            <span className="ml-1">this registry</span>
          </Badge>
        }
      </div>
      {source === 'npm' && packument._vsr?.indexedAt && (
        <p className="text-muted-foreground text-xs">
          Last indexed{' '}
          {new Date(packument._vsr.indexedAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      )}
    </header>
  )
}
