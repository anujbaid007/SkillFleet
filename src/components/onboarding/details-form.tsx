'use client'

import { useActionState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, School, UserRound, Users, type LucideIcon } from 'lucide-react'
import { saveStudentDetailsAction } from '@/app/onboarding/details/actions'
import type { DetailsFormState } from '@/app/onboarding/details/actions'
import { ClassBranchFields } from '@/components/onboarding/class-branch-fields'
import { SchoolLocationFields } from '@/components/onboarding/school-location-fields'

const INPUT_CLASS =
  'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

/*
  One titled card per part of the form, so the page reads as three short
  steps rather than one long column. The card is only chrome: every field
  keeps its name and id, so the action behind the form is untouched.
*/
function Section({
  icon: Icon,
  tint,
  title,
  hint,
  children,
}: {
  icon: LucideIcon
  tint: string
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="clay-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function DetailsForm({
  states,
  previousFreeText,
  needsDob = false,
  needsParent = false,
  maxDob,
  defaultName = '',
  prefillSchool,
}: {
  states: string[]
  previousFreeText?: string
  /** Prefilled from Google where it supplied one, and always editable — a
      Google display name is often not the name the school knows. */
  defaultName?: string
  /** From a coordinator's /join/<schoolId> link — preselects the cascade. */
  prefillSchool?: { id: string; name: string; state: string; district: string }
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
      className="space-y-4"
    >
      <Section icon={UserRound} tint="bg-primary/10 text-primary" title="About you" hint="As your school knows you.">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
            Your full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={state?.values?.full_name ?? defaultName}
            className={INPUT_CLASS}
            placeholder="e.g. Aarav Sharma"
          />
        </div>

        {needsDob && (
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-foreground mb-1">
              Date of birth
            </label>
            <div className="relative">
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                required
                defaultValue={state?.values?.date_of_birth ?? ''}
                max={maxDob}
                className={INPUT_CLASS}
              />
              <CalendarDays className="pointer-events-none absolute right-3.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted sm:block" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xs text-muted">Used to check which programmes you can join.</p>
          </div>
        )}
      </Section>

      {needsParent && (
        <Section
          icon={Users}
          tint="bg-accent-pink/15 text-accent-pink"
          title="A parent or guardian"
          hint="The adult we can reach about bookings and the championship."
        >
          <div>
            <label htmlFor="parent_full_name" className="block text-sm font-medium text-foreground mb-1">
              Parent&apos;s full name
            </label>
            <input
              id="parent_full_name"
              name="parent_full_name"
              required
              defaultValue={state?.values?.parent_full_name ?? ''}
              className={INPUT_CLASS}
              placeholder="e.g. Anita Rao"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="parent_email" className="block text-sm font-medium text-foreground mb-1">
                Parent&apos;s email
              </label>
              <input
                id="parent_email"
                name="parent_email"
                type="email"
                required
                defaultValue={state?.values?.parent_email ?? ''}
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
                defaultValue={state?.values?.parent_phone ?? ''}
                className={INPUT_CLASS}
                placeholder="10-digit WhatsApp number"
              />
            </div>
          </div>
        </Section>
      )}

      <Section
        icon={School}
        tint="bg-accent-teal/15 text-accent-teal"
        title="Your school"
        hint="Your class decides which programmes and championships open to you."
      >
        <ClassBranchFields className={INPUT_CLASS} />

        {prefillSchool && (
          <p className="rounded-xl bg-accent-teal/10 px-4 py-3 text-sm text-foreground">
            Joining <span className="font-semibold">{prefillSchool.name}</span>. Change it below if
            that is not your school.
          </p>
        )}

        <SchoolLocationFields
          className={INPUT_CLASS}
          states={states}
          previousFreeText={previousFreeText}
          initialState={prefillSchool?.state ?? ''}
          initialDistrict={prefillSchool?.district ?? ''}
          initialSchoolId={prefillSchool?.id ?? ''}
          initialSchoolName={prefillSchool?.name ?? ''}
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
            defaultValue={state?.values?.city ?? ''}
            className={INPUT_CLASS}
            placeholder="e.g. Pune"
          />
        </div>
      </Section>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3" role="alert">
          {state.error}
        </p>
      )}

      {/* On a phone the button rides along the bottom edge, so a long form
          never hides it; from sm up it simply follows the last card. */}
      <div className="sticky bottom-0 -mx-4 border-t border-black/[0.06] bg-background/85 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button
          type="submit"
          disabled={pending}
          className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </motion.form>
  )
}
