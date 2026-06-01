import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{
    q?: string
    sources?: string
    source?: string
    page?: string
  }>
}

export default async function PackagesRedirectPage({
  searchParams,
}: PageProps) {
  const { q, sources, source, page } = await searchParams
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (sources) params.set('sources', sources)
  if (source) params.set('source', source)
  if (page) params.set('page', page)
  const qs = params.toString()
  redirect(qs ? `/?${qs}` : '/')
}
