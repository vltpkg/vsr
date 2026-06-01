import { RegistrySetupGuide } from '@/components/registry-setup-guide'
import { SearchResultsView } from '@/components/search-results-view'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FALLBACK_DEFAULT_SOURCES,
  FALLBACK_SEARCH_SOURCES,
  PACKAGE_SEARCH_PAGE_SIZE,
  parsePage,
  parseSourcesParam,
  sourceDescription,
} from '@/lib/package-search-params'
import { getSearchSources, searchPackages } from '@/lib/vsr'

type Props = {
  basePath?: string
  q?: string
  sources?: string
  source?: string
  page?: string
}

export async function PackageSearch({
  basePath = '/',
  q = '',
  sources: rawSources,
  source: legacySource,
  page: rawPage,
}: Props) {
  let searchSources = FALLBACK_SEARCH_SOURCES
  let defaultSources = FALLBACK_DEFAULT_SOURCES
  try {
    const config = await getSearchSources()
    if (config.sources.length > 0) {
      searchSources = config.sources
      defaultSources = config.defaultSources
    }
  } catch {
    /* use fallbacks */
  }

  const knownIds = new Set(searchSources.map(s => s.id))
  const legacyAsSources =
    legacySource === 'local' ? 'local'
    : legacySource === 'npm' ? 'npm'
    : legacySource === 'all' ? defaultSources.join(',')
    : undefined

  const selectedSources = parseSourcesParam(
    rawSources ?? legacyAsSources,
    knownIds,
    defaultSources,
  )

  const trimmed = q.trim()
  const page = parsePage(rawPage)
  const sourcesHint = sourceDescription(selectedSources, searchSources)

  let results: Awaited<ReturnType<typeof searchPackages>> | null = null
  let error: string | null = null
  if (trimmed) {
    try {
      results = await searchPackages(trimmed, {
        sources: selectedSources,
        page,
        size: PACKAGE_SEARCH_PAGE_SIZE,
      })
    } catch (e) {
      error = (e as Error).message
    }
  }

  const totalPages =
    results ?
      Math.max(1, Math.ceil(results.total / PACKAGE_SEARCH_PAGE_SIZE))
    : 1

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Packages</h1>
        <p className="text-muted-foreground text-sm">
          {trimmed ?
            <>
              Search across your configured registries. Upstream hits are cached
              in the background so the next search (and install) is local.
              {sourcesHint && (
                <>
                  {' '}
                  <span className="text-muted-foreground/80">{sourcesHint}</span>
                </>
              )}
            </>
          : 'Search the header bar or use the setup guide below to configure your package manager.'}
        </p>
      </header>

      {!trimmed ?
        <RegistrySetupGuide upstreams={searchSources} />
      : error ?
        <Card>
          <CardHeader>
            <CardTitle>Couldn&apos;t reach the registry</CardTitle>
            <CardDescription className="font-mono text-xs">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      : results && results.total > 0 ?
        <Card>
          <CardHeader>
            <CardTitle>
              {results.total.toLocaleString()} result
              {results.total === 1 ? '' : 's'}
            </CardTitle>
            <CardDescription>
              Results for &ldquo;{trimmed}&rdquo;
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <SearchResultsView
              basePath={basePath}
              q={trimmed}
              sources={selectedSources}
              defaultSources={defaultSources}
              page={page}
              totalPages={totalPages}
              total={results.total}
              pageSize={PACKAGE_SEARCH_PAGE_SIZE}
              results={results.objects}
            />
          </CardContent>
        </Card>
      : <Card>
          <CardHeader>
            <CardTitle>No matches</CardTitle>
            <CardDescription>
              Nothing matched &ldquo;{trimmed}&rdquo; in the selected sources.
              Try widening the source filter in the header dropdown.
            </CardDescription>
          </CardHeader>
        </Card>
      }
    </div>
  )
}
