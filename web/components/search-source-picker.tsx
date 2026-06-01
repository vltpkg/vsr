'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  formatSourcesLabel,
  searchUrl,
} from '@/lib/package-search-params'
import type { SearchSourceOption } from '@/lib/vsr'
import { cn } from '@/lib/utils'

type Props = {
  sources: SearchSourceOption[]
  defaultSources: string[]
  selected: string[]
  query?: string
  /** Navigate on change (home page). When false, only calls onChange. */
  navigate?: boolean
  onChange?: (next: string[]) => void
  className?: string
}

export function SearchSourcePicker({
  sources,
  defaultSources,
  selected,
  query,
  navigate = false,
  onChange,
  className,
}: Props) {
  const router = useRouter()
  const label = formatSourcesLabel(selected, sources)

  function apply(next: string[]) {
    const normalized =
      next.length > 0 ? [...next].sort() : [...defaultSources]
    if (navigate) {
      router.push(
        searchUrl('/', {
          q: query || undefined,
          sources: normalized,
          defaultSources,
          page: 1,
        }),
      )
      return
    }
    onChange?.(normalized)
  }

  function toggle(id: string, checked: boolean) {
    const set = new Set(selected)
    if (checked) set.add(id)
    else set.delete(id)
    apply([...set])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-foreground h-7 shrink-0 gap-1 px-2 text-[11px] font-normal sm:text-xs',
            className,
          )}
        >
          <span className="max-w-[7rem] truncate sm:max-w-[9rem]">{label}</span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          Search sources
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sources.map(source => (
          <DropdownMenuCheckboxItem
            key={source.id}
            checked={selected.includes(source.id)}
            onCheckedChange={checked => toggle(source.id, checked === true)}
            onSelect={e => e.preventDefault()}
          >
            <span className="flex flex-col gap-0.5">
              <span>{source.label}</span>
              <span className="text-muted-foreground text-xs font-normal">
                {source.description}
              </span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => apply(sources.map(s => s.id))}
          >
            All
          </Button>
          {navigate ?
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              asChild
            >
              <Link
                href={searchUrl('/', {
                  q: query || undefined,
                  sources: defaultSources,
                  defaultSources,
                  page: 1,
                })}
              >
                Reset
              </Link>
            </Button>
          : <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => apply(defaultSources)}
            >
              Reset
            </Button>
          }
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
