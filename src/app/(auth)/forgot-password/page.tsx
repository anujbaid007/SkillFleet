'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { KeyRound } from 'lucide-react'
import { requestPasswordResetAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'
import { CheckEmailNotice } from '@/components/auth/check-email-notice'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordResetAction,
    undefined
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      {state?.success ? (
        <CheckEmailNotice message={state.success} />
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <KeyRound className="h-4 w-4 text-primary" />
            </span>
            <h1 className="font-display text-2xl font-bold text-foreground">Forgot your password?</h1>
          </div>
          <p className="mb-6 text-sm text-muted">
            Give us the email you signed up with and we&apos;ll send you a link to choose a new one.
          </p>

          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={state?.values?.email ?? ''}
                className="h-11 w-full rounded-xl border-2 border-black/[0.06] bg-white px-4 text-foreground transition-colors placeholder:text-muted/60 focus:border-primary focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            {state?.error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="clay-button h-12 w-full bg-cta font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Remembered it?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </motion.div>
  )
}
