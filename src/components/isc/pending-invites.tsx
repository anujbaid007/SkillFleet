'use client'

import { useActionState } from 'react'
import { Trophy } from 'lucide-react'
import { respondToInviteAction, type RespondState, type PendingInvite } from '@/app/actions/isc'
import { trackById } from '@/lib/isc/tracks'

function InviteCard({ invite }: { invite: PendingInvite }) {
  const [state, action, pending] = useActionState<RespondState, FormData>(
    respondToInviteAction,
    undefined
  )
  const track = trackById(invite.track)

  return (
    <div className="clay-card p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-primary" />
        </span>
        <p className="text-sm text-foreground min-w-0">
          <span className="font-semibold">{invite.leaderName ?? 'A classmate'}</span> invited you to
          join <span className="font-semibold">{track?.name ?? invite.track}</span>
        </p>
      </div>
      {/* The two answers share the width on a phone, so neither is a small
          target sitting at the end of a wrapped row. */}
      <form action={action} className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
        <input type="hidden" name="member_id" value={invite.memberId} />
        <button
          type="submit"
          name="intent"
          value="decline"
          disabled={pending}
          className="flex-1 sm:flex-none px-3 h-11 sm:h-9 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-foreground disabled:opacity-60"
        >
          Decline
        </button>
        <button
          type="submit"
          name="intent"
          value="accept"
          disabled={pending}
          className="flex-1 sm:flex-none px-4 h-11 sm:h-9 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
        >
          Accept
        </button>
      </form>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </div>
  )
}

/** Team invites this student has not yet responded to, shown above the track
    cards on /isc — the same prominent spot the group line already occupies. */
export function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  if (invites.length === 0) return null
  return (
    <div className="space-y-2">
      {invites.map((inv) => (
        <InviteCard key={inv.memberId} invite={inv} />
      ))}
    </div>
  )
}
