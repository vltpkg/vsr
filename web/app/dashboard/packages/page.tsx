'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function CollaboratorsLandingPage() {
  const router = useRouter()
  const [name, setName] = useState('')

  function open(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    router.push(
      `/dashboard/packages/${encodeURIComponent(name.trim())}/collaborators`,
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Package access
        </h1>
        <p className="text-muted-foreground text-sm">
          Grant or revoke per-package read/read-write access by username.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Open a package</CardTitle>
          <CardDescription>
            Enter the full name (e.g.{' '}
            <code className="font-mono">@vltpkg/vsr</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={open} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                placeholder="@scope/name"
                className="pl-9 font-mono"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <Button type="submit">Open</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
