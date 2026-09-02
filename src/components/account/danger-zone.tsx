'use client'

import { useActionState, useState } from 'react'
import { AlertTriangle, Check, Download, ShieldQuestion, Trash2 } from 'lucide-react'
import { deleteMyAccountAction, type DeleteAccountState } from '@/app/(platform)/account/delete-action'

/** What is actually lost. Each one has to be accepted on its own. */
const WARNINGS = [
  {
    id: 'permanent',
    text: 'This cannot be undone. There is no recovery window and no backup we can restore you from.',
  },
  {
    id: 'entries',
    text: 'Championship entries you created are deleted, including any already submitted for judging. If teammates joined one of your entries, they lose it too.',
  },
  {
    id: 'bookings',
    text: 'Bookings, orders, wallet balance and skill scores are deleted. Any credit left in your wallet is forfeited.',
  },
  {
    id: 'family',
    text: 'If nobody else is left in your family account, your parent’s details are deleted with it.',
  },
]

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

/**
 * Deletion, made deliberately hard to do by accident.
 *
 * Three gates, because this is irreversible and the people using it are
 * children: the panel stays shut until asked for, every consequence is accepted
 * on its own rather than as one lumped "I agree", and the exact phrase has to
 * be typed. The button stays disabled until all of it is done.
 *
 * The export sits directly above it on purpose — the most common reason for
 * wanting an account gone is wanting the data out, and it should be one click
 * away at the moment that occurs to somebody.
 */
export function DangerZone() {
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(
    deleteMyAccountAction,
    undefined
  )
  const [open, setOpen] = useState(false)
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [phrase, setPhrase] = useState('')

  const allAccepted = WARNINGS.every((w) => accepted[w.id])
  const phraseOk = phrase.trim() === CONFIRM_PHRASE
  const canDelete = allAccepted && phraseOk && !pending

  return (
    <div className="space-y-4">
      <a
        href="/api/account/export"
        className="clay-card dash-panel-link flex items-center gap-4 p-5"
        download
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light">
          <Download className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-foreground">Download my data</p>
          <p className="text-xs text-muted">
            Everything SkillFleet holds about you, as a file you can keep.
          </p>
        </div>
      </a>

      {/*
        DPDP s.13 requires a readily available means of raising a complaint, and
        a named officer to raise it with. Kept beside the export and the delete
        because this is where somebody looking for their rights will come.
      */}
      <div className="clay-card p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-teal to-primary">
            <ShieldQuestion className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-foreground">Raise a concern about your data</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Ask what we hold, have something corrected, withdraw a permission, or complain about
              how your data has been handled. Our Grievance Officer answers these, and we aim to
              acknowledge every one within 7 working days.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="mailto:contact@skillfleet.org?subject=Data%20request%20or%20complaint"
                className="clay-button inline-flex h-10 items-center bg-white px-4 text-sm font-semibold text-foreground"
              >
                Email the Grievance Officer
              </a>
              <a
                href="/privacy#grievance"
                className="inline-flex h-10 items-center px-2 text-sm font-semibold text-primary hover:underline"
              >
                Your rights in full
              </a>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Not satisfied with our answer? You can escalate to the Data Protection Board of India.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <Trash2 className="h-4 w-4 text-red-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-foreground">Delete my account</p>
            <p className="mt-0.5 text-xs text-muted">
              Removes your account and everything on it, permanently.
            </p>
          </div>
          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-xl border-2 border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Delete…
            </button>
          )}
        </div>

        {open && (
          <form action={action} className="mt-5 space-y-4">
            <p className="flex gap-2 text-sm font-semibold text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Read each of these and tick it to continue.
            </p>

            <div className="space-y-2">
              {WARNINGS.map((w) => {
                const on = Boolean(accepted[w.id])
                return (
                  <label
                    key={w.id}
                    htmlFor={`warn-${w.id}`}
                    className={`flex cursor-pointer gap-3 rounded-xl border-2 bg-white p-3 transition-colors ${
                      on ? 'border-red-300' : 'border-black/[0.06]'
                    }`}
                  >
                    <input
                      id={`warn-${w.id}`}
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={(e) =>
                        setAccepted((a) => ({ ...a, [w.id]: e.target.checked }))
                      }
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        on ? 'border-red-500 bg-red-500 text-white' : 'border-black/15 bg-white'
                      }`}
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-xs leading-relaxed text-foreground">{w.text}</span>
                  </label>
                )
              })}
            </div>

            <div>
              <label
                htmlFor="confirm_phrase"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Type <span className="font-mono font-bold">{CONFIRM_PHRASE}</span> to confirm
              </label>
              <input
                id="confirm_phrase"
                name="confirm_phrase"
                autoComplete="off"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-black/[0.06] bg-white px-4 font-mono text-foreground focus:border-red-400 focus:outline-none"
                placeholder={CONFIRM_PHRASE}
              />
            </div>

            {state?.error && (
              <p className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{state.error}</p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={!canDelete}
                className="h-11 flex-1 rounded-xl bg-red-600 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {pending ? 'Deleting…' : 'Permanently delete my account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setAccepted({})
                  setPhrase('')
                }}
                className="h-11 rounded-xl border-2 border-black/[0.08] bg-white px-5 font-semibold text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
