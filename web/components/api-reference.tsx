'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

type Props = {
  /** OpenAPI spec object fetched server-side from the registry. */
  spec: Record<string, unknown>
}

/**
 * Thin client wrapper around `@scalar/api-reference-react` so server
 * components can fetch the spec once and pass it in. We avoid Scalar's
 * own fetch-by-URL path because the URL would be `/-/api` (relative)
 * in the browser, which means a second client round-trip; rendering
 * from a pre-fetched payload skips that.
 */
export function ApiReference({ spec }: Props) {
  return (
    <ApiReferenceReact
      configuration={{
        spec: { content: spec },
        // Match the rest of the web UI; Scalar reads the `dark` class
        // from <html> via CSS vars when this is set.
        darkMode: false,
        // Hide the Scalar download button — the spec is one click away
        // at `/-/api` and we don't need duplicate UX.
        hideDownloadButton: false,
        hideClientButton: false,
        // Default servers list — overridden by what's in the spec.
        servers: undefined,
      }}
    />
  )
}
