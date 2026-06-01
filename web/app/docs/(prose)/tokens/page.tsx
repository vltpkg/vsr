import { renderDoc } from '@/lib/render-doc'

export const metadata = {
  title: 'Tokens & scopes — vsr',
  description:
    'API keys, granular permissions, and common access personas for vsr.',
}

export default async function TokensPage() {
  return renderDoc('tokens')
}
