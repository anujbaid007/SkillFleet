'use client'

import { useActionState, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import {
  saveRegistrationConsentAction,
  type RegistrationConsentState,
} from '@/app/actions/registration-consent'
import { REGISTRATION_NOTICE, REGISTRATION_PURPOSES } from '@/lib/legal/registration-consent'

/*
  The sign-up consent as a small card in the lower corner, over whatever page
  the person landed on. The page behind is dimmed and inert until they accept:
  the notice has to come before anything else is collected, and a card that
  can be clicked past is not a gate.

  No box is labelled required or optional. Pressing Accept without the first
  box turns it red with a one-line nudge and saves nothing; the other two are
  free either way.
*/
export function RegistrationConsentPopup({ isCoordinator }: { isCoordinator: boolean }) {
  const router = useRouter()
  const [state, action, pending] = useActionState<RegistrationConsentState, FormData>(
    saveRegistrationConsentAction,
    undefined
  )
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const [nudge, setNudge] = useState(false)

  // Once saved, ask the server to re-render the gates, which then omit the card.
  useEffect(() => {
    if (state?.ok) router.refresh()
  }, [state, router])

  // Closes in place the moment the save comes back, without waiting for that refresh.
  if (state?.ok) return null

  const required = REGISTRATION_PURPOSES.find((p) => p.required)
  const missingRequired = !!required && !ticked[required.id]

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (missingRequired) {
      e.preventDefault()
      setNudge(true)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-consent-title"
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:justify-end sm:p-6"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden />

      <form
        action={action}
        onSubmit={onSubmit}
        noValidate
        className="clay-card relative w-full max-w-md space-y-4 p-5 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <p id="registration-consent-title" className="font-display text-base font-bold text-foreground">
            Your permission
          </p>
        </div>

        <p className="text-xs leading-relaxed text-muted">
          {isCoordinator ? REGISTRATION_NOTICE.coordinator : REGISTRATION_NOTICE.student}{' '}
          {REGISTRATION_NOTICE.rights}{' '}
          Full details in the{' '}
          <Link href="/privacy" target="_blank" className="font-semibold text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        {!isCoordinator && (
          <p className="text-xs font-semibold text-foreground">A parent or guardian should tick these.</p>
        )}

        <div className="space-y-2">
          {REGISTRATION_PURPOSES.map((purpose) => {
            const flagged = nudge && purpose.required && !ticked[purpose.id]
            return (
              <div key={purpose.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    flagged ? 'border-red-400 bg-red-50/60' : 'border-black/[0.08] hover:border-black/[0.16]'
                  }`}
                >
                  <input
                    name={purpose.id}
                    type="checkbox"
                    checked={!!ticked[purpose.id]}
                    onChange={(e) => {
                      setTicked((t) => ({ ...t, [purpose.id]: e.target.checked }))
                      if (purpose.required && e.target.checked) setNudge(false)
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    {isCoordinator ? purpose.labelForCoordinator : purpose.label}
                  </span>
                </label>
                {flagged && (
                  <p className="mt-1 pl-1 text-xs font-semibold text-red-500" role="alert">
                    Tick this to continue
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {state?.error && !nudge && (
          <p className="text-xs font-semibold text-red-500" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button h-11 w-full bg-cta text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Accept and close'}
        </button>
      </form>
    </div>
  )
}
