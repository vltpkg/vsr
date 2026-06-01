import { PackageSearch } from '@/components/package-search'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{
    q?: string
    sources?: string
    source?: string
    page?: string
  }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  return <PackageSearch basePath="/" {...params} />
}
