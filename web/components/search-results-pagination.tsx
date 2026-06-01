'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

type Props = {
  basePath: string
  q: string
  sources: string[]
  defaultSources: string[]
  page: number
  totalPages: number
  total: number
  pageSize: number
  isPending?: boolean
  onNavigate?: (href: string) => void
}

export function SearchResultsPagination({
  basePath,
  q,
  sources,
  defaultSources,
  page,
  totalPages,
  total,
  pageSize,
  isPending = false,
  onNavigate,
}: Props) {
  const [pendingDirection, setPendingDirection] = useState<
    'prev' | 'next' | null
  >(null)
  const rangeStart = total > 0 ? (page - 1) * pageSize + 1 : 0
  const rangeEnd = Math.min(page * pageSize, total)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  function pageHref(nextPage: number) {
    const params = new URLSearchParams()
    params.set('q', q)
    if (sources.length > 0) {
      const normalized = [...sources].sort()
      const defaults = [...defaultSources].sort()
      if (normalized.join(',') !== defaults.join(',')) {
        params.set('sources', normalized.join(','))
      }
    }
    if (nextPage > 1) params.set('page', String(nextPage))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  if (!isPending && pendingDirection !== null) {
    setPendingDirection(null)
  }

  function handleNavigate(
    e: React.MouseEvent<HTMLAnchorElement>,
    direction: 'prev' | 'next',
    href: string,
  ) {
    if (!onNavigate) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    setPendingDirection(direction)
    onNavigate(href)
  }

  const showPrevSpinner = isPending && pendingDirection === 'prev'
  const showNextSpinner = isPending && pendingDirection === 'next'

  return (
    <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        {total > 0 ?
          <>
            Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{' '}
            {total.toLocaleString()} · Page {page} of {totalPages.toLocaleString()}
          </>
        : 'No results'}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild={hasPrev}
          disabled={!hasPrev || isPending}
        >
          {hasPrev ?
            <Link
              href={pageHref(page - 1)}
              prefetch={false}
              onClick={e => handleNavigate(e, 'prev', pageHref(page - 1))}
            >
              {showPrevSpinner && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Previous
            </Link>
          : 'Previous'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild={hasNext}
          disabled={!hasNext || isPending}
        >
          {hasNext ?
            <Link
              href={pageHref(page + 1)}
              prefetch={false}
              onClick={e => handleNavigate(e, 'next', pageHref(page + 1))}
            >
              {showNextSpinner && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Next
            </Link>
          : 'Next'}
        </Button>
      </div>
    </div>
  )
}
