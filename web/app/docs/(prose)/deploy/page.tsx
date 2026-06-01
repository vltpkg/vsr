import { renderDoc } from '@/lib/render-doc'

export const metadata = {
  title: 'Deployment — vsr',
  description:
    'Deploy the vsr registry worker to Cloudflare using the vsr deploy command.',
}

export default async function DeployPage() {
  return renderDoc('deploy')
}
