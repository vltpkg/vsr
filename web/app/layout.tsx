import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { SiteNav } from '@/components/site-nav'
import { Toaster } from '@/components/ui/sonner'
import {
  FALLBACK_DEFAULT_SOURCES,
  FALLBACK_SEARCH_SOURCES,
} from '@/lib/package-search-params'
import { getSearchSources } from '@/lib/vsr'

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'vsr — vlt serverless registry',
  description:
    'A modern, npm-compatible serverless registry. Browse packages, manage tokens, and configure access.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let searchSources = FALLBACK_SEARCH_SOURCES
  let defaultSources = FALLBACK_DEFAULT_SOURCES
  try {
    const config = await getSearchSources()
    if (config.sources.length > 0) {
      searchSources = config.sources
      defaultSources = config.defaultSources
    }
  } catch {
    /* registry may be offline during static build */
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} bg-background text-foreground min-h-screen font-sans antialiased`}
      >
        <SiteNav
          searchSources={searchSources}
          defaultSources={defaultSources}
        />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  )
}
