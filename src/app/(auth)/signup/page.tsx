'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { signupAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'
import { PasswordField } from '@/components/auth/password-field'
import { CheckEmailNotice } from '@/components/auth/check-email-notice'
import { SignupTypeToggle } from '@/components/auth/signup-type-toggle'
import { AuthDivider, GoogleButton } from '@/components/auth/google-button'

/**
 * One signup for the whole family: the student's own login plus their parent's
 * contact details. A second child entering the same parent email is recognised
 * as a sibling (and approved from inside the first child's account).
 */
export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signupAction, undefined)

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
          <SignupTypeToggle active="student" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-muted text-sm mb-6">
            Create your account first. We&apos;ll ask about you, your school and a parent next.
          </p>

          <GoogleButton intent="student" label="Sign up with Google" />
          {/*
            Deliberately an equal option rather than a fallback: Google requires
            an account holder to be 13, and ISC is open from Class 5, so a large
            share of these students cannot use the button above at all.
          */}
          <AuthDivider />

          <form action={action} className="space-y-4">
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
                placeholder="you@example.com"
              />
            </div>

            <PasswordField placeholder="Create a password" />

            {state?.error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </motion.div>
  )
}
