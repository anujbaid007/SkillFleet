'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Check, ShieldCheck } from 'lucide-react'
import { giveConsentAction, type ConsentState } from '@/app/actions/isc'
import {
  CONSENT_DATA_ITEMS,
  CONSENT_PURPOSES,
  CONSENT_RECIPIENTS,
} from '@/lib/isc/consent-notice'

/**
 * The consent screen.
 *
 * Shaped by DPDP s.5 and s.6: the notice comes before the ask, each purpose is
 * agreed to separately, and every box starts empty so agreeing is a deliberate
 * act rather than the default. The two optional purposes are genuinely
 * optional — refusing either still lets a student enter and win, which is what
 * makes the required one freely given rather than the price of admission.
 */
export function ConsentForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ConsentState, FormData>(
    giveConsentAction,
    undefined
  )
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const requiredIds = CONSENT_PURPOSES.filter((p) => p.required).map((p) => p.id)
  const canSubmit = requiredIds.every((id) => agreed[id])

  return (
    <form action={action} className="clay-card space-y-6 p-6 sm:p-8">
      <input type="hidden" name="next" value={next} />

      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Before you enter, your permission
          </h1>
          <p className="mt-1 text-sm text-muted">
            Asked once for the whole season. Read what we collect, then choose what you agree to.
          </p>
        </div>
      </div>

      {/* The notice, before the ask — s.5 requires you know what you are
          agreeing to before you agree to it. */}
      <div className="space-y-4 rounded-2xl bg-black/[0.02] p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-foreground/50 uppercase">
            What we collect
          </p>
          <ul className="mt-2 space-y-1.5">
            {CONSENT_DATA_ITEMS.map((item) => (
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
            {CONSENT_RECIPIENTS.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/40" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted">
          Your work stays yours. Entering does not give Skill Fleet ownership of anything you make.
        </p>
      </div>

      <div className="space-y-3">
        {CONSENT_PURPOSES.map((purpose) => {
          const on = Boolean(agreed[purpose.id])
          return (
            <label
              key={purpose.id}
              htmlFor={purpose.id}
              className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-colors ${
                on ? 'border-primary/30 bg-primary/[0.04]' : 'border-black/[0.06] bg-white'
              }`}
            >
              <input
                id={purpose.id}
                name={purpose.id}
                type="checkbox"
                className="sr-only"
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

      {/* s.6(4) and s.13: withdrawal and complaint routes belong with the ask,
          not buried in a policy nobody opens. */}
      <p className="rounded-xl bg-black/[0.02] px-4 py-3 text-xs leading-relaxed text-muted">
        You can change your mind at any time by writing to{' '}
        <a href="mailto:isc@skillfleet.org" className="font-semibold text-primary hover:underline">
          isc@skillfleet.org
        </a>
        . Withdrawing the required permission means we can no longer keep your entry in the
        championship. You can also ask us what we hold about you, have it corrected or deleted, or
        complain to our Grievance Officer and then to the Data Protection Board of India. The full{' '}
        <Link href="/privacy" className="font-semibold text-primary hover:underline">
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
        {pending ? 'Saving…' : canSubmit ? 'I agree' : 'Tick the required box to continue'}
      </button>
    </form>
  )
}
