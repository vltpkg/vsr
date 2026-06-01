import { Suspense } from 'react'

import { SignInForm } from '@/components/sign-in-form'

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground py-12 text-center text-sm">
          Loading…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
