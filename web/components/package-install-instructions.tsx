'use client'

import { Check, Copy, Info } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { getPackageManagerIcon } from '@/lib/get-package-manager-icon'
import {
  getInstallCommand,
  getInstallHint,
  PACKAGE_MANAGERS,
  type PackageManagerId,
  type PackageSource,
} from '@/lib/install-commands'
import { cn } from '@/lib/utils'

type Props = {
  name: string
  source: PackageSource
  upstream?: string
  version?: string
}

export function PackageInstallInstructions({
  name,
  source,
  upstream = 'npm',
  version,
}: Props) {
  const isNpm = source === 'npm'
  const [active, setActive] = useState<PackageManagerId>('vlt')
  const command = getInstallCommand({
    name,
    source,
    packageManager: active,
    version,
  })

  const hint = getInstallHint(source, upstream)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
    } catch {}
  }

  return (
    <section className="overflow-hidden rounded-lg border">
      <div
        role="tablist"
        aria-label="Package manager"
        className="bg-muted/40 border-border flex flex-wrap items-center gap-1 border-b p-1"
      >
        {PACKAGE_MANAGERS.map(pm => {
          const selected = active === pm.id
          const Icon = getPackageManagerIcon(pm.id)
          return (
            <button
              key={pm.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={pm.label}
              title={pm.label}
              onClick={() => setActive(pm.id)}
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
        <div className="ml-auto flex items-center gap-2 pr-2 pl-1">
          <Badge
            variant={isNpm ? 'outline' : 'secondary'}
            className="text-xs"
          >
            {isNpm ? `${upstream} (proxied)` : 'This registry'}
          </Badge>
          <button
            type="button"
            title={hint}
            aria-label={hint}
            className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors"
          >
            <Info className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 text-zinc-100 dark:bg-zinc-900">
        <div className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm">
          <span
            aria-hidden
            className="text-zinc-500 select-none"
          >
            $
          </span>
          <code className="flex-1 break-all whitespace-pre-wrap">
            {command}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied' : 'Copy to clipboard'}
            aria-label={copied ? 'Copied' : 'Copy to clipboard'}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            {copied ?
              <Check className="size-4" aria-hidden />
            : <Copy className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
    </section>
  )
}
