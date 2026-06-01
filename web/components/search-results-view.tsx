'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { SearchResultsPagination } from '@/components/search-results-pagination'
import { SearchResultsTable } from '@/components/search-results-table'
import { cn } from '@/lib/utils'
import type { SearchResultObject } from '@/lib/vsr'

type Props = {
  basePath: string
  q: string
  sources: string[]
  defaultSources: string[]
  page: number
  totalPages: number
  total: number
  pageSize: number
  results: SearchResultObject[]
}

export function SearchResultsView({
  basePath,
  q,
  sources,
  defaultSources,
  page,
  totalPages,
  total,
  pageSize,
  results,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function navigate(href: string) {
    startTransition(() => router.push(href))
  }

  return (
    <div className="relative">
      <div
        className={cn(
          'transition-opacity duration-150',
          isPending && 'pointer-events-none opacity-50',
        )}
        aria-busy={isPending}
      >
        <SearchResultsTable results={results} />
        <SearchResultsPagination
          basePath={basePath}
          q={q}
          sources={sources}
          defaultSources={defaultSources}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          isPending={isPending}
          onNavigate={navigate}
        />
      </div>
      {isPending && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div className="bg-background/80 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm backdrop-blur">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-muted-foreground">Loading page…</span>
          </div>
        </div>
      )}
    </div>
  )
}
