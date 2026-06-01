'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  type AccessResponse,
  getPackageAccess,
  grantPackageAccess,
  revokePackageAccess,
} from '@/lib/vsr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function CollaboratorManager({ pkg }: { pkg: string }) {
  const [access, setAccess] = useState<AccessResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [permission, setPermission] =
    useState<'read-only' | 'read-write'>('read-only')
  const [submitting, setSubmitting] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setAccess(await getPackageAccess(pkg))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [pkg])

  useEffect(() => {
    void reload()
  }, [reload])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) return
    setSubmitting(true)
    try {
      const next = await grantPackageAccess(
        pkg,
        username.trim(),
        permission,
      )
      setAccess(next)
      setUsername('')
      toast.success(`Granted ${permission} to ${username}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function revoke(user: string) {
    if (!confirm(`Revoke access for ${user}?`)) return
    try {
      const next = await revokePackageAccess(pkg, user)
      setAccess(next)
      toast.success(`Revoked ${user}`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const entries = access ? Object.entries(access.collaborators) : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add collaborator</CardTitle>
          <CardDescription>
            Grants the chosen permission across every api-key that user
            owns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="alex"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="permission">Permission</Label>
              <select
                id="permission"
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-xs"
                value={permission}
                onChange={e =>
                  setPermission(
                    e.target.value as 'read-only' | 'read-write',
                  )
                }
              >
                <option value="read-only">read-only</option>
                <option value="read-write">read-write</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting}>
                {submitting ?
                  <Loader2 className="size-4 animate-spin" />
                : <Plus className="size-4" />}
                Grant
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current collaborators</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ?
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          : entries.length === 0 ?
            <p className="text-muted-foreground px-6 py-12 text-center text-sm">
              No collaborators yet.
            </p>
          : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User id</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(([user, perm]) => (
                  <TableRow key={user}>
                    <TableCell className="font-mono text-xs">
                      {user}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          perm === 'read-write' ? 'default' : 'secondary'
                        }
                      >
                        {perm}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Revoke ${user}`}
                        onClick={() => void revoke(user)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>
    </div>
  )
}
