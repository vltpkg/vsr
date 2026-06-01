import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  tags: Record<string, string> | undefined
  /** Package-level base path; tag rows link to `<packagePath>/<version>`. */
  packagePath: string
  /** Highlight the row whose version matches the currently viewed one. */
  currentVersion?: string
}

export function PackageDistTags({
  tags,
  packagePath,
  currentVersion,
}: Props) {
  const entries = Object.entries(tags ?? {})
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dist tags</CardTitle>
        <CardDescription>
          {entries.length.toLocaleString()} tag
          {entries.length === 1 ? '' : 's'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y text-sm">
          {entries.map(([tag, ver]) => {
            const active = ver === currentVersion
            return (
              <li
                key={tag}
                className={cn(
                  'first:pt-0 last:pb-0',
                  active && 'rounded-md',
                )}
              >
                <Link
                  href={`${packagePath}/${encodeURIComponent(ver)}`}
                  className={cn(
                    'flex flex-col gap-0.5 py-2 transition-colors',
                    active ?
                      'text-foreground'
                    : 'hover:text-foreground text-muted-foreground',
                  )}
                  title={`Jump to ${ver}`}
                >
                  <span
                    className={cn(
                      'font-mono text-xs tracking-wide uppercase',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {tag}
                  </span>
                  <span className="text-foreground font-mono text-sm break-all">
                    {ver}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
