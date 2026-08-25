'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { startEntryAction, type StartState } from '@/app/actions/isc'

export function EnterTrackButton({ slug, needsConsent }: { slug: string; needsConsent: boolean }) {
  const [state, action, pending] = useActionState<StartState, FormData>(startEntryAction, undefined)

  // Consent is a one-time step for the season, so it is asked before the first
  // entry rather than on every form. Sending them there first means the draft
  // is only created once they have actually agreed.
  if (needsConsent) {
    return (
      <Link
        href={`/isc/consent?next=${encodeURIComponent(`/isc/${slug}`)}`}
        className="clay-button bg-cta text-white px-6 h-12 text-sm font-semibold inline-flex items-center gap-2"
      >
        Enter this track
        <ArrowRight className="w-4 h-4" />
      </Link>
    )
  }

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white px-6 h-12 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
      >
        {pending ? 'Opening…' : 'Enter this track'}
        <ArrowRight className="w-4 h-4" />
      </button>
      {state?.error && <p className="text-sm text-red-600 mt-2">{state.error}</p>}
    </form>
  )
}
