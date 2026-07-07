'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { signupParentAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'
import { PasswordField } from '@/components/auth/password-field'

export default function ParentSignupPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signupParentAction,
    undefined
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Parent sign up</h1>
      <p className="text-muted text-sm mb-6">Create your parent / guardian account</p>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
            Your full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="Priya Sharma"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
            Phone number <span className="text-muted font-normal">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="+91 98765 43210"
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
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
