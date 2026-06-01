'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { useSession } from '@/lib/auth-client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`)
    }
  }, [isPending, session, router, pathname])

  if (isPending) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        Loading…
      </div>
    )
  }

  if (!session?.user) {
    // While the redirect lands.
    return null
  }

  return <div className="space-y-6">{children}</div>
}
