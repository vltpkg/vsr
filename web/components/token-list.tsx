'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  type ApiKeyView,
  type CreateTokenResponse,
  type TokenScope,
  createToken,
  listTokens,
  revokeToken,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

export function TokenList() {
  const [keys, setKeys] = useState<ApiKeyView[]>([])
  const [loading, setLoading] = useState(true)
  const [created, setCreated] = useState<CreateTokenResponse | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const { objects } = await listTokens()
      setKeys(objects)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleRevoke = async (key: ApiKeyView) => {
    if (!confirm(`Revoke "${key.name ?? key.key}"? This cannot be undone.`))
      return
    try {
      await revokeToken(key.key)
      toast.success('Token revoked')
      setKeys(prev => prev.filter(k => k.key !== key.key))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API keys</CardTitle>
              <CardDescription>
                These work as <code className="font-mono">Bearer</code>{' '}
                tokens for the npm CLI. Raw values are never recoverable —
                copy them on creation.
              </CardDescription>
            </div>
            <CreateTokenDialog
              onCreated={result => {
                setCreated(result)
                void reload()
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ?
            <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading keys…
            </div>
          : keys.length === 0 ?
            <div className="text-muted-foreground px-6 py-12 text-center text-sm">
              No api-keys yet. Click <strong>New token</strong> to mint one.
            </div>
          : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(k => (
                  <TableRow key={k.key}>
                    <TableCell className="font-medium">
                      {k.name ?? '(unnamed)'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {k.token}
                    </TableCell>
                    <TableCell>
                      <ScopeBadges scope={k.scope} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(k.created).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => void handleRevoke(k)}
                          >
                            <Trash2 className="size-4" /> Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>

      <NewTokenDialog
        token={created}
        onClose={() => setCreated(null)}
      />
    </>
  )
}

function ScopeBadges({ scope }: { scope: TokenScope[] }) {
  if (!scope || scope.length === 0) {
    return <span className="text-muted-foreground text-xs">none</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {scope.flatMap((s, i) =>
        s.values.flatMap(v =>
          (['pkg', 'user'] as const)
            .filter(t => s.types[t])
            .map(t => {
              const perm = s.types[t]!
              const verb =
                perm.write ? 'rw'
                : perm.read ? 'r'
                : '·'
              return (
                <Badge
                  key={`${i}:${t}:${v}`}
                  variant="outline"
                  className="font-mono text-[10px]"
                >
                  {t}:{v} <span className="text-muted-foreground">{verb}</span>
                </Badge>
              )
            }),
        ),
      )}
    </div>
  )
}

// ---------------------------------------------------------
// Create dialog
// ---------------------------------------------------------

type ScopeRow = {
  value: string
  pkg: 'none' | 'read' | 'read-write'
}

function CreateTokenDialog({
  onCreated,
}: {
  onCreated: (token: CreateTokenResponse) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [rows, setRows] = useState<ScopeRow[]>([
    { value: '*', pkg: 'read' },
  ])
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setRows([{ value: '*', pkg: 'read' }])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const scope: TokenScope[] = rows
        .filter(r => r.value.trim() && r.pkg !== 'none')
        .map(r => ({
          values: [r.value.trim()],
          types: {
            pkg: {
              read: true,
              write: r.pkg === 'read-write',
            },
          },
        }))

      const result = await createToken({
        name: name.trim() || undefined,
        scope: scope.length > 0 ? scope : undefined,
      })
      setOpen(false)
      reset()
      onCreated(result)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New token
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Mint api-key</DialogTitle>
            <DialogDescription>
              The plaintext value is displayed once — copy it before
              closing the next dialog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="token-name">Name</Label>
            <Input
              id="token-name"
              placeholder="ci-publisher"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Package scopes</Label>
            <p className="text-muted-foreground text-xs">
              Use <code className="font-mono">*</code> for everything, or a
              package name like <code className="font-mono">@my-org/pkg</code>.
            </p>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={row.value}
                    onChange={e =>
                      setRows(prev =>
                        prev.map((r, j) =>
                          j === i ? { ...r, value: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="*"
                  />
                  <select
                    className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-xs"
                    value={row.pkg}
                    onChange={e =>
                      setRows(prev =>
                        prev.map((r, j) =>
                          j === i ?
                            { ...r, pkg: e.target.value as ScopeRow['pkg'] }
                          : r,
                        ),
                      )
                    }
                  >
                    <option value="read">read</option>
                    <option value="read-write">read + write</option>
                    <option value="none">(none)</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setRows(prev => prev.filter((_, j) => j !== i))
                    }
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRows(prev => [...prev, { value: '', pkg: 'read' }])
                }
              >
                <Plus className="size-4" /> Add scope
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ?
                <>
                  <Loader2 className="size-4 animate-spin" /> Minting…
                </>
              : <>
                  <KeyRound className="size-4" /> Mint
                </>
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------
// "Mint once" reveal dialog
// ---------------------------------------------------------

function NewTokenDialog({
  token,
  onClose,
}: {
  token: CreateTokenResponse | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const open = Boolean(token)

  async function copy() {
    if (!token) return
    await navigator.clipboard.writeText(token.token)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token created</DialogTitle>
          <DialogDescription>
            This is the only time the plaintext key will be shown. Save
            it now.
          </DialogDescription>
        </DialogHeader>
        <code className="bg-muted block rounded-md p-3 font-mono text-sm break-all">
          {token?.token}
        </code>
        <DialogFooter>
          <Button variant="outline" onClick={copy}>
            {copied ?
              <>
                <Check className="size-4" /> Copied
              </>
            : <>
                <Copy className="size-4" /> Copy
              </>
            }
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
