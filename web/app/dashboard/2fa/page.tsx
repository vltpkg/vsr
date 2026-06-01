'use client'

import { Check, Copy, ShieldCheck, ShieldOff } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { authClient, useSession } from '@/lib/auth-client'
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

type EnableStep = 'idle' | 'verify'

/**
 * Snapshot returned by Better Auth when starting TOTP enrolment. The user
 * keeps this in front of them until they enter the matching authenticator
 * code; once verified, the same backup codes never surface again (they're
 * hashed server-side), so we expose copy/download UX here.
 */
type EnrollmentSnapshot = {
  totpURI: string
  backupCodes: string[]
}

export default function TwoFactorPage() {
  const { data: session, refetch } = useSession()
  const user = session?.user
  const enabled = Boolean(
    (user as { twoFactorEnabled?: boolean | null } | undefined)
      ?.twoFactorEnabled,
  )

  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState<EnableStep>('idle')
  const [enrollment, setEnrollment] = useState<EnrollmentSnapshot | null>(null)
  const [code, setCode] = useState('')

  // Reset the local enrolment state if the session toggles enabled — for
  // example after a fresh disable from another tab.
  useEffect(() => {
    if (enabled) {
      setStep('idle')
      setEnrollment(null)
      setCode('')
    }
  }, [enabled])

  async function onEnable(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await authClient.twoFactor.enable({ password })
    setPending(false)
    if (res.error) {
      toast.error(res.error.message ?? 'Could not start enrolment')
      return
    }
    if (!res.data?.totpURI) {
      toast.error('Server returned no TOTP URI')
      return
    }
    setEnrollment({
      totpURI: res.data.totpURI,
      backupCodes: (res.data.backupCodes as string[] | undefined) ?? [],
    })
    setStep('verify')
    setPassword('')
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await authClient.twoFactor.verifyTotp({ code })
    setPending(false)
    if (res.error) {
      toast.error(res.error.message ?? 'Invalid code')
      return
    }
    toast.success('Two-factor enabled')
    setStep('idle')
    setEnrollment(null)
    setCode('')
    refetch()
  }

  async function onDisable(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await authClient.twoFactor.disable({ password })
    setPending(false)
    if (res.error) {
      toast.error(res.error.message ?? 'Could not disable 2FA')
      return
    }
    toast.success('Two-factor disabled')
    setPassword('')
    refetch()
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Two-factor</h1>
          <Badge variant={enabled ? 'secondary' : 'outline'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Adds a TOTP step after your password. Some publish flows require it.
        </p>
      </header>

      {enabled ?
        <DisableCard
          pending={pending}
          password={password}
          setPassword={setPassword}
          onSubmit={onDisable}
        />
      : step === 'idle' ?
        <EnableStartCard
          pending={pending}
          password={password}
          setPassword={setPassword}
          onSubmit={onEnable}
        />
      : enrollment ?
        <EnableVerifyCard
          enrollment={enrollment}
          code={code}
          setCode={setCode}
          pending={pending}
          onSubmit={onVerify}
          onCancel={() => {
            setStep('idle')
            setEnrollment(null)
            setCode('')
          }}
        />
      : null}
    </div>
  )
}

function EnableStartCard({
  pending,
  password,
  setPassword,
  onSubmit,
}: {
  pending: boolean
  password: string
  setPassword: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <Card>
      <CardHeader>
        <ShieldCheck className="text-muted-foreground size-5" />
        <CardTitle>Enable two-factor</CardTitle>
        <CardDescription>
          We&apos;ll generate a TOTP secret and a fresh set of backup codes.
          Confirm your password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Current password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Generating…' : 'Start enrolment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function EnableVerifyCard({
  enrollment,
  code,
  setCode,
  pending,
  onSubmit,
  onCancel,
}: {
  enrollment: EnrollmentSnapshot
  code: string
  setCode: (v: string) => void
  pending: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan & verify</CardTitle>
        <CardDescription>
          Scan the QR with your authenticator app (1Password, Authy, Google
          Authenticator…), then enter the 6-digit code it generates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
          <div className="bg-background flex items-center justify-center rounded-md border p-4">
            <QRCodeSVG value={enrollment.totpURI} size={176} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Can&apos;t scan? Enter this URI manually:
            </p>
            <code className="bg-muted block max-w-full overflow-x-auto rounded-md p-2 font-mono text-xs break-all">
              {enrollment.totpURI}
            </code>
          </div>
        </div>

        <BackupCodes codes={enrollment.backupCodes} />

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="totp">Authentication code</Label>
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={e => setCode(e.target.value.trim())}
              placeholder="123456"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Verifying…' : 'Verify & enable'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function DisableCard({
  pending,
  password,
  setPassword,
  onSubmit,
}: {
  pending: boolean
  password: string
  setPassword: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <Card>
      <CardHeader>
        <ShieldOff className="text-muted-foreground size-5" />
        <CardTitle>Disable two-factor</CardTitle>
        <CardDescription>
          Removes the TOTP secret and all unused backup codes. You&apos;ll need
          to re-enrol to turn it back on.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Current password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? 'Disabling…' : 'Disable two-factor'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false)
  if (codes.length === 0) return null

  const text = codes.join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Backup codes</p>
          <p className="text-muted-foreground text-xs">
            Save these somewhere safe. Each code works once.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          aria-label="Copy backup codes"
        >
          {copied ?
            <>
              <Check className="size-4" aria-hidden />
              Copied
            </>
          : <>
              <Copy className="size-4" aria-hidden />
              Copy
            </>
          }
        </Button>
      </div>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm tabular-nums sm:grid-cols-3">
        {codes.map(c => (
          <li
            key={c}
            className="bg-muted rounded px-2 py-1 text-xs break-all"
          >
            {c}
          </li>
        ))}
      </ul>
    </div>
  )
}
