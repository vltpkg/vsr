import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { markdownComponents } from '@/lib/markdown-components'

const DOCS_DIR = join(process.cwd(), 'content/docs')

export async function renderDoc(slug: string) {
  const path = join(DOCS_DIR, `${slug}.md`)
  const source = await readFile(path, 'utf8')
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {source}
    </ReactMarkdown>
  )
}
