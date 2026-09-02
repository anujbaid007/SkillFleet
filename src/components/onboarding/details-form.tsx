'use client'

import { useActionState } from 'react'
import { motion } from 'motion/react'
import { saveStudentDetailsAction } from '@/app/onboarding/details/actions'
import type { DetailsFormState } from '@/app/onboarding/details/actions'
import { ClassBranchFields } from '@/components/onboarding/class-branch-fields'
import { SchoolLocationFields } from '@/components/onboarding/school-location-fields'

const INPUT_CLASS =
  'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

export function DetailsForm({
  states,
  previousFreeText,
  needsDob = false,
  needsParent = false,
  maxDob,
  defaultName = '',
}: {
  states: string[]
  previousFreeText?: string
  /** Prefilled from Google where it supplied one, and always editable — a
      Google display name is often not the name the school knows. */
  defaultName?: string
  /** Both true for a Google signup — OAuth returns neither, and the email
      signup form asks for both, so this is where the gap is closed. */
  needsDob?: boolean
  needsParent?: boolean
  maxDob?: string
}) {
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
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
          Your full name
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          defaultValue={defaultName}
          className={INPUT_CLASS}
          placeholder="e.g. Aarav Sharma"
        />
      </div>

      {needsDob && (
        <div>
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-foreground mb-1">
            Date of birth
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            required
            max={maxDob}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-xs text-muted">Used to check which programmes you can join.</p>
        </div>
      )}

      {needsParent && (
        <div className="space-y-4 rounded-2xl bg-primary/[0.04] p-4">
          <p className="font-display text-sm font-bold text-foreground">
            A parent or guardian&apos;s details
          </p>
          <div>
            <label
              htmlFor="parent_full_name"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Parent&apos;s full name
            </label>
            <input
              id="parent_full_name"
              name="parent_full_name"
              required
              className={INPUT_CLASS}
              placeholder="e.g. Anita Rao"
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
              className={INPUT_CLASS}
              placeholder="parent@example.com"
            />
          </div>
          <div>
            <label htmlFor="parent_phone" className="block text-sm font-medium text-foreground mb-1">
              Parent&apos;s WhatsApp number
            </label>
            <input
              id="parent_phone"
              name="parent_phone"
              type="tel"
              inputMode="numeric"
              required
              className={INPUT_CLASS}
              placeholder="10-digit WhatsApp number"
            />
          </div>
        </div>
      )}

      <ClassBranchFields className={INPUT_CLASS} />

      <SchoolLocationFields
        className={INPUT_CLASS}
        states={states}
        previousFreeText={previousFreeText}
      />

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
