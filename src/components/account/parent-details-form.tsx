'use client'

import { useActionState } from 'react'
import { Users } from 'lucide-react'
import { updateParentDetailsAction } from '@/app/(platform)/account/actions'
import type { AccountFormState } from '@/app/(platform)/account/actions'

const INPUT_CLASS =
  'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors disabled:bg-black/[0.03] disabled:text-muted'

export function ParentDetailsForm({
  parentName,
  parentEmail,
  parentPhone,
  memberCount,
}: {
  parentName: string
  parentEmail: string
  parentPhone: string
  memberCount: number
}) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    updateParentDetailsAction,
    undefined
  )

  return (
    <form action={action} className="clay-card space-y-4 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </span>
        <div>
          <h2 className="font-display font-bold text-foreground">Parent details</h2>
          <p className="text-xs text-muted">
            {memberCount > 1
              ? `Shared with ${memberCount - 1} other ${memberCount === 2 ? 'account' : 'accounts'} in your family.`
              : 'Used for billing and to link brothers and sisters.'}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="parent_full_name" className="block text-sm font-medium text-foreground mb-1">
          Parent&apos;s full name
        </label>
        <input
          id="parent_full_name"
          name="parent_full_name"
          type="text"
          required
          defaultValue={parentName}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="parent_email" className="block text-sm font-medium text-foreground mb-1">
          Parent&apos;s email <span className="text-muted font-normal">(cannot be changed)</span>
        </label>
        <input id="parent_email" type="email" value={parentEmail} disabled className={INPUT_CLASS} />
        <p className="text-xs text-muted mt-1">
          A brother or sister joins this family by entering this email when they sign up.
        </p>
      </div>

      <div>
        <label htmlFor="parent_phone" className="block text-sm font-medium text-foreground mb-1">
          Parent&apos;s phone
        </label>
        <input
          id="parent_phone"
          name="parent_phone"
          type="tel"
          defaultValue={parentPhone}
          placeholder="Optional"
          className={INPUT_CLASS}
        />
      </div>

      {state?.error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white h-11 px-6 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : 'Save parent details'}
      </button>
    </form>
  )
}
