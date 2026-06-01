/**
 * Minimal POSIX tar extractor for Cloudflare Workers.
 *
 * - Decompresses gzip via the native `DecompressionStream` (no node:zlib needed).
 * - Hand-rolled tar header parser (we only care about file name + size for
 *   regular files; everything else is skipped).
 * - Caller passes a predicate so we can stop reading as soon as every wanted
 *   file has been collected, which keeps memory usage proportional to the
 *   files we actually need rather than the whole tarball.
 */

const BLOCK_SIZE = 512
const HEADER_NAME_OFFSET = 0
const HEADER_NAME_LENGTH = 100
const HEADER_SIZE_OFFSET = 124
const HEADER_SIZE_LENGTH = 12
const HEADER_TYPEFLAG_OFFSET = 156
const HEADER_PREFIX_OFFSET = 345
const HEADER_PREFIX_LENGTH = 155

/** Returned files keyed by their in-archive path (e.g. `package/README.md`). */
export type ExtractedFiles = Map<
  string,
  { bytes: Uint8Array; text: string }
>

export type WantedPredicate = (entryName: string) => boolean

/**
 * Decompress a gzipped tarball and yield file contents for entries matching
 * `wanted`. Stops reading once `wanted(name)` returns true for some entry and
 * `stopWhen` (if provided) signals completion.
 */
export async function extractFilesFromTgz(
  buf: ArrayBuffer | Uint8Array,
  wanted: WantedPredicate,
  opts: { stopWhen?: (files: ExtractedFiles) => boolean } = {},
): Promise<ExtractedFiles> {
  const tar = await gunzip(buf)
  const files: ExtractedFiles = new Map()

  let offset = 0
  while (offset + BLOCK_SIZE <= tar.byteLength) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE)
    if (isZeroBlock(header)) break

    const name = readName(header)
    const size = readSize(header)
    const typeFlag = String.fromCharCode(
      header[HEADER_TYPEFLAG_OFFSET] ?? 0,
    )

    const dataStart = offset + BLOCK_SIZE
    const dataEnd = dataStart + size
    const padded = Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE

    // Regular files have typeflag '0' or '\0'. Skip everything else
    // (directories, symlinks, longlink extensions, etc.).
    const isRegular = typeFlag === '0' || typeFlag === '\0'

    if (isRegular && name && wanted(name) && dataEnd <= tar.byteLength) {
      const bytes = tar.subarray(dataStart, dataEnd)
      files.set(name, {
        bytes,
        text: new TextDecoder('utf-8', { fatal: false }).decode(bytes),
      })
      if (opts.stopWhen?.(files)) break
    }

    offset = dataStart + padded
  }

  return files
}

async function gunzip(
  input: ArrayBuffer | Uint8Array,
): Promise<Uint8Array> {
  const source =
    input instanceof Uint8Array ?
      new Blob([input as BlobPart])
    : new Blob([input as BlobPart])
  const stream = source
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  const decompressed = await new Response(stream).arrayBuffer()
  return new Uint8Array(decompressed)
}

function isZeroBlock(block: Uint8Array): boolean {
  for (let i = 0; i < block.length; i++) {
    if (block[i] !== 0) return false
  }
  return true
}

function readName(header: Uint8Array): string {
  const name = readCString(
    header,
    HEADER_NAME_OFFSET,
    HEADER_NAME_LENGTH,
  )
  const prefix = readCString(
    header,
    HEADER_PREFIX_OFFSET,
    HEADER_PREFIX_LENGTH,
  )
  if (!prefix) return name
  return `${prefix}/${name}`
}

function readCString(
  block: Uint8Array,
  offset: number,
  length: number,
): string {
  let end = offset
  const max = offset + length
  while (end < max && block[end] !== 0) end++
  return new TextDecoder('utf-8').decode(block.subarray(offset, end))
}

function readSize(header: Uint8Array): number {
  // Standard POSIX tar stores size as a NUL-terminated octal ASCII string.
  // Some implementations (rare for npm) use the GNU base-256 extension where
  // the high bit of the first byte is set; we handle both.
  const first = header[HEADER_SIZE_OFFSET] ?? 0
  if ((first & 0x80) !== 0) {
    let value = 0
    for (
      let i = HEADER_SIZE_OFFSET;
      i < HEADER_SIZE_OFFSET + HEADER_SIZE_LENGTH;
      i++
    ) {
      value = value * 256 + ((header[i] ?? 0) & 0xff)
    }
    return value
  }

  const text = readCString(
    header,
    HEADER_SIZE_OFFSET,
    HEADER_SIZE_LENGTH,
  ).trim()
  if (!text) return 0
  const parsed = parseInt(text, 8)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Pick the best README file from a set of extracted entries. Prefers `.md`
 * / `.markdown` over extensionless `README`, and the shortest path (root-most)
 * when multiple candidates exist.
 */
export function pickReadme(
  files: ExtractedFiles,
): { filename: string; text: string } | null {
  const candidates: { name: string; text: string; rank: number }[] = []
  for (const [name, entry] of files) {
    const base = name.split('/').pop() ?? ''
    if (!/^readme($|\.)/i.test(base)) continue
    const ext = (base.split('.').pop() ?? '').toLowerCase()
    const rank =
      ext === 'md' || ext === 'markdown' ? 0
      : ext === base.toLowerCase() ? 2
      : 1
    candidates.push({ name, text: entry.text, rank })
  }
  if (candidates.length === 0) return null
  candidates.sort(
    (a, b) => a.rank - b.rank || a.name.length - b.name.length,
  )
  const best = candidates[0]!
  return { filename: best.name, text: best.text }
}

/**
 * Matcher for the common files we care about pulling out of an npm tarball.
 * npm tarballs use a `package/` prefix on every entry.
 */
export function isLikelyReadmePath(name: string): boolean {
  const base = name.split('/').pop() ?? ''
  return /^readme($|\.)/i.test(base)
}
