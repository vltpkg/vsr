'use client'

import Link from 'next/link'
import { KeyRound, ShieldCheck, Users } from 'lucide-react'

import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
        {user?.emailVerified && (
          <Badge variant="secondary">verified</Badge>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <KeyRound className="text-muted-foreground size-5" />
            <CardTitle>API keys</CardTitle>
            <CardDescription>
              Mint, list, and revoke api-keys with per-package scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/tokens">Manage tokens</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="text-muted-foreground size-5" />
            <CardTitle>Two-factor</CardTitle>
            <CardDescription>
              Enrol TOTP — required by some publish flows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/2fa">
                {(user as { twoFactorEnabled?: boolean | null } | undefined)
                  ?.twoFactorEnabled ?
                  'Manage'
                : 'Set up'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Users className="text-muted-foreground size-5" />
            <CardTitle>Collaborators</CardTitle>
            <CardDescription>
              Grant or revoke per-package access by username.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/packages">Open</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
