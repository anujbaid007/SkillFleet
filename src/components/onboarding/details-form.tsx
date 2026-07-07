'use client'

import { useActionState } from 'react'
import { motion } from 'motion/react'
import { saveStudentDetailsAction } from '@/app/onboarding/details/actions'
import type { DetailsFormState } from '@/app/onboarding/details/actions'
import { ClassBranchFields } from '@/components/onboarding/class-branch-fields'

const INPUT_CLASS =
  'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

export function DetailsForm() {
  const [state, action, pending] = useActionState<DetailsFormState, FormData>(
    saveStudentDetailsAction,
    undefined
  )

  return (
    <motion.form
      action={action}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8 space-y-4"
    >
      <ClassBranchFields className={INPUT_CLASS} />

      <div>
        <label htmlFor="school_name" className="block text-sm font-medium text-foreground mb-1">
          School name
        </label>
        <input
          id="school_name"
          name="school_name"
          type="text"
          required
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
          className={INPUT_CLASS}
          placeholder="e.g. Pune"
        />
      </div>

      <div>
        <label htmlFor="parent_mobile" className="block text-sm font-medium text-foreground mb-1">
          Parent&apos;s mobile number
        </label>
        <input
          id="parent_mobile"
          name="parent_mobile"
          type="tel"
          inputMode="numeric"
          required
          className={INPUT_CLASS}
          placeholder="10-digit mobile number"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : 'Continue →'}
      </button>
    </motion.form>
  )
}
