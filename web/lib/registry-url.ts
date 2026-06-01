/**
 * npm CLI registry URL (the worker), not the web UI origin.
 * Used in install instructions for packages published to this registry.
 */
export const REGISTRY_URL =
  process.env.NEXT_PUBLIC_REGISTRY_URL ??
  process.env.VSR_ORIGIN ??
  'http://localhost:1337'

/** Upstream npm proxy route on this registry (`/npm`). */
export const NPM_PROXY_REGISTRY_URL = `${REGISTRY_URL.replace(/\/$/, '')}/npm`
