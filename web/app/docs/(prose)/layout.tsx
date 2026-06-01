import { DocsSidebar } from '@/components/docs-sidebar'

/**
 * Shared shell for prose MDX pages. Breaks out of the root layout's
 * `max-w-6xl` constraint so the sidebar + article can breathe.
 */
export default function DocsProseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative left-1/2 -ml-[50vw] w-screen px-4">
      <div className="mx-auto flex max-w-7xl gap-10 py-2 lg:gap-12">
        <DocsSidebar />
        <article className="min-w-0 flex-1 pb-12">{children}</article>
      </div>
    </div>
  )
}
