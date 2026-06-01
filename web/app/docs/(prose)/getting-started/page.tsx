import { renderDoc } from '@/lib/render-doc'

export const metadata = {
  title: 'Getting started — vsr',
  description:
    'Run vsr locally, sign up, and point npm or vlt at your registry.',
}

export default async function GettingStartedPage() {
  return renderDoc('getting-started')
}
