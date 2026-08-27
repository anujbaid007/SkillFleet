'use client'

import { useActionState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { giveConsentAction, type ConsentState } from '@/app/actions/isc'

export function ConsentForm({ guardianName, next }: { guardianName: string; next: string }) {
  const [state, action, pending] = useActionState<ConsentState, FormData>(
    giveConsentAction,
    undefined
  )

  return (
    <form action={action} className="clay-card p-6 sm:p-8 space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            One thing before you enter
          </h1>
          <p className="text-sm text-muted mt-1">
            ISC is open to students under 18, so a parent or guardian needs to agree once before
            your first entry. You won’t be asked again this season.
          </p>
        </div>
      </div>

      <ul className="space-y-2 text-sm text-muted rounded-xl bg-black/[0.02] p-4">
        <li>• They agree to you taking part in ISC 2026.</li>
        <li>
          • They agree to Skill Fleet showing your entry for the championship and its promotion.
        </li>
        <li>• Your work stays yours — you keep ownership of everything you submit.</li>
        <li>• If you win, they agree to your name being announced.</li>
      </ul>

      <div>
        <label htmlFor="guardian_name" className="block text-sm font-medium text-foreground mb-1">
          Parent or guardian’s name
        </label>
        <input
          id="guardian_name"
          name="guardian_name"
          required
          defaultValue={guardianName}
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
        />
        <p className="text-xs text-muted mt-1">
          {guardianName
            ? 'Taken from your family details — change it if someone else is agreeing.'
            : 'The adult giving permission for you to take part.'}
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'My parent or guardian agrees'}
      </button>
    </form>
  )
}
