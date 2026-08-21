'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { GraduationCap, Users } from 'lucide-react'
import { signupAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'
import { PasswordField } from '@/components/auth/password-field'
import { CheckEmailNotice } from '@/components/auth/check-email-notice'
import { MIN_SIGNUP_AGE } from '@/lib/validation/dob'

/**
 * One signup for the whole family: the student's own login plus their parent's
 * contact details. A second child entering the same parent email is recognised
 * as a sibling (and approved from inside the first child's account).
 */
export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signupAction, undefined)

  // Latest DOB allowed = today minus the minimum age. Computed client-side to
  // avoid a hydration mismatch on the `max` attribute.
  const [maxDob, setMaxDob] = useState('')
  useEffect(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - MIN_SIGNUP_AGE)
    setMaxDob(d.toISOString().split('T')[0])
  }, [])

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
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-muted text-sm mb-6">
            The student signs in; a parent&apos;s details are added for bookings and approvals.
          </p>

          <form action={action} className="space-y-6">
            {/* Student */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-primary" />
                </span>
                <h2 className="font-display font-bold text-foreground text-sm">Student details</h2>
              </div>

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
                  Student&apos;s full name
                </label>
                <input id="full_name" name="full_name" required className={inputClass} placeholder="Arjun Sharma" />
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
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  Student&apos;s email <span className="text-muted font-normal">(used to sign in)</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                  placeholder="student@example.com"
                />
              </div>

              <PasswordField placeholder="Create a strong password" />
            </div>

            {/* Parent */}
            <div className="space-y-4 pt-2 border-t border-black/[0.06]">
              <div className="flex items-center gap-2 pt-4">
                <span className="w-7 h-7 rounded-lg bg-accent-teal/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-accent-teal" />
                </span>
                <h2 className="font-display font-bold text-foreground text-sm">Parent / guardian details</h2>
              </div>

              <div>
                <label htmlFor="parent_full_name" className="block text-sm font-medium text-foreground mb-1">
                  Parent&apos;s full name
                </label>
                <input
                  id="parent_full_name"
                  name="parent_full_name"
                  required
                  className={inputClass}
                  placeholder="Priya Sharma"
                />
              </div>

              <div>
                <label htmlFor="parent_email" className="block text-sm font-medium text-foreground mb-1">
                  Parent&apos;s email
                </label>
                <input
                  id="parent_email"
                  name="parent_email"
                  type="email"
                  required
                  className={inputClass}
                  placeholder="parent@example.com"
                />
                <p className="text-xs text-muted mt-1">
                  Brothers and sisters who use this same email are grouped into one family.
                </p>
              </div>

              <div>
                <label htmlFor="parent_phone" className="block text-sm font-medium text-foreground mb-1">
                  Parent&apos;s mobile number
                </label>
                <input
                  id="parent_phone"
                  name="parent_phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  className={inputClass}
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

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
