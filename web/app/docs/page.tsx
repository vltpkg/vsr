import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { docsNav } from '@/lib/docs-nav'

export const metadata = {
  title: 'Docs — vsr',
  description:
    'Guides and reference for the vlt serverless registry.',
}

export default function DocsPage() {
  return (
    <div className="relative left-1/2 -ml-[50vw] w-screen px-4">
      <div className="mx-auto max-w-4xl space-y-10 py-2">
        <header className="space-y-3">
          <div className="bg-muted text-foreground/70 inline-flex size-10 items-center justify-center rounded-lg">
            <BookOpen className="size-5" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Documentation
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
            Guides for running, configuring, and deploying vsr. The
            API reference is generated live from your running registry
            — what you see is exactly what your deployment serves.
          </p>
        </header>

        {docsNav.map(section => (
          <section key={section.title} className="space-y-4">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              {section.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group focus-visible:outline-none"
                >
                  <Card className="hover:border-foreground/20 h-full transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        {item.title}
                        <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </CardTitle>
                      {item.description && (
                        <CardDescription>
                          {item.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
