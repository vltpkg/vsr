'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { signUp } from '@/lib/auth-client'
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

export default function SignUpPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await signUp.email({
      email,
      password,
      name: name || email.split('@')[0],
    })
    setPending(false)
    if (res.error) {
      toast.error(res.error.message ?? 'Sign-up failed')
      return
    }
    toast.success('Account created')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            You'll be able to publish, mint api-keys, and manage
            collaborators once signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                autoComplete="username"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="(optional — defaults to your email handle)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                At least 8 characters.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Creating…' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-muted-foreground text-sm">
          <Link href="/sign-in" className="hover:text-foreground">
            Already have an account? Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
