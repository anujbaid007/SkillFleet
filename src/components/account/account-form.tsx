'use client'

import { useActionState } from 'react'
import { updateAccountAction } from '@/app/(platform)/account/actions'
import type { AccountFormState } from '@/app/(platform)/account/actions'
import { ClassBranchFields } from '@/components/onboarding/class-branch-fields'

const INPUT_CLASS =
  'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors disabled:bg-black/[0.03] disabled:text-muted'

interface AccountFormProps {
  role: string
  email: string
  initial: {
    full_name: string
    date_of_birth: string
    phone: string
    school_class: string
    school_branch: string
    school_name: string
    city: string
    parent_mobile: string
  }
}

export function AccountForm({ role, email, initial }: AccountFormProps) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    updateAccountAction,
    undefined
  )
  const isStudent = role === 'student'

  return (
    <form action={action} className="clay-card p-6 space-y-4 max-w-xl">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={initial.full_name}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email <span className="text-muted font-normal">(cannot be changed)</span>
        </label>
        <input id="email" type="email" value={email} disabled className={INPUT_CLASS} />
      </div>

      <div>
        <label htmlFor="date_of_birth" className="block text-sm font-medium text-foreground mb-1">
          Date of birth
        </label>
        <input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          defaultValue={initial.date_of_birth}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
          Phone <span className="text-muted font-normal">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          defaultValue={initial.phone}
          className={INPUT_CLASS}
          placeholder="Your contact number"
        />
      </div>

      {isStudent && (
        <>
          <div className="pt-2 border-t border-black/[0.06]">
            <p className="text-sm font-semibold text-foreground pt-2">Student details</p>
          </div>
          <ClassBranchFields
            className={INPUT_CLASS}
            initialClass={initial.school_class}
            initialBranch={initial.school_branch}
          />
          <div>
            <label htmlFor="school_name" className="block text-sm font-medium text-foreground mb-1">
              School name
            </label>
            <input
              id="school_name"
              name="school_name"
              type="text"
              required
              defaultValue={initial.school_name}
              className={INPUT_CLASS}
              placeholder="e.g. Delhi Public School"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              required
              defaultValue={initial.city}
              className={INPUT_CLASS}
              placeholder="e.g. Pune"
            />
          </div>
          <div>
            <label
              htmlFor="parent_mobile"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Parent&apos;s mobile number
            </label>
            <input
              id="parent_mobile"
              name="parent_mobile"
              type="tel"
              inputMode="numeric"
              required
              defaultValue={initial.parent_mobile}
              className={INPUT_CLASS}
              placeholder="10-digit mobile number"
            />
          </div>
        </>
      )}

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
        className="clay-button bg-cta text-white h-12 px-8 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
