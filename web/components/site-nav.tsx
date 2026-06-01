'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Package, KeyRound, UserRound } from 'lucide-react'
import { Suspense } from 'react'

import { NavPackageSearch } from '@/components/nav-package-search'
import { useSession, signOut } from '@/lib/auth-client'
import type { SearchSourceOption } from '@/lib/vsr'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NavLink = { href: string; label: string; authed?: boolean }

const links: NavLink[] = [
  { href: '/', label: 'Packages' },
  { href: '/docs', label: 'Docs' },
  { href: '/dashboard', label: 'Dashboard', authed: true },
  { href: '/dashboard/tokens', label: 'Tokens', authed: true },
]

export function SiteNav({
  searchSources,
  defaultSources,
}: {
  searchSources: SearchSourceOption[]
  defaultSources: string[]
}) {
  const pathname = usePathname()
  const { data: session, isPending } = useSession()

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <div className="flex shrink-0 items-center gap-4 lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Package className="size-4" />
            <span className="hidden sm:inline">vsr</span>
          </Link>
          <nav className="hidden gap-4 text-sm lg:flex">
            {links
              .filter(l => !l.authed || session?.user)
              .map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-muted-foreground hover:text-foreground transition-colors',
                    (link.href === '/' ?
                      pathname === '/' || pathname.startsWith('/packages')
                    : pathname.startsWith(link.href)) &&
                      'text-foreground font-medium',
                  )}
                >
                  {link.label}
                </Link>
              ))}
          </nav>
        </div>

        <div className="mx-auto min-w-0 w-full max-w-2xl flex-1">
          <Suspense fallback={<div className="bg-muted h-9 w-full max-w-xl animate-pulse rounded-md" />}>
            <NavPackageSearch
              sources={searchSources}
              defaultSources={defaultSources}
            />
          </Suspense>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isPending ?
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          : session?.user ?
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserRound className="size-4" />
                  <span className="hidden sm:inline">
                    {session.user.name || session.user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-muted-foreground">
                  {session.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <UserRound className="size-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/tokens">
                    <KeyRound className="size-4" /> Tokens
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => void signOut()}
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          : <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </>
          }
        </div>
      </div>
    </header>
  )
}
