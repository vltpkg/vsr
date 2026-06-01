import Link from 'next/link'

import { PublisherAvatar } from '@/components/publisher-avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDownloadCount } from '@/lib/package-versions'
import type { SearchResultObject } from '@/lib/vsr'
import { cn } from '@/lib/utils'

type Props = {
  results: SearchResultObject[]
}

const ROW_CLASS = 'h-12'
const CELL_CLASS = 'h-12 max-h-12 align-middle py-0'

function formatPublished(date?: string): string {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function detailHref(item: SearchResultObject): string {
  const origin =
    item.vsr?.source === 'npm' ? (item.vsr.upstream ?? 'npm') : 'local'
  return `/packages/${encodeURIComponent(origin)}/${encodeURIComponent(
    item.package.name,
  )}`
}

function EmptyCell() {
  return <span className="text-muted-foreground text-xs">—</span>
}

export function SearchResultsTable({ results }: Props) {
  return (
    <Table>
        <TableHeader>
          <TableRow className={ROW_CLASS}>
            <TableHead className={cn(CELL_CLASS, 'w-[5.5rem]')}>
              Origin
            </TableHead>
            <TableHead className={CELL_CLASS}>Name</TableHead>
            <TableHead className={cn(CELL_CLASS, 'w-[6.5rem]')}>
              Version
            </TableHead>
            <TableHead
              className={cn(CELL_CLASS, 'hidden w-[7rem] lg:table-cell')}
            >
              Published
            </TableHead>
            <TableHead
              className={cn(CELL_CLASS, 'hidden min-w-[8rem] md:table-cell')}
            >
              Publisher
            </TableHead>
            <TableHead
              className={cn(
                CELL_CLASS,
                'hidden w-[5.5rem] text-right xl:table-cell',
              )}
            >
              Downloads
            </TableHead>
            <TableHead
              className={cn(CELL_CLASS, 'hidden w-[5rem] lg:table-cell')}
            >
              License
            </TableHead>
            <TableHead
              className={cn(CELL_CLASS, 'hidden min-w-[8rem] xl:table-cell')}
            >
              Keywords
            </TableHead>
            <TableHead
              className={cn(CELL_CLASS, 'hidden min-w-[12rem] md:table-cell')}
            >
              Description
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map(item => {
            const { package: pkg, vsr } = item
            const origin = vsr?.originLabel ?? 'Local'
            const isLocal = vsr?.source !== 'npm'

            return (
              <TableRow
                key={`${vsr?.upstream ?? 'local'}-${pkg.name}`}
                className={ROW_CLASS}
              >
                <TableCell className={CELL_CLASS}>
                  <Badge
                    variant={isLocal ? 'secondary' : 'outline'}
                    className="font-mono text-xs"
                  >
                    {origin}
                  </Badge>
                </TableCell>
                <TableCell className={cn(CELL_CLASS, 'font-mono text-sm')}>
                  <Link
                    href={detailHref(item)}
                    className="block truncate hover:underline"
                    prefetch={false}
                    title={pkg.name}
                  >
                    {pkg.name}
                  </Link>
                </TableCell>
                <TableCell className={CELL_CLASS}>
                  {pkg.version ?
                    <Badge variant="outline" className="font-mono text-xs">
                      {pkg.version}
                    </Badge>
                  : <EmptyCell />}
                </TableCell>
                <TableCell
                  className={cn(
                    CELL_CLASS,
                    'text-muted-foreground hidden text-xs lg:table-cell',
                  )}
                >
                  {formatPublished(pkg.date)}
                </TableCell>
                <TableCell className={cn(CELL_CLASS, 'hidden md:table-cell')}>
                  <PublisherAvatar
                    publisher={pkg.publisher}
                    className="max-w-[10rem]"
                  />
                </TableCell>
                <TableCell
                  className={cn(
                    CELL_CLASS,
                    'text-muted-foreground hidden text-right font-mono text-xs tabular-nums xl:table-cell',
                  )}
                  title={
                    vsr?.downloads !== undefined ?
                      'Last 7 days (latest version)'
                    : undefined
                  }
                >
                  {formatDownloadCount(vsr?.downloads)}
                </TableCell>
                <TableCell className={cn(CELL_CLASS, 'hidden lg:table-cell')}>
                  {pkg.license ?
                    <Badge
                      variant="outline"
                      className="max-w-full truncate font-mono text-xs"
                      title={pkg.license}
                    >
                      {pkg.license}
                    </Badge>
                  : <EmptyCell />}
                </TableCell>
                <TableCell className={cn(CELL_CLASS, 'hidden xl:table-cell')}>
                  {pkg.keywords && pkg.keywords.length > 0 ?
                    <div className="flex max-w-[14rem] items-center gap-1 overflow-hidden">
                      {pkg.keywords.slice(0, 3).map(kw => (
                        <Badge
                          key={kw}
                          variant="outline"
                          className="shrink-0 font-normal text-xs"
                        >
                          {kw}
                        </Badge>
                      ))}
                      {pkg.keywords.length > 3 && (
                        <span className="text-muted-foreground shrink-0 text-xs">
                          +{pkg.keywords.length - 3}
                        </span>
                      )}
                    </div>
                  : <EmptyCell />}
                </TableCell>
                <TableCell
                  className={cn(
                    CELL_CLASS,
                    'text-muted-foreground hidden max-w-xs md:table-cell',
                  )}
                >
                  <span
                    className="block truncate text-sm"
                    title={pkg.description}
                  >
                    {pkg.description ?? '—'}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
  )
}
