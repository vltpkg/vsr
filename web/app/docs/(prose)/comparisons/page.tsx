import { renderDoc } from '@/lib/render-doc'

export const metadata = {
  title: 'Comparisons — vsr',
  description:
    'How vsr compares to npm, GitHub Packages, Verdaccio, JSR, and other registries.',
}

export default async function ComparisonsPage() {
  return renderDoc('comparisons')
}
