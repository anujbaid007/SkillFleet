'use client'

import { useActionState, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { leaveEntryAction, type LeaveState } from '@/app/actions/isc'

/**
 * Withdraw from a solo draft you started but never used.
 *
 * Two-step on purpose: this deletes the entry outright, and it sits directly
 * under a form the student may have been typing into. A single stray click
 * should not throw work away.
 */
export function LeaveEntryButton({ entryId, slug }: { entryId: string; slug: string }) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(leaveEntryAction, undefined)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="clay-card p-5">
      <h2 className="font-display font-bold text-foreground text-sm">Not entering after all?</h2>
      <p className="text-xs text-muted mt-1">
        While you are on your own and have not submitted, you can withdraw this entry. Do this if
        you would rather join a classmate&apos;s team instead — a championship you have started
        yourself stops anyone from adding you to theirs.
      </p>

      {confirming ? (
        <form action={action} className="mt-3 flex items-center gap-2 flex-wrap">
          <input type="hidden" name="entry_id" value={entryId} />
          <input type="hidden" name="slug" value={slug} />
          <p className="w-full text-xs text-foreground font-medium">
            This deletes the entry and anything saved in it. This cannot be undone.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="px-4 h-9 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? 'Withdrawing…' : 'Yes, withdraw my entry'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="px-3 h-9 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-foreground"
          >
            Keep it
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 px-3 h-9 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-red-600 inline-flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Leave this championship
        </button>
      )}

      {state?.error && <p className="text-xs text-red-600 mt-2">{state.error}</p>}
    </div>
  )
}
