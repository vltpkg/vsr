'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getPackageManagerIcon } from '@/lib/get-package-manager-icon'
import {
  PACKAGE_MANAGERS,
  type PackageManagerId,
} from '@/lib/install-commands'
import {
  getRegistrySetupBlocks,
  getRegistrySetupIntro,
  type RegistrySetupMode,
} from '@/lib/registry-setup-commands'
import type { SearchSourceOption } from '@/lib/vsr'
import { cn } from '@/lib/utils'

type Props = {
  upstreams: SearchSourceOption[]
}

const MODES: { id: RegistrySetupMode; label: string; hint: string }[] = [
  {
    id: 'local',
    label: 'This registry',
    hint: 'Publish to and install from your private/local instance',
  },
  {
    id: 'proxy',
    label: 'Upstream proxy',
    hint: 'Install from a public registry through this instance',
  },
]

export function RegistrySetupGuide({ upstreams }: Props) {
  const proxySources = useMemo(
    () => upstreams.filter(s => s.kind === 'upstream'),
    [upstreams],
  )
  const defaultUpstream = proxySources.find(s => s.id === 'npm')?.id
    ?? proxySources[0]?.id
    ?? 'npm'

  const [mode, setMode] = useState<RegistrySetupMode>('local')
  const [upstream, setUpstream] = useState(defaultUpstream)
  const [activePm, setActivePm] = useState<PackageManagerId>('vlt')

  const activeUpstream = mode === 'proxy' ? upstream : undefined
  const blocks = getRegistrySetupBlocks({
    mode,
    packageManager: activePm,
    upstream: activeUpstream,
  })
  const intro = getRegistrySetupIntro(mode, activeUpstream)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Quick setup</CardTitle>
          <CardDescription>
            Get started publishing to this registry or consuming packages
            through configured upstream proxies — like GitHub&apos;s repo setup
            instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            role="tablist"
            aria-label="Registry mode"
            className="bg-muted/40 flex flex-wrap gap-1 rounded-lg border p-1"
          >
            {MODES.map(m => {
              const selected = mode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'flex min-w-0 flex-1 flex-col items-start rounded-md px-3 py-2 text-left text-sm transition-colors sm:flex-none sm:min-w-[12rem]',
                    selected ?
                      'bg-background text-foreground shadow-xs ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                  )}
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {m.hint}
                  </span>
                </button>
              )
            })}
          </div>

          {mode === 'proxy' && proxySources.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Upstream:</span>
              {proxySources.map(s => {
                const active = upstream === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setUpstream(s.id)}
                    className={cn(
                      'inline-flex items-center rounded-md border px-3 py-1 text-sm transition-colors',
                      active ?
                        'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:border-foreground/20',
                    )}
                  >
                    {s.label}
                    <Badge
                      variant={active ? 'secondary' : 'outline'}
                      className="ml-2 font-mono text-xs"
                    >
                      {s.type}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}

          {mode === 'proxy' && proxySources.length === 1 && (
            <p className="text-muted-foreground text-sm">
              Proxy route:{' '}
              <code className="font-mono text-xs">/{proxySources[0]!.id}</code>{' '}
              → {proxySources[0]!.description.replace(/^Search /, '')}
            </p>
          )}

          {mode === 'proxy' && proxySources.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No upstream proxies are configured on this instance. Add upstreams
              to your registry config to enable proxied installs.
            </p>
          )}

          <p className="text-muted-foreground text-sm">{intro}</p>

          <div
            role="tablist"
            aria-label="Package manager"
            className="bg-muted/40 flex flex-wrap gap-1 rounded-lg border p-1"
          >
            {PACKAGE_MANAGERS.map(pm => {
              const selected = activePm === pm.id
              const Icon = getPackageManagerIcon(pm.id)
              return (
                <button
                  key={pm.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={pm.label}
                  title={pm.label}
                  onClick={() => setActivePm(pm.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    selected ?
                      'bg-background text-foreground shadow-xs ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">{pm.label}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-4">
            {blocks.map(block => (
              <div key={block.title} className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium">{block.title}</h3>
                  {block.description && (
                    <p className="text-muted-foreground text-xs">
                      {block.description}
                    </p>
                  )}
                </div>
                <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {block.command}
                </pre>
              </div>
            ))}
          </div>

          {mode === 'local' && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground text-sm">
                Need an API token?{' '}
                <Button asChild variant="link" className="h-auto p-0 text-sm">
                  <Link href="/sign-in">Sign in</Link>
                </Button>{' '}
                and create one from{' '}
                <Button asChild variant="link" className="h-auto p-0 text-sm">
                  <Link href="/dashboard/tokens">Tokens</Link>
                </Button>
                . For local development, run{' '}
                <code className="font-mono text-xs">vlr db:seed</code> to mint
                an admin key.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        Or search above for a package by name — local index and configured
        upstreams are searched together.
      </p>
    </div>
  )
}
