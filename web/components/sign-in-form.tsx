'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { authClient, signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Stage = 'credentials' | 'totp' | 'backup'

export function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/dashboard'

  const [stage, setStage] = useState<Stage>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)

  async function onCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await signIn.email({ email, password })
    setPending(false)

    if (res.error) {
      toast.error(res.error.message ?? 'Sign-in failed')
      return
    }
    // Better Auth signals 2FA enrollment by returning `twoFactorRedirect: true`
    // instead of completing the session. The user-visible session won't be
    // established until the second factor is verified.
    if ((res.data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
      setCode('')
      setStage('totp')
      return
    }
    toast.success('Welcome back')
    router.push(next)
    router.refresh()
  }

  async function onCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res =
      stage === 'totp' ?
        await authClient.twoFactor.verifyTotp({ code })
      : await authClient.twoFactor.verifyBackupCode({ code })
    setPending(false)
    if (res.error) {
      toast.error(res.error.message ?? 'Invalid code')
      return
    }
    toast.success('Welcome back')
    router.push(next)
    router.refresh()
  }

  if (stage === 'credentials') {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Email + password. Two-factor (if enrolled) prompts after this.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between text-sm">
            <Link
              href="/sign-up"
              className="text-muted-foreground hover:text-foreground"
            >
              Need an account?
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Two-factor verification</CardTitle>
          <CardDescription>
            {stage === 'totp' ?
              'Enter the 6-digit code from your authenticator app.'
            : 'Enter one of your saved backup codes.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                {stage === 'totp' ? 'Authentication code' : 'Backup code'}
              </Label>
              <Input
                id="code"
                inputMode={stage === 'totp' ? 'numeric' : 'text'}
                autoComplete="one-time-code"
                required
                value={code}
                onChange={e => setCode(e.target.value.trim())}
                placeholder={stage === 'totp' ? '123456' : 'abcd-1234'}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Verifying…' : 'Verify'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setCode('')
              setStage(stage === 'totp' ? 'backup' : 'totp')
            }}
          >
            {stage === 'totp' ?
              'Use a backup code instead'
            : 'Use authenticator code instead'}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setCode('')
              setStage('credentials')
            }}
          >
            Cancel
          </button>
        </CardFooter>
      </Card>
    </div>
  )
}
