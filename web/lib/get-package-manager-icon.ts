import type { LucideIcon } from 'lucide-react'

import { Bun, Deno, Npm, Pnpm, Vlt, Yarn } from '@/components/icons'
import type { PackageManagerId } from '@/lib/install-commands'

/** Package manager icons — same set as https://benchmarks.vlt.sh */
const iconMap: Record<PackageManagerId, LucideIcon> = {
  vlt: Vlt,
  npm: Npm,
  pnpm: Pnpm,
  yarn: Yarn,
  bun: Bun,
  deno: Deno,
}

export function getPackageManagerIcon(
  id: PackageManagerId,
): LucideIcon {
  return iconMap[id]
}
