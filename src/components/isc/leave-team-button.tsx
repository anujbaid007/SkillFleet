'use client'

import { useActionState, useState } from 'react'
import { LogOut } from 'lucide-react'
import { leaveTeamAction, type LeaveState } from '@/app/actions/isc'

/**
 * Leave a team you accepted an invite to.
 *
 * Until this existed a teammate had no way out except asking their leader to
 * remove them. Two-step, like the leader's withdraw button: leaving frees you
 * to join or start another entry on this track, but the entry you leave keeps
 * going without you.
 */
export function LeaveTeamButton({ entryId, slug }: { entryId: string; slug: string }) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(leaveTeamAction, undefined)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="clay-card p-4 sm:p-5">
      <h2 className="font-display font-bold text-foreground text-sm">Want to leave this team?</h2>
      <p className="text-xs text-muted mt-1">
        You can step off while the entry is still a draft. The team carries on without you, and
        you are free to join another team or start your own on this track.
      </p>

      {confirming ? (
        <form action={action} className="mt-3 flex items-center gap-2 flex-wrap">
          <input type="hidden" name="entry_id" value={entryId} />
          <input type="hidden" name="slug" value={slug} />
          <p className="w-full text-xs text-foreground font-medium">
            Your leader will need to invite you again if you change your mind.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="px-4 h-11 sm:h-9 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? 'Leaving…' : 'Yes, leave the team'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="px-3 h-11 sm:h-9 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-foreground"
          >
            Stay
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 px-3 h-11 sm:h-9 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-red-600 inline-flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Leave this team
        </button>
      )}

      {state?.error && <p className="text-xs text-red-600 mt-2">{state.error}</p>}
    </div>
  )
}
