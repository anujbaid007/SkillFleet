'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { KeyRound } from 'lucide-react'
import { updatePasswordAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'
import { PasswordField } from '@/components/auth/password-field'

/**
 * Reached from the emailed recovery link. /auth/callback has already
 * exchanged that link's code for a session, so the update below is
 * authenticated — there is no token to handle here.
 */
export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    updatePasswordAction,
    undefined
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <KeyRound className="h-4 w-4 text-primary" />
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground">Choose a new password</h1>
      </div>
      <p className="mb-6 text-sm text-muted">
        You&apos;ll be signed in as soon as this is saved.
      </p>

      <form action={action} className="space-y-4">
        <PasswordField label="New password" placeholder="Create a new password" />
        <PasswordField
          name="confirm_password"
          label="Confirm new password"
          placeholder="Type it once more"
          showChecklist={false}
        />

        {state?.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button h-12 w-full bg-cta font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save new password'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Link expired?{' '}
        <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
          Send a new one
        </Link>
      </p>
    </motion.div>
  )
}
