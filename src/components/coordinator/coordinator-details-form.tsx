'use client'

import { useActionState, useCallback, useState } from 'react'
import { motion } from 'motion/react'
import { applyAsCoordinatorAction, type ApplyState } from '@/app/actions/coordinator'
import { STUDENT_COUNT_OPTIONS } from '@/lib/coordinator/validate'
import { SchoolLocationFields } from '@/components/onboarding/school-location-fields'
import { SchoolBoardField } from '@/components/coordinator/school-board-field'
import type { SchoolOption } from '@/app/actions/schools'

const INPUT_CLASS =
  'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

export function CoordinatorDetailsForm({
  states,
  needsPhone = false,
}: {
  states: string[]
  /** True for a Google signup: OAuth returns no phone number, and the email
      form collects one, so this is where that gap is closed. */
  needsPhone?: boolean
}) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(
    applyAsCoordinatorAction,
    undefined
  )
  // The cascade reports the fully resolved school, so the board can pre-fill
  // from what we already know about it instead of asking again.
  const [knownBoard, setKnownBoard] = useState<string | null>(null)

  const handleSchoolPicked = useCallback((school: SchoolOption | null) => {
    setKnownBoard(school?.board ?? null)
  }, [])

  return (
    <motion.form
      action={action}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8 space-y-4"
    >
      {needsPhone && (
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
            Your WhatsApp number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            required
            className={INPUT_CLASS}
            placeholder="10-digit WhatsApp number"
          />
          <p className="mt-1 text-xs text-muted">
            So we can reach you about your school&apos;s entries.
          </p>
        </div>
      )}

      <SchoolLocationFields
        className={INPUT_CLASS}
        states={states}
        onSchoolPicked={handleSchoolPicked}
      />

      <SchoolBoardField className={INPUT_CLASS} knownBoard={knownBoard} />

      <div>
        <label
          htmlFor="student_count_range"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Total number of students
        </label>
        <select
          id="student_count_range"
          name="student_count_range"
          required
          defaultValue=""
          className={INPUT_CLASS}
        >
          <option value="" disabled>
            Select a range
          </option>
          {STUDENT_COUNT_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Submitting…' : 'Submit for review'}
      </button>
    </motion.form>
  )
}
