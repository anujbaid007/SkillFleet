'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { loginAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, undefined)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Welcome back</h1>
      <p className="text-muted text-sm mb-6">Sign in to your SkillFleet account</p>

      <form action={action} className="space-y-4">
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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-accent-teal bg-accent-teal/10 rounded-xl px-4 py-3">
            {state.success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted">
          New here?{' '}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Create your account
          </Link>
        </p>
        <p className="text-xs text-muted mt-1">
          One account per student — a parent&apos;s details are part of signing up.
        </p>
        <p className="text-xs text-muted mt-3">
          Are you a school coordinator?{' '}
          <Link href="/signup/coordinator" className="text-primary font-semibold hover:underline">
            Apply here
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
