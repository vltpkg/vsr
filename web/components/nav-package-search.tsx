'use client'

import { Search } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { SearchSourcePicker } from '@/components/search-source-picker'
import { Button } from '@/components/ui/button'
import { parseSourcesParam } from '@/lib/package-search-params'
import type { SearchSourceOption } from '@/lib/vsr'

type Props = {
  sources: SearchSourceOption[]
  defaultSources: string[]
}

export function NavPackageSearch({ sources, defaultSources }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onSearchPage = pathname === '/'
  const q = onSearchPage ? (searchParams.get('q') ?? '') : ''

  const knownIds = useMemo(
    () => new Set(sources.map(s => s.id)),
    [sources],
  )

  const urlSources = onSearchPage ?
    parseSourcesParam(
      searchParams.get('sources') ?? undefined,
      knownIds,
      defaultSources,
    )
  : defaultSources

  const [localSources, setLocalSources] = useState(defaultSources)
  const selected = onSearchPage ? urlSources : localSources

  return (
    <form action="/" method="get" className="flex w-full min-w-0 items-center gap-2">
      <div className="border-input flex h-9 min-w-0 flex-1 items-center rounded-md border bg-transparent shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
        <Search className="text-muted-foreground pointer-events-none ml-2.5 size-4 shrink-0" />
        <input
          key={`${pathname}-${q}`}
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search packages…"
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-1.5 text-sm outline-none"
          aria-label="Search packages"
        />
        <div className="border-border shrink-0 border-l">
          <SearchSourcePicker
            sources={sources}
            defaultSources={defaultSources}
            selected={selected}
            query={q}
            navigate={onSearchPage}
            onChange={setLocalSources}
          />
        </div>
        <input type="hidden" name="sources" value={selected.join(',')} />
      </div>
      <Button type="submit" size="sm" className="h-9 shrink-0 px-4">
        Search
      </Button>
    </form>
  )
}
