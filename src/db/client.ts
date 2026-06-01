import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { sql, eq, and } from 'drizzle-orm'
import * as schema from './schema.ts'
import type {
  ParsedPackage,
  ParsedVersion,
  TokenScope,
} from '../../types.ts'

const fallbackLogger = {
  error: (_message: string, _error?: unknown) => {
    // eslint-disable-next-line no-console
    console.error(_message, _error)
  },
  info: (_message: string) => {
    // eslint-disable-next-line no-console
    console.info(_message)
  },
}

export type Database = ReturnType<typeof drizzle<typeof schema>>

export function createDatabase(d1: D1Database): Database {
  return drizzle(d1, { schema })
}

export function parseJSON(value: string | null): any {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch (_e) {
    // Log to monitoring system instead of console
    return null
  }
}

export function stringifyJSON(value: unknown): string {
  return JSON.stringify(value)
}

export function createDatabaseOperations(
  d1: D1Database,
  logger = fallbackLogger,
) {
  const db = createDatabase(d1)

  return {
    async getPackage(name: string): Promise<ParsedPackage | null> {
      try {
        const result = await db
          .select()
          .from(schema.packages)
          .where(sql`name = ${name}`)
          .get()
        if (!result) return null
        return {
          name: result.name,
          tags: parseJSON(result.tags) as Record<string, string>,
          lastUpdated: result.lastUpdated || null,
          origin: result.origin || null,
          upstream: result.upstream || null,
          cachedAt: result.cachedAt || null,
        } as ParsedPackage
      } catch (_error) {
        logger.error(
          `[DB ERROR] Failed to get package ${name}`,
          _error,
        )
        return null
      }
    },

    async upsertPackage(
      name: string,
      tags: Record<string, string>,
      lastUpdated?: string,
    ) {
      try {
        const result = await db
          .insert(schema.packages)
          .values({
            name,
            tags: stringifyJSON(tags),
            lastUpdated: lastUpdated || new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.packages.name,
            set: {
              tags: stringifyJSON(tags),
              lastUpdated: lastUpdated || new Date().toISOString(),
            },
          })
        return result
      } catch (_error: unknown) {
        logger.error(
          `[DB ERROR] Failed to upsert package ${name}`,
          _error,
        )
        return null
      }
    },

    async upsertCachedPackage(
      name: string,
      tags: Record<string, string>,
      upstream: string,
      lastUpdated?: string,
    ) {
      try {
        const result = await db
          .insert(schema.packages)
          .values({
            name,
            tags: stringifyJSON(tags),
            lastUpdated: lastUpdated || new Date().toISOString(),
            origin: 'upstream',
            upstream,
            cachedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.packages.name,
            set: {
              tags: stringifyJSON(tags),
              lastUpdated: lastUpdated || new Date().toISOString(),
              cachedAt: new Date().toISOString(),
            },
          })
        // Log to monitoring system instead of console
        return result
      } catch (_error: unknown) {
        logger.error(
          `[DB ERROR] Failed to upsert cached package ${name}`,
          _error,
        )
        return null
      }
    },

    async getCachedPackage(name: string) {
      try {
        const result = await db
          .select()
          .from(schema.packages)
          .where(sql`name = ${name}`)
          .get()
        if (!result) return null
        return {
          name: result.name,
          tags: parseJSON(result.tags) as Record<string, string>,
          lastUpdated: result.lastUpdated || null,
          origin: result.origin || null,
          upstream: result.upstream || null,
          cachedAt: result.cachedAt || null,
        }
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to get cached package ${name}`,
          error,
        )
        return null
      }
    },

    async isPackageCacheValid(name: string, ttlMinutes = 5) {
      try {
        const pkg = await this.getCachedPackage(name)
        if (!pkg?.cachedAt || pkg.origin !== 'upstream') {
          return false
        }

        const cacheTime = new Date(pkg.cachedAt).getTime()
        const now = new Date().getTime()
        const ttlMs = ttlMinutes * 60 * 1000

        return now - cacheTime < ttlMs
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to check cache validity for ${name}`,
          error,
        )
        return false
      }
    },

    // ---------------------------------------------------------
    // API key + token scope operations
    // ---------------------------------------------------------

    /**
     * Look up every `token_scopes` row for the given api-key id.
     * Returns rows shaped like the legacy `TokenScope[]` for
     * compatibility with `parseTokenAccess`.
     */
    async getScopesForKey(apiKeyId: string): Promise<TokenScope[]> {
      try {
        const rows = await db
          .select()
          .from(schema.tokenScopes)
          .where(eq(schema.tokenScopes.apiKeyId, apiKeyId))
          .all()

        // Re-shape into the legacy `[{ values, types }]` structure so
        // existing scope-evaluation code (parseTokenAccess) keeps
        // working unchanged. One TokenScope per row.
        return rows.map(row => ({
          values: [row.value],
          types: {
            [row.target]: {
              read: !!row.read,
              write: !!row.write,
            },
          },
        })) as TokenScope[]
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to get scopes for api-key ${apiKeyId}`,
          error,
        )
        return []
      }
    },

    /**
     * Replace every scope row for the given api-key id in one go.
     * Rows whose `read` and `write` are both false are dropped.
     */
    async replaceScopesForKey(
      apiKeyId: string,
      scopes: TokenScope[],
    ) {
      const flat: {
        id: string
        apiKeyId: string
        target: 'pkg' | 'user'
        value: string
        read: boolean
        write: boolean
      }[] = []

      for (const s of scopes) {
        for (const value of s.values) {
          for (const target of ['pkg', 'user'] as const) {
            const t = s.types[target]
            if (!t) continue
            if (!t.read && !t.write) continue
            flat.push({
              id: crypto.randomUUID(),
              apiKeyId,
              target,
              value,
              read: !!t.read,
              write: !!t.write,
            })
          }
        }
      }

      await db
        .delete(schema.tokenScopes)
        .where(eq(schema.tokenScopes.apiKeyId, apiKeyId))
        .run()

      if (flat.length > 0) {
        await db.insert(schema.tokenScopes).values(flat).run()
      }
    },

    /**
     * Append a single scope row without touching the others.
     */
    async addScopeForKey(
      apiKeyId: string,
      scope: {
        target: 'pkg' | 'user'
        value: string
        read?: boolean
        write?: boolean
      },
    ) {
      await db
        .insert(schema.tokenScopes)
        .values({
          id: crypto.randomUUID(),
          apiKeyId,
          target: scope.target,
          value: scope.value,
          read: !!scope.read,
          write: !!scope.write,
        })
        .run()
    },

    /**
     * Remove scope rows matching the (target, value) pair from a
     * specific key (or every key when `apiKeyId` is omitted).
     */
    async removeScopeRows(
      apiKeyId: string | null,
      target: 'pkg' | 'user',
      value: string,
    ) {
      const conds = [
        eq(schema.tokenScopes.target, target),
        eq(schema.tokenScopes.value, value),
      ]
      if (apiKeyId) {
        conds.push(eq(schema.tokenScopes.apiKeyId, apiKeyId))
      }
      await db
        .delete(schema.tokenScopes)
        .where(and(...conds))
        .run()
    },

    /**
     * List every api-key for a given user (by `referenceId`).
     */
    async getKeysForUser(userId: string) {
      return db
        .select()
        .from(schema.apikey)
        .where(eq(schema.apikey.referenceId, userId))
        .all()
    },

    /**
     * Resolve a user (referenceId) by their `name` on the `user`
     * table. Used by the access routes which still target users by
     * the npm-style username.
     */
    async getUserIdByName(name: string): Promise<string | null> {
      const row = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.name, name))
        .get()
      return row?.id ?? null
    },

    /**
     * Aggregate the (target, value, read|write) tuples for every
     * api-key currently in the database. Used by access listing.
     */
    async listAllScopes() {
      return db
        .select({
          apiKeyId: schema.tokenScopes.apiKeyId,
          target: schema.tokenScopes.target,
          value: schema.tokenScopes.value,
          read: schema.tokenScopes.read,
          write: schema.tokenScopes.write,
          referenceId: schema.apikey.referenceId,
        })
        .from(schema.tokenScopes)
        .innerJoin(
          schema.apikey,
          eq(schema.tokenScopes.apiKeyId, schema.apikey.id),
        )
        .all()
    },

    // Version operations
    async getVersion(spec: string): Promise<ParsedVersion | null> {
      try {
        const result = await db
          .select()
          .from(schema.versions)
          .where(sql`spec = ${spec}`)
          .get()
        if (!result) return null
        return {
          spec: result.spec,
          version: result.spec.split('@')[1] ?? '',
          manifest: parseJSON(result.manifest) as Record<string, any>,
          published_at: result.publishedAt || null,
          origin: result.origin || null,
          upstream: result.upstream || null,
          cachedAt: result.cachedAt || null,
        } as ParsedVersion
      } catch (_error: unknown) {
        logger.error(
          `[DB ERROR] Failed to get version ${spec}`,
          _error,
        )
        return null
      }
    },

    async upsertVersion(
      spec: string,
      manifest: Record<string, any>,
      publishedAt: string,
    ) {
      try {
        // Attempting to upsert version: ${spec}
        // Make sure manifest is an object
        if (typeof manifest !== 'object') {
          // Invalid manifest for ${spec}, received: ${typeof manifest}
          manifest = {
            name: spec.split('@')[0],
            version: spec.split('@').slice(1).join('@'),
          }
        }

        const result = await db
          .insert(schema.versions)
          .values({
            spec,
            manifest: stringifyJSON(manifest),
            publishedAt,
          })
          .onConflictDoUpdate({
            target: schema.versions.spec,
            set: {
              manifest: stringifyJSON(manifest),
              publishedAt,
            },
          })
        // Successfully upserted version: ${spec}
        return result
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to upsert version ${spec}`,
          error,
        )
        return { success: true } // Mock successful operation
      }
    },

    async upsertCachedVersion(
      spec: string,
      manifest: Record<string, any>,
      upstream: string,
      publishedAt: string,
    ) {
      try {
        // Attempting to upsert cached version: ${spec} from upstream: ${upstream}

        // Make sure manifest is an object
        if (typeof manifest !== 'object') {
          // Invalid manifest for ${spec}, received: ${typeof manifest}
          manifest = {
            name: spec.split('@')[0],
            version: spec.split('@').slice(1).join('@'),
          }
        }

        const result = await db
          .insert(schema.versions)
          .values({
            spec,
            manifest: stringifyJSON(manifest),
            publishedAt,
            origin: 'upstream',
            upstream,
            cachedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.versions.spec,
            set: {
              manifest: stringifyJSON(manifest),
              cachedAt: new Date().toISOString(),
            },
          })
        // Successfully upserted cached version: ${spec}
        return result
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to upsert cached version ${spec}`,
          error,
        )
        return { success: true }
      }
    },

    async getCachedVersion(spec: string) {
      try {
        // Attempting to get cached version: ${spec}
        const result = await db
          .select()
          .from(schema.versions)
          .where(sql`spec = ${spec}`)
          .get()
        if (!result) return null

        // Extract version from spec, handling scoped packages correctly
        let version
        const lastAtIndex = result.spec.lastIndexOf('@')
        if (lastAtIndex > 0) {
          version = result.spec.substring(lastAtIndex + 1)
        } else {
          // Fallback: assume everything after first @ is version
          version = result.spec.split('@').slice(1).join('@')
        }

        return {
          spec: result.spec,
          version,
          manifest: parseJSON(result.manifest) as Record<string, any>,
          published_at: result.publishedAt || null,
          origin: result.origin || null,
          upstream: result.upstream || null,
          cachedAt: result.cachedAt || null,
        }
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to get cached version ${spec}`,
          error,
        )
        return null
      }
    },

    async isVersionCacheValid(spec: string, ttlMinutes = 525600) {
      // Default 1 year for manifests
      try {
        const version = await this.getCachedVersion(spec)
        if (!version?.cachedAt || version.origin !== 'upstream') {
          return false
        }

        const cacheTime = new Date(version.cachedAt).getTime()
        const now = new Date().getTime()
        const ttlMs = ttlMinutes * 60 * 1000

        return now - cacheTime < ttlMs
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to check version cache validity for ${spec}`,
          error,
        )
        return false
      }
    },

    // Search operations
    async searchPackages(query: string, scope?: string) {
      const results = await db
        .select()
        .from(schema.packages)
        .where(
          scope ?
            sql`name LIKE ${`${scope}/%`} AND name LIKE ${`%${query}%`}`
          : sql`name LIKE ${`%${query}%`}`,
        )
        .all()

      return results.map(result => ({
        name: result.name,
        tags: parseJSON(result.tags) as Record<string, string>,
        origin: result.origin || null,
        upstream: result.upstream || null,
      }))
    },

    // Get all versions for a specific package
    async getVersionsByPackage(
      packageName: string,
    ): Promise<ParsedVersion[]> {
      try {
        // Retrieving all versions for package: ${packageName}
        const results = await db
          .select()
          .from(schema.versions)
          .where(sql`spec LIKE ${`${packageName}@%`}`)
          .all()

        if (results.length === 0) {
          // No versions found for package: ${packageName}
          return []
        }

        return results.map(result => {
          const manifest = parseJSON(result.manifest) as Record<
            string,
            any
          >

          // Extract version from spec, handling scoped packages correctly
          // For "@scope/package@version" -> extract "version"
          // For "package@version" -> extract "version"
          let version
          const lastAtIndex = result.spec.lastIndexOf('@')
          if (lastAtIndex > 0) {
            version = result.spec.substring(lastAtIndex + 1)
          } else {
            // Fallback: assume everything after first @ is version
            version = result.spec.split('@').slice(1).join('@')
          }

          return {
            spec: result.spec,
            version,
            manifest,
            published_at: result.publishedAt || null,
            origin: result.origin || null,
            upstream: result.upstream || null,
            cachedAt: result.cachedAt || null,
          } as ParsedVersion
        })
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to get versions for package ${packageName}`,
          error,
        )
        return [] // Return empty array on error
      }
    },

    async getVersionDownloadsFetchedAt(
      packageName: string,
      period: string,
    ): Promise<string | null> {
      try {
        const row = await db
          .select({ fetchedAt: schema.versionDownloads.fetchedAt })
          .from(schema.versionDownloads)
          .where(
            sql`package_name = ${packageName} AND period = ${period}`,
          )
          .orderBy(sql`fetched_at DESC`)
          .limit(1)
          .get()
        return row?.fetchedAt ?? null
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to read download snapshot time for ${packageName}`,
          error,
        )
        return null
      }
    },

    async getVersionDownloadsSnapshot(
      packageName: string,
      period: string,
    ): Promise<{
      fetchedAt: string
      byVersion: Record<string, number>
    } | null> {
      try {
        const rows = await db
          .select()
          .from(schema.versionDownloads)
          .where(
            sql`package_name = ${packageName} AND period = ${period}`,
          )
          .all()

        if (rows.length === 0) return null

        const byVersion: Record<string, number> = {}
        let fetchedAt = rows[0]?.fetchedAt ?? ''
        for (const row of rows) {
          byVersion[row.version] = row.downloads
          if (row.fetchedAt > fetchedAt) fetchedAt = row.fetchedAt
        }

        return { fetchedAt, byVersion }
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to read download snapshot for ${packageName}`,
          error,
        )
        return null
      }
    },

    async replaceVersionDownloads(
      packageName: string,
      period: string,
      fetchedAt: string,
      byVersion: Record<string, number>,
    ) {
      try {
        await db
          .delete(schema.versionDownloads)
          .where(
            sql`package_name = ${packageName} AND period = ${period}`,
          )

        const entries = Object.entries(byVersion)
        if (entries.length === 0) return

        await db.insert(schema.versionDownloads).values(
          entries.map(([version, downloads]) => ({
            packageName,
            version,
            period,
            downloads,
            fetchedAt,
          })),
        )
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to replace download snapshot for ${packageName}`,
          error,
        )
      }
    },

    async getPackageReadme(spec: string) {
      try {
        const row = await db
          .select()
          .from(schema.packageReadmes)
          .where(eq(schema.packageReadmes.spec, spec))
          .get()
        if (!row) return null
        return {
          spec: row.spec,
          readme: row.readme,
          filename: row.filename,
          extractedAt: row.extractedAt,
        }
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to read cached README for ${spec}`,
          error,
        )
        return null
      }
    },

    async upsertPackageReadme(
      spec: string,
      readme: string,
      filename: string,
      extractedAt: string,
    ) {
      try {
        await db
          .insert(schema.packageReadmes)
          .values({ spec, readme, filename, extractedAt })
          .onConflictDoUpdate({
            target: schema.packageReadmes.spec,
            set: { readme, filename, extractedAt },
          })
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to upsert cached README for ${spec}`,
          error,
        )
      }
    },
  }
}
