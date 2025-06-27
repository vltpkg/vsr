// =============================================================================
// VLT Serverless Registry - Consolidated TypeScript Types
// =============================================================================

import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

// =============================================================================
// Database Types
// =============================================================================

export interface Package {
  name: string
  tags: string // JSON string containing Record<string, string>
  lastUpdated?: string
  origin: 'local' | 'upstream'
  upstream?: string
  cachedAt?: string
}

export interface ParsedPackage {
  name: string
  tags: Record<string, string>
  lastUpdated?: string
  origin?: 'local' | 'upstream'
  upstream?: string
  cachedAt?: string
}

export interface Version {
  spec: string
  manifest: string // JSON string containing PackageManifest
  publishedAt?: string
  origin: 'local' | 'upstream'
  upstream?: string
  cachedAt?: string
}

export interface ParsedVersion {
  spec: string
  manifest: PackageManifest
  publishedAt?: string
  origin?: 'local' | 'upstream'
  upstream?: string
  cachedAt?: string
}

export interface Token {
  token: string
  uuid: string
  scope: string // JSON string containing TokenScope[]
}

export interface ParsedToken {
  token: string
  uuid: string
  scope: TokenScope[]
}

// =============================================================================
// Authentication & Authorization Types
// =============================================================================

export interface TokenScope {
  values: string[]
  types: {
    pkg?: { read: boolean; write: boolean }
    user?: { read: boolean; write: boolean }
  }
}

export interface TokenAccess {
  anyUser: boolean
  specificUser: boolean
  anyPackage: boolean
  specificPackage: boolean
  readAccess: boolean
  writeAccess: boolean
  methods: string[]
}

export interface AuthUser {
  uuid: string | null
  scope: TokenScope[] | null
  token: string
}

// =============================================================================
// Package & Manifest Types
// =============================================================================

export interface PackageManifest {
  name: string
  version: string
  description?: string
  main?: string
  module?: string
  types?: string
  bin?: Record<string, string> | string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  engines?: Record<string, string>
  os?: string[]
  cpu?: string[]
  keywords?: string[]
  author?: string | { name: string; email?: string; url?: string }
  contributors?: Array<string | { name: string; email?: string; url?: string }>
  license?: string
  repository?: string | { type: string; url: string; directory?: string }
  bugs?: string | { url: string; email?: string }
  homepage?: string
  files?: string[]
  publishConfig?: Record<string, any>
  dist?: {
    tarball: string
    shasum?: string
    integrity?: string
    fileCount?: number
    unpackedSize?: number
  }
  _id?: string
  _rev?: string
  _attachments?: Record<string, any>
  [key: string]: any // Allow additional properties
}

export interface SlimmedManifest {
  name: string
  version: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  bin?: Record<string, string> | string
  engines?: Record<string, string>
  dist: {
    tarball: string
  }
}

export interface Packument {
  name: string
  'dist-tags': Record<string, string>
  versions: Record<string, SlimmedManifest>
  time: Record<string, string> & {
    modified: string
  }
}

export interface PackageSpec {
  name?: string
  pkg?: string
  scope?: string
}

// =============================================================================
// Upstream & Configuration Types
// =============================================================================

export interface UpstreamConfig {
  type: 'local' | 'npm' | 'vsr' | 'jsr'
  url: string
  allowPublish?: boolean
}

export interface OriginConfig {
  default: string
  upstreams: Record<string, UpstreamConfig>
}

export interface ParsedPackageInfo {
  upstream?: string
  packageName: string
  version?: string
  segments: string[]
}

// =============================================================================
// Cache Types
// =============================================================================

export interface CacheOptions {
  packumentTtlMinutes?: number
  manifestTtlMinutes?: number
  staleWhileRevalidateMinutes?: number
  forceRefresh?: boolean
  upstream?: string
}

export interface CacheResult<T> {
  data?: T
  package?: T  // For package cache results
  version?: T  // For version cache results
  fromCache: boolean
  stale?: boolean
}

export interface CacheValidation {
  valid: boolean
  stale: boolean
  data: any
}

export interface QueueMessage {
  type: 'package_refresh' | 'version_refresh'
  packageName?: string
  spec?: string
  upstream: string
  timestamp: number
  options: {
    packumentTtlMinutes?: number
    manifestTtlMinutes?: number
    upstream?: string
  }
}

// =============================================================================
// Request Context Types
// =============================================================================

export interface RequestContext {
  protocol?: string
  host?: string
  upstream?: string
}

