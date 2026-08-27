'use client'

import { useActionState } from 'react'
import { GraduationCap, Loader2, ShieldCheck } from 'lucide-react'
import { bootstrapSwitchAction } from '@/app/actions/switch'
import { PasswordField } from '@/components/auth/password-field'

export function SwitchBootstrapForm({
  targetId,
  name,
  email,
  expired,
}: {
  targetId: string
  name: string
  email: string
  expired: boolean
}) {
  const [state, action, pending] = useActionState(bootstrapSwitchAction, undefined)

  return (
    <div className="clay-card p-8">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <GraduationCap className="w-6 h-6 text-primary" />
      </div>

      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Switch to {name}</h1>
      <p className="text-muted text-sm mb-6">
        {expired
          ? 'For security, please confirm the password again to continue switching on this device.'
          : `Enter ${name}'s password once on this device. After that, switching is a single tap.`}
      </p>

      <div className="rounded-xl bg-black/[0.03] px-4 py-3 mb-4">
        <p className="text-xs text-muted">Signing in as</p>
        <p className="font-semibold text-foreground text-sm truncate">{name}</p>
        <p className="text-xs text-muted truncate">{email}</p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="target_id" value={targetId} />

        <PasswordField placeholder="Enter password" autoComplete="current-password" showChecklist={false} />

        {state?.error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button bg-cta text-white w-full h-12 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {pending ? 'Switching…' : 'Continue'}
        </button>
      </form>

      <p className="text-xs text-muted mt-4 inline-flex items-start gap-1.5">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-px text-muted" />
        Only needed the first time on each device — both accounts stay signed in here afterwards.
      </p>
    </div>
  )
}
