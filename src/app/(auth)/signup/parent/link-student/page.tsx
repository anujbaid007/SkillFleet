'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { linkStudentAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'

export default function LinkStudentPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    linkStudentAction,
    undefined
  )

  // On a successful link, head to the dashboard.
  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
    }
  }, [state, router])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        Link your child&apos;s account
      </h1>
      <p className="text-muted text-sm mb-6">
        Enter your child&apos;s SkillFleet email and password to confirm it&apos;s yours to manage.
        If they don&apos;t have an account yet, ask them to sign up first. You can also do this later
        from your dashboard.
      </p>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="student_email" className="block text-sm font-medium text-foreground mb-1">
            Child&apos;s email address
          </label>
          <input
            id="student_email"
            name="student_email"
            type="email"
            required
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="child@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="student_password"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Child&apos;s password
          </label>
          <input
            id="student_password"
            name="student_password"
            type="password"
            required
            autoComplete="off"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
            placeholder="Their account password"
          />
          <p className="text-xs text-muted mt-1">
            We use this only to confirm the account is yours — it&apos;s never stored.
          </p>
        </div>

        {state?.error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-accent-teal bg-accent-teal/10 rounded-xl px-4 py-3">
            {state.success} Redirecting…
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Linking…' : 'Link account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/dashboard" className="text-primary font-semibold hover:underline">
          Skip for now → go to dashboard
        </Link>
      </p>
    </motion.div>
  )
}
