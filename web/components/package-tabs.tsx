'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

type Tab = {
  id: string
  label: string
  /** Path suffix relative to the package base, e.g. '' for overview, 'versions'. */
  segment: string
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', segment: '' },
  { id: 'versions', label: 'Versions', segment: 'versions' },
]

type Props = {
  /** Base href for the package, e.g. `/packages/lodash` or `/packages/@scope/pkg`. */
  basePath: string
}

export function PackageTabs({ basePath }: Props) {
  const pathname = usePathname()
  const normalizedBase = basePath.replace(/\/$/, '')

  return (
    <nav
      aria-label="Package sections"
      className="border-border flex items-center gap-1 border-b"
    >
      {TABS.map(tab => {
        const href =
          tab.segment ? `${normalizedBase}/${tab.segment}` : normalizedBase
        const active =
          tab.segment ?
            pathname === href || pathname.startsWith(`${href}/`)
          : pathname === normalizedBase
        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative inline-flex items-center px-3 py-2 text-sm transition-colors',
              active ?
                'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span
              aria-hidden
              className={cn(
                'absolute right-0 -bottom-px left-0 h-[2px]',
                active ? 'bg-foreground' : 'bg-transparent',
              )}
            />
          </Link>
        )
      })}
    </nav>
  )
}
