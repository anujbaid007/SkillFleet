'use client'

import { useFormStatus } from 'react-dom'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { toggleInterestAction } from '@/app/(platform)/requests/actions'

function Inner({ interested }: { interested: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        'inline-flex items-center gap-2 clay-button px-5 h-11 text-sm font-semibold transition-colors disabled:opacity-60',
        interested ? 'bg-accent-yellow/15 text-accent-yellow' : 'bg-cta text-white',
      ].join(' ')}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : interested ? (
        <BellRing className="w-4 h-4" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {interested ? 'You’ll be notified' : 'Notify me when live'}
    </button>
  )
}

export function NotifyMeButton({ offeringId, interested }: { offeringId: string; interested: boolean }) {
  return (
    <form action={toggleInterestAction}>
      <input type="hidden" name="offering_id" value={offeringId} />
      <Inner interested={interested} />
    </form>
  )
}
