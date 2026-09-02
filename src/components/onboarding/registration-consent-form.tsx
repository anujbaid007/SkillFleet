'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Check, ShieldCheck, Users } from 'lucide-react'
import {
  MARKETING_NOTE,
  REGISTRATION_DATA_ITEMS,
  REGISTRATION_PURPOSES,
  REGISTRATION_RECIPIENTS,
} from '@/lib/legal/registration-consent'
import {
  saveRegistrationConsentAction,
  type RegistrationConsentState,
} from '@/app/onboarding/consent/actions'

/**
 * The first screen after signing up.
 *
 * Shaped by DPDP s.5 and s.6: the notice comes before the ask, each purpose is
 * agreed to separately, and every box starts empty so agreeing is a deliberate
 * act rather than the default. The two marketing purposes are genuinely
 * refusable — saying no to both still creates the account.
 */
export function RegistrationConsentForm({ isCoordinator }: { isCoordinator: boolean }) {
  const [state, action, pending] = useActionState<RegistrationConsentState, FormData>(
    saveRegistrationConsentAction,
    undefined
  )
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const requiredIds = REGISTRATION_PURPOSES.filter((p) => p.required).map((p) => p.id)
  const canSubmit = requiredIds.every((id) => agreed[id])

  return (
    <form action={action} className="clay-card space-y-6 p-6 sm:p-8">
      {/* Who should be at the keyboard, said first and said plainly. */}
      {!isCoordinator && (
        <div className="flex items-start gap-3 rounded-2xl bg-accent-yellow/[0.12] p-4">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent-yellow" />
          <p className="text-sm text-foreground">
            <span className="font-bold">To be completed by a parent or guardian.</span> Please hand
            the device to an adult — they are agreeing on the student&apos;s behalf.
          </p>
        </div>
      )}

      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            How we&apos;ll use this data
          </h1>
          <p className="mt-1 text-sm text-muted">
            Read what we collect, then choose what you agree to. Asked once.
          </p>
        </div>
      </div>

      {/* s.5 notice — before the ask, not after it. */}
      <div className="space-y-4 rounded-2xl bg-black/[0.02] p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-foreground/50 uppercase">
            What we collect
          </p>
          <ul className="mt-2 space-y-1.5">
            {REGISTRATION_DATA_ITEMS.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/40" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wider text-foreground/50 uppercase">
            Who can see it
          </p>
          <ul className="mt-2 space-y-1.5">
            {REGISTRATION_RECIPIENTS.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/40" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        {REGISTRATION_PURPOSES.map((purpose) => {
          const on = Boolean(agreed[purpose.id])
          return (
            <label
              key={purpose.id}
              htmlFor={purpose.id}
              className={`relative flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-colors ${
                on ? 'border-primary/30 bg-primary/[0.04]' : 'border-black/[0.06] bg-white'
              }`}
            >
              <input
                id={purpose.id}
                name={purpose.id}
                type="checkbox"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                checked={on}
                onChange={(e) => setAgreed((a) => ({ ...a, [purpose.id]: e.target.checked }))}
              />
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  on ? 'border-primary bg-primary text-white' : 'border-black/15 bg-white'
                }`}
              >
                {on && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {purpose.label}
                  {purpose.required ? (
                    <span className="ml-2 text-[10px] font-bold text-primary">REQUIRED</span>
                  ) : (
                    <span className="ml-2 text-[10px] font-bold text-muted">OPTIONAL</span>
                  )}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {purpose.detail}
                </span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="rounded-xl bg-black/[0.02] px-4 py-3 text-xs leading-relaxed text-muted">
        {MARKETING_NOTE} You can change any of this at any time from the account settings, or by
        writing to{' '}
        <a
          href="mailto:contact@skillfleet.org"
          className="font-semibold text-primary hover:underline"
        >
          contact@skillfleet.org
        </a>
        . You can also ask what we hold, have it corrected or deleted, and complain to our Grievance
        Officer and then to the Data Protection Board of India. The{' '}
        <Link href="/privacy" target="_blank" className="font-semibold text-primary hover:underline">
          Privacy Policy
        </Link>{' '}
        explains all of it.
      </p>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="clay-button h-12 w-full bg-cta font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving…' : canSubmit ? 'I agree, continue' : 'Tick the required box to continue'}
      </button>
    </form>
  )
}
