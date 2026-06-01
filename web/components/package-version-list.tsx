'use client'

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  TriangleAlert,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { PublisherAvatar } from '@/components/publisher-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  buildVersionRows,
  filterVersionRows,
  formatDownloadCount,
  sortVersionRows,
  type VersionDownloadsMeta,
  type VersionManifest,
  type VersionSort,
} from '@/lib/package-versions'
import { cn } from '@/lib/utils'

type Props = {
  versions: Record<string, VersionManifest> | undefined
  times: Record<string, string> | undefined
  downloads?: VersionDownloadsMeta
  /** Package base path (e.g. `/packages/npm/react`); each row links to `<packagePath>/<version>`. */
  packagePath?: string
  /** Highlights the currently selected version. */
  currentVersion?: string
}

export function PackageVersionList({
  versions,
  times,
  downloads,
  packagePath,
  currentVersion,
}: Props) {
  const allRows = useMemo(
    () => buildVersionRows(versions, times, downloads),
    [versions, times, downloads],
  )

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<VersionSort>('newest')
  const [showPrerelease, setShowPrerelease] = useState(false)
  const [showDeprecated, setShowDeprecated] = useState(false)

  const filtered = useMemo(() => {
    const rows = filterVersionRows(allRows, {
      query,
      showPrerelease,
      showDeprecated,
    })
    return sortVersionRows(rows, sort)
  }, [allRows, query, showPrerelease, showDeprecated, sort])

  const deprecatedCount = allRows.filter(r => r.deprecated).length
  const prereleaseCount = allRows.filter(r => r.isPrerelease).length
  const hasDownloads = Boolean(downloads?.byVersion)

  const PAGE_SIZE = 15
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [query, sort, showPrerelease, showDeprecated])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  if (allRows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No versions yet.</p>
    )
  }

  const downloadsTitle =
    downloads ?
      `${downloads.periodLabel} · snapshot from ${new Date(downloads.fetchedAt).toLocaleString()}`
    : undefined

  const isFiltered = filtered.length !== allRows.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search versions…"
            className="h-9 pl-9"
          />
        </div>

        <label className="text-muted-foreground hover:text-foreground inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors">
          <input
            type="checkbox"
            checked={showPrerelease}
            onChange={e => setShowPrerelease(e.target.checked)}
            className="accent-primary size-3.5 rounded border"
          />
          <span className="text-foreground">Pre-releases</span>
          {prereleaseCount > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {prereleaseCount}
            </span>
          )}
        </label>

        <label className="text-muted-foreground hover:text-foreground inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors">
          <input
            type="checkbox"
            checked={showDeprecated}
            onChange={e => setShowDeprecated(e.target.checked)}
            className="accent-primary size-3.5 rounded border"
          />
          <span className="text-foreground">Deprecated</span>
          {deprecatedCount > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {deprecatedCount}
            </span>
          )}
        </label>

        <Label htmlFor="version-sort" className="sr-only">
          Sort
        </Label>
        <div className="relative">
          <select
            id="version-sort"
            value={sort}
            onChange={e => setSort(e.target.value as VersionSort)}
            className="border-input bg-background h-9 appearance-none rounded-md border pr-8 pl-3 text-sm shadow-xs"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            {hasDownloads && <option value="downloads">Most downloads</option>}
          </select>
          <ChevronDown
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
          />
        </div>
      </div>

      {isFiltered && (
        <p className="text-muted-foreground text-xs">
          Showing {filtered.length.toLocaleString()} of{' '}
          {allRows.length.toLocaleString()} versions
        </p>
      )}

      {filtered.length === 0 ?
        <p className="text-muted-foreground text-sm">
          No versions match the current filters.
        </p>
      : <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Publisher</TableHead>
                {hasDownloads && (
                  <TableHead className="text-right" title={downloadsTitle}>
                    Downloads
                  </TableHead>
                )}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(row => {
                const isCurrent = row.version === currentVersion
                const href =
                  packagePath ?
                    `${packagePath}/${encodeURIComponent(row.version)}`
                  : undefined
                return (
                <TableRow
                  key={row.version}
                  className={cn(
                    row.deprecated && 'bg-destructive/5',
                    isCurrent && 'bg-muted/50',
                  )}
                >
                  <TableCell className="font-mono">
                    {href ?
                      <Link
                        href={href}
                        className={cn(
                          'hover:underline',
                          row.deprecated && 'text-muted-foreground line-through',
                          isCurrent && 'font-semibold',
                        )}
                      >
                        {row.version}
                      </Link>
                    : <span
                        className={cn(
                          row.deprecated && 'text-muted-foreground line-through',
                        )}
                      >
                        {row.version}
                      </span>
                    }
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.publishedAt ?
                      new Date(row.publishedAt).toLocaleDateString()
                    : '—'}
                  </TableCell>
                  <TableCell>
                    <PublisherAvatar publisher={row.publisher} />
                  </TableCell>
                  {hasDownloads && (
                    <TableCell
                      className="text-muted-foreground text-right font-mono text-xs tabular-nums"
                      title={downloadsTitle}
                    >
                      {formatDownloadCount(row.downloads)}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.isPrerelease && (
                        <Badge variant="outline" className="font-mono text-xs">
                          pre
                        </Badge>
                      )}
                      {row.deprecated && (
                        <span
                          className="text-destructive inline-flex items-center gap-1"
                          title={row.deprecated}
                        >
                          <TriangleAlert className="size-3.5" aria-hidden />
                          <span className="font-sans text-xs font-normal">
                            Deprecated
                          </span>
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      }

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground text-xs tabular-nums">
            {(pageStart + 1).toLocaleString()}–
            {Math.min(pageStart + PAGE_SIZE, filtered.length).toLocaleString()}{' '}
            of {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="text-muted-foreground px-2 text-xs tabular-nums">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {filtered.some(r => r.deprecated) && (
        <ul className="text-muted-foreground space-y-1 border-t pt-3 text-xs">
          {filtered
            .filter(r => r.deprecated)
            .slice(0, 5)
            .map(r => (
              <li key={`warn-${r.version}`} className="flex gap-2">
                <TriangleAlert
                  className="text-destructive mt-0.5 size-3.5 shrink-0"
                  aria-hidden
                />
                <span>
                  <span className="font-mono">{r.version}</span>: {r.deprecated}
                </span>
              </li>
            ))}
          {filtered.filter(r => r.deprecated).length > 5 && (
            <li>…and more deprecated versions hidden in the list above.</li>
          )}
        </ul>
      )}
    </div>
  )
}
