import { renderDoc } from '@/lib/render-doc'

export const metadata = {
  title: 'Configuration — vsr',
  description:
    'Configure vsr for local development, deployment, and package-manager integration.',
}

export default async function ConfigurationPage() {
  return renderDoc('configuration')
}
