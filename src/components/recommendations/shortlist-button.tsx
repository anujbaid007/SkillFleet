'use client'

import { useActionState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { shortlistAction } from '@/app/(platform)/recommendations/actions'

export function ShortlistButton({ offeringId, shortlisted }: { offeringId: string; shortlisted: boolean }) {
  const [, action, pending] = useActionState(shortlistAction, undefined)

  return (
    <form action={action}>
      <input type="hidden" name="offering_id" value={offeringId} />
      <input type="hidden" name="on" value={shortlisted ? '0' : '1'} />
      <button
        type="submit"
        disabled={pending}
        className={[
          'inline-flex items-center gap-1.5 rounded-xl px-3.5 h-9 text-sm font-semibold transition-colors disabled:opacity-60',
          shortlisted
            ? 'bg-accent-yellow/15 text-accent-yellow'
            : 'bg-black/[0.05] text-muted hover:text-foreground',
        ].join(' ')}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Star className={`w-4 h-4 ${shortlisted ? 'fill-current' : ''}`} />
        )}
        {shortlisted ? 'Shortlisted' : 'Shortlist'}
      </button>
    </form>
  )
}