export interface DatabaseOperations {
  // Package operations
  getPackage(name: string): Promise<ParsedPackage | null>
  upsertPackage(name: string, tags: Record<string, string>, lastUpdated?: string): Promise<any>
  upsertCachedPackage(name: string, tags: Record<string, string>, upstream: string, lastUpdated?: string): Promise<any>
  getCachedPackage(name: string): Promise<ParsedPackage | null>
  isPackageCacheValid(name: string, ttlMinutes?: number): Promise<boolean>

  // Token operations
  getToken(token: string): Promise<ParsedToken | null>
  validateTokenAccess(authToken: string, targetUuid: string): Promise<boolean>
  upsertToken(token: string, uuid: string, scope: TokenScope[], authToken?: string): Promise<any>
  deleteToken(token: string, authToken?: string): Promise<any>

  // Version operations
  getVersion(spec: string): Promise<ParsedVersion | null>
  upsertVersion(spec: string, manifest: PackageManifest, publishedAt: string): Promise<any>
  upsertCachedVersion(spec: string, manifest: PackageManifest, upstream: string, publishedAt: string): Promise<any>
  getCachedVersion(spec: string): Promise<ParsedVersion | null>
  isVersionCacheValid(spec: string, ttlMinutes?: number): Promise<boolean>

  // Search operations
  searchPackages(query: string, scope?: string): Promise<any[]>
  getVersionsByPackage(packageName: string): Promise<ParsedVersion[]>
}

export interface HonoContext extends Context {
  db: DatabaseOperations
  env: {
    CACHE_REFRESH_QUEUE?: any
    [key: string]: any
  }
  waitUntil?: (promise: Promise<any>) => void
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiError {
  error: string
  message?: string
  details?: any
}

export interface TokenCreateRequest {
  uuid?: string
  scope: TokenScope[]
}

export interface TokenCreateResponse {
  token: string
  uuid: string
  scope: TokenScope[]
}

export interface AccessRequest {
  username: string
  permission: 'read-only' | 'read-write'
}

export interface AccessResponse {
  name: string
  collaborators: Record<string, 'read-only' | 'read-write'>
}

// =============================================================================
// Utility Types
// =============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

export interface FileInfo {
  path: string
  content: Uint8Array | string
  size: number
}

// =============================================================================
// Constants Types
// =============================================================================

export interface CookieOptions {
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
}

export interface ApiDocsConfig {
  metaData: {
    title: string
  }
  hideModels: boolean
  hideDownloadButton: boolean
  darkMode: boolean
  favicon: string
  defaultHttpClient: {
    targetKey: string
    clientKey: string
  }
  authentication: {
    http: {
      bearer: { token: string }
      basic: { username: string; password: string }
    }
  }
  hiddenClients: Record<string, boolean | string[]>
  spec: {
    content: any
  }
  customCss: string
}

// =============================================================================
// Authentication Provider Types (WorkOS)
// =============================================================================

export interface WorkOSUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  profilePictureUrl?: string
  createdAt: string
  updatedAt: string
}

export interface WorkOSAuthResponse {
  authenticated: boolean
  sessionId?: string
  organizationId?: string
  role?: string
  permissions?: string[]
  user?: WorkOSUser
  reason?: string
}

export interface WorkOSAuthResult {
  user: WorkOSUser
  sealedSession: string
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchResult {
  name: string
  version?: string
  description?: string
  keywords?: string[]
  lastUpdated?: string
  homepage?: string
  repository?: string
  bugs?: string
  author?: string
  publisher?: string
  maintainers?: string[]
}

export interface SearchResponse {
  objects: Array<{
    package: {
      name: string
      scope: string
      version: string
      description: string
      keywords: string[]
      date: string
      links: {
        npm: string
        homepage?: string
        repository?: string
        bugs?: string
      }
      author?: string
      publisher?: string
      maintainers: string[]
    }
    score: {
      final: number
      detail: {
        quality: number
        popularity: number
        maintenance: number
      }
    }
    searchScore: number
  }>
  total: number
  time: string
}

// =============================================================================
// Environment Types
// =============================================================================

export interface Environment {
  D1_DATABASE?: D1Database
  CACHE_REFRESH_QUEUE?: any
  WORKOS_API_KEY?: string
  WORKOS_CLIENT_ID?: string
  WORKOS_PROVIDER?: string
  WORKOS_REDIRECT_URI?: string
  WORKOS_COOKIE_PASSWORD?: string
  CF?: {
    connecting_ip?: string
  }
  [key: string]: any
}
