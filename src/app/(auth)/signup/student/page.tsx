'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { signupStudentAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'
import { PasswordField } from '@/components/auth/password-field'
import { CheckEmailNotice } from '@/components/auth/check-email-notice'
import { MIN_SIGNUP_AGE } from '@/lib/validation/dob'

export default function StudentSignupPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signupStudentAction,
    undefined
  )

  // Latest DOB allowed = today minus the minimum age. Computed on the client
  // (in an effect) so the date picker greys out under-age dates without a
  // server/client hydration mismatch on the `max` attribute.
  const [maxDob, setMaxDob] = useState('')
  useEffect(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - MIN_SIGNUP_AGE)
    setMaxDob(d.toISOString().split('T')[0])
  }, [])

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
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Student sign up</h1>
      <p className="text-muted text-sm mb-6">Create your SkillFleet account</p>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="Arjun Sharma"
          />
        </div>

        <div>
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-foreground mb-1">
            Date of birth
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            required
            max={maxDob || undefined}
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="you@example.com"
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
