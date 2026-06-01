'use client'

import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'
import { apiKeyClient } from '@better-auth/api-key/client'

// Same-origin by default: Next.js rewrites `/-/*` to the registry
// worker (see `next.config.ts`), which keeps Better Auth cookies
// first-party and avoids credentialed CORS in the browser. Set
// `NEXT_PUBLIC_VSR_URL` only if you need to point the client at a
// different origin (e.g. an external registry deployment).
const VSR_URL = process.env.NEXT_PUBLIC_VSR_URL ?? ''

export const authClient = createAuthClient({
  baseURL: VSR_URL || undefined,
  basePath: '/-/auth',
  fetchOptions: { credentials: 'include' },
  plugins: [twoFactorClient(), apiKeyClient()],
})

export const { useSession, signIn, signUp, signOut } = authClient

export type Session = ReturnType<typeof useSession>['data']
