import { describe, expect, it } from 'vitest'

import {
  extractFilesFromTgz,
  isLikelyReadmePath,
  pickReadme,
  type ExtractedFiles,
} from '../../src/utils/tarball.ts'

/**
 * Build a single 512-byte tar header.
 * Only sets fields we actually read in the parser: name, size, typeflag.
 */
function makeTarHeader(name: string, size: number, typeflag = '0') {
  const block = new Uint8Array(512)
  const enc = new TextEncoder()
  block.set(enc.encode(name).slice(0, 100), 0)
  const octalSize = size.toString(8).padStart(11, '0') + '\0'
  block.set(enc.encode(octalSize), 124)
  block.set(enc.encode(typeflag), 156)
  return block
}

function buildTar(
  entries: { name: string; data: string; typeflag?: string }[],
) {
  const chunks: Uint8Array[] = []
  const enc = new TextEncoder()
  for (const entry of entries) {
    const data = enc.encode(entry.data)
    chunks.push(makeTarHeader(entry.name, data.length, entry.typeflag))
    chunks.push(data)
    const pad = (512 - (data.length % 512)) % 512
    if (pad) chunks.push(new Uint8Array(pad))
  }
  chunks.push(new Uint8Array(1024))

  let total = 0
  for (const c of chunks) total += c.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

async function gzip(input: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([input as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

describe('extractFilesFromTgz', () => {
  it('extracts wanted files from a gzipped tarball', async () => {
    const tar = buildTar([
      { name: 'package/package.json', data: '{"name":"x"}' },
      { name: 'package/README.md', data: '# Hello' },
      { name: 'package/index.js', data: 'module.exports = 1' },
    ])
    const tgz = await gzip(tar)

    const files = await extractFilesFromTgz(tgz, name =>
      name.endsWith('README.md'),
    )

    expect(files.size).toBe(1)
    expect(files.get('package/README.md')?.text).toBe('# Hello')
  })

  it('stops early via stopWhen predicate', async () => {
    const tar = buildTar([
      { name: 'package/README.md', data: '# A' },
      { name: 'package/HUGE.bin', data: 'x'.repeat(2048) },
    ])
    const tgz = await gzip(tar)

    const files = await extractFilesFromTgz(
      tgz,
      () => true,
      { stopWhen: (f: ExtractedFiles) => f.size >= 1 },
    )

    expect(files.size).toBe(1)
    expect(files.get('package/README.md')?.text).toBe('# A')
  })

  it('skips non-regular entries', async () => {
    const tar = buildTar([
      { name: 'package/', data: '', typeflag: '5' },
      { name: 'package/README.md', data: 'real' },
    ])
    const tgz = await gzip(tar)

    const files = await extractFilesFromTgz(tgz, () => true)
    expect(files.has('package/')).toBe(false)
    expect(files.get('package/README.md')?.text).toBe('real')
  })
})

describe('pickReadme', () => {
  function fileMap(
    entries: Record<string, string>,
  ): ExtractedFiles {
    const map: ExtractedFiles = new Map()
    const enc = new TextEncoder()
    for (const [name, text] of Object.entries(entries)) {
      map.set(name, { text, bytes: enc.encode(text) })
    }
    return map
  }

  it('returns null when no readme present', () => {
    expect(pickReadme(fileMap({ 'package/index.js': '' }))).toBeNull()
  })

  it('prefers .md over plain README', () => {
    const pick = pickReadme(
      fileMap({
        'package/README': 'plain',
        'package/README.md': 'markdown',
      }),
    )
    expect(pick?.filename).toBe('package/README.md')
    expect(pick?.text).toBe('markdown')
  })

  it('prefers root-most readme on ties', () => {
    const pick = pickReadme(
      fileMap({
        'package/nested/README.md': 'nested',
        'package/README.md': 'root',
      }),
    )
    expect(pick?.filename).toBe('package/README.md')
  })

  it('case-insensitive match', () => {
    const pick = pickReadme(
      fileMap({ 'package/readme.markdown': 'hi' }),
    )
    expect(pick?.filename).toBe('package/readme.markdown')
  })
})

describe('isLikelyReadmePath', () => {
  it('matches readme variants', () => {
    expect(isLikelyReadmePath('package/README.md')).toBe(true)
    expect(isLikelyReadmePath('package/readme')).toBe(true)
    expect(isLikelyReadmePath('package/Readme.markdown')).toBe(true)
  })

  it('rejects non-readme files', () => {
    expect(isLikelyReadmePath('package/index.js')).toBe(false)
    expect(isLikelyReadmePath('package/READMEISH.md')).toBe(false)
    expect(isLikelyReadmePath('package/README2.md')).toBe(false)
  })
})
