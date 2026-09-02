'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { School } from 'lucide-react'
import { signupCoordinatorAction } from '@/app/actions/coordinator'
import type { AuthFormState } from '@/app/actions/auth'
import { PasswordField } from '@/components/auth/password-field'
import { CheckEmailNotice } from '@/components/auth/check-email-notice'
import { SignupTypeToggle } from '@/components/auth/signup-type-toggle'

/**
 * Coordinator signup collects the account only. School, board and student
 * count are asked afterward on /onboarding/coordinator, once logged in —
 * resolving or creating a school needs auth.uid(), which does not exist yet
 * during signUp(). Exactly the shape student signup already uses for the
 * same reason (school selection is a separate step there too).
 */
export default function CoordinatorSignupPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signupCoordinatorAction,
    undefined
  )

  const inputClass =
    'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

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
          <SignupTypeToggle active="coordinator" />
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <School className="w-4 h-4 text-primary" />
            </span>
            <h1 className="font-display text-2xl font-bold text-foreground">Coordinator sign-up</h1>
          </div>
          <p className="text-muted text-sm mb-6">
            You&apos;ll add your school on the next step, once your account is created.
          </p>

          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
                Your full name
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                defaultValue={state?.values?.full_name ?? ''}
                className={inputClass}
                placeholder="Anita Rao"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email <span className="text-muted font-normal">(used to sign in)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={state?.values?.email ?? ''}
                className={inputClass}
                placeholder="you@school.edu"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                WhatsApp number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                required
                defaultValue={state?.values?.phone ?? ''}
                className={inputClass}
                placeholder="10-digit WhatsApp number"
              />
            </div>

            <PasswordField placeholder="Create a strong password" />

            {state?.error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? 'Creating account…' : 'Continue'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Already applied?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </motion.div>
  )
}
