'use client'

import { useActionState } from 'react'
import { School, UserRound } from 'lucide-react'
import { updateAccountAction } from '@/app/(platform)/account/actions'
import type { AccountFormState } from '@/app/(platform)/account/actions'
import { ClassBranchFields } from '@/components/onboarding/class-branch-fields'
import { SchoolLocationFields } from '@/components/onboarding/school-location-fields'
import { FormSection } from '@/components/ui/form-section'

const INPUT_CLASS =
  'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors disabled:bg-black/[0.03] disabled:text-muted'

const LABEL_CLASS = 'block text-sm font-medium text-foreground mb-1'

interface AccountFormProps {
  role: string
  email: string
  states: string[]
  initial: {
    full_name: string
    date_of_birth: string
    phone: string
    school_class: string
    school_branch: string
    school_name: string
    school_id: string
    school_state: string
    school_district: string
    city: string
    parent_mobile: string
  }
}

export function AccountForm({ role, email, states, initial }: AccountFormProps) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    updateAccountAction,
    undefined
  )
  const isStudent = role === 'student'

  return (
    <form action={action} className="space-y-4">
      <FormSection
        icon={UserRound}
        tint="bg-primary/10 text-primary"
        title="About you"
        hint="How your name appears on certificates and entries."
      >
        {/* Short fields pair up from sm, which is what stops this page
            running on for a screen and a half. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="full_name" className={LABEL_CLASS}>
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
            <label htmlFor="email" className={LABEL_CLASS}>
              Email <span className="font-normal text-muted">(cannot be changed)</span>
            </label>
            <input id="email" type="email" value={email} disabled className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="date_of_birth" className={LABEL_CLASS}>
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
            <label htmlFor="phone" className={LABEL_CLASS}>
              Phone <span className="font-normal text-muted">(optional)</span>
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
        </div>
      </FormSection>

      {isStudent && (
        <FormSection
          icon={School}
          tint="bg-accent-teal/15 text-accent-teal"
          title="Your school"
          hint="Your class decides which programmes and championships open to you."
        >
          <ClassBranchFields
            className={INPUT_CLASS}
            initialClass={initial.school_class}
            initialBranch={initial.school_branch}
          />
          <SchoolLocationFields
            className={INPUT_CLASS}
            states={states}
            initialState={initial.school_state}
            initialDistrict={initial.school_district}
            initialSchoolId={initial.school_id}
            initialSchoolName={initial.school_name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className={LABEL_CLASS}>
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
              <label htmlFor="parent_mobile" className={LABEL_CLASS}>
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
          </div>
        </FormSection>
      )}

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-xl bg-accent-teal/10 px-4 py-3 text-sm text-accent-teal" role="status">
          {state.success}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="clay-button h-11 bg-cta px-8 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
