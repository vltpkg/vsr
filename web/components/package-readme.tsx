import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { markdownComponents } from '@/lib/markdown-components'

type Props = {
  readme: string
}

export function PackageReadme({ readme }: Props) {
  return (
    <article className="min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {readme}
      </ReactMarkdown>
    </article>
  )
}

export function PackageReadmeEmpty({
  message,
}: {
  message?: string
}) {
  return (
    <div className="border-border bg-muted/30 text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
      {message ?? 'No README available for this package yet.'}
    </div>
  )
}

export function PackageReadmeSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="bg-muted h-7 w-1/2 animate-pulse rounded" />
      <div className="bg-muted h-4 w-full animate-pulse rounded" />
      <div className="bg-muted h-4 w-11/12 animate-pulse rounded" />
      <div className="bg-muted h-4 w-10/12 animate-pulse rounded" />
      <div className="bg-muted mt-6 h-6 w-1/3 animate-pulse rounded" />
      <div className="bg-muted h-4 w-full animate-pulse rounded" />
      <div className="bg-muted h-4 w-9/12 animate-pulse rounded" />
    </div>
  )
}
