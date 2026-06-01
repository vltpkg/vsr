'use client'

import Link from 'next/link'
import { use } from 'react'

import { CollaboratorManager } from '@/components/collaborator-manager'

type PageProps = {
  params: Promise<{ name: string }>
}

export default function PackageCollaboratorsPage({ params }: PageProps) {
  const { name: raw } = use(params)
  const pkg = decodeURIComponent(raw)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/dashboard/packages"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to packages
        </Link>
        <h1 className="font-mono text-3xl font-semibold tracking-tight">
          {pkg}
        </h1>
        <p className="text-muted-foreground text-sm">
          Per-package collaborator access.
        </p>
      </header>

      <CollaboratorManager pkg={pkg} />
    </div>
  )
}
