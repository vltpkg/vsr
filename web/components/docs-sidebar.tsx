'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { docsNav } from '@/lib/docs-nav'
import { cn } from '@/lib/utils'

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-20 space-y-6 text-sm">
        {docsNav.map(section => (
          <div key={section.title}>
            <p className="text-foreground mb-2 font-medium">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map(item => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/docs' &&
                    pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'hover:text-foreground block rounded-md px-2 py-1.5 transition-colors',
                        active
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
