export type DocsNavItem = {
  title: string
  href: string
  description?: string
}

export type DocsNavSection = {
  title: string
  items: DocsNavItem[]
}

/** Sidebar + landing-page navigation for `/docs`. */
export const docsNav: DocsNavSection[] = [
  {
    title: 'Guides',
    items: [
      {
        title: 'Getting started',
        href: '/docs/getting-started',
        description:
          'Run vsr locally, sign up, and publish your first package.',
      },
      {
        title: 'Configuration',
        href: '/docs/configuration',
        description: 'CLI flags, vlt.json, and package-manager integration.',
      },
      {
        title: 'Deployment',
        href: '/docs/deploy',
        description: 'Deploy the registry worker to Cloudflare.',
      },
      {
        title: 'Tokens & scopes',
        href: '/docs/tokens',
        description: 'API keys, granular permissions, and common personas.',
      },
    ],
  },
  {
    title: 'Reference',
    items: [
      {
        title: 'API reference',
        href: '/docs/api',
        description: 'Live OpenAPI docs generated from the registry.',
      },
      {
        title: 'Comparisons',
        href: '/docs/comparisons',
        description: 'How vsr stacks up against other registries.',
      },
    ],
  },
]

export const allDocsPages = docsNav.flatMap(s => s.items)
