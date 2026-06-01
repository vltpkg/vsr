import Link from 'next/link'

import { ApiReference } from '@/components/api-reference'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'API reference — vsr',
  description:
    'Live OpenAPI reference for the running vlt serverless registry.',
}

// The spec is fetched from the registry at request time so route
// edits or redeploys show up immediately. Prerendering would require
// the registry to be up during `next build` — fine in CI, but a
// surprising failure mode for first-run `vlx -y` users — so we opt
// out of static rendering entirely.
export const dynamic = 'force-dynamic'

async function fetchSpec(): Promise<Record<string, unknown> | null> {
  const origin = process.env.VSR_ORIGIN ?? 'http://localhost:1337'
  const url = `${origin}/-/api`
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch (err) {
    console.error(`Failed to load OpenAPI spec from ${url}`, err)
    return null
  }
}

function UnreachableState() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        API reference unavailable
      </h1>
      <p className="text-muted-foreground">
        The registry didn't respond to a request for its OpenAPI spec
        (
        <code className="bg-muted rounded px-1 py-0.5 text-xs">
          /-/api
        </code>
        ). It may not be running, or the web app is configured to
        talk to a different origin.
      </p>
      <div className="text-muted-foreground text-sm">
        <p>Try:</p>
        <ul className="mx-auto mt-2 inline-block space-y-1 text-left">
          <li>
            • Running{' '}
            <code className="bg-muted rounded px-1">vsr</code> (or
            <code className="bg-muted rounded px-1">vlx -y @vltpkg/vsr</code>
            )
          </li>
          <li>
            • Checking{' '}
            <code className="bg-muted rounded px-1">VSR_ORIGIN</code>{' '}
            in the web app's environment
          </li>
        </ul>
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <Button asChild variant="outline">
          <Link href="/docs">Back to docs</Link>
        </Button>
      </div>
    </div>
  )
}

export default async function ApiReferencePage() {
  const spec = await fetchSpec()
  if (!spec) return <UnreachableState />

  // Break out of the parent `<main class="max-w-6xl">` so Scalar gets
  // the full viewport for its sidebar + content layout.
  return (
    <div className="relative left-1/2 -ml-[50vw] w-screen">
      <ApiReference spec={spec} />
    </div>
  )
}
