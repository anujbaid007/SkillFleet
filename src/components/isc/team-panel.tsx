'use client'

import { useActionState, useState } from 'react'
import { AlertTriangle, Check, Clock, Copy, X } from 'lucide-react'
import {
  addMemberAction,
  removeMemberAction,
  type TeamState,
  type IscMember,
} from '@/app/actions/isc'
import { iscGroupForClass, iscGroupLabel } from '@/lib/isc/groups'

function inviteUrl(token: string) {
  const base = typeof window === 'undefined' ? '' : window.location.origin
  return `${base}/signup?invite=${token}`
}

export function TeamPanel({
  entryId,
  slug,
  members,
  maxTeamSize,
  canEdit,
  submitted = false,
}: {
  entryId: string
  slug: string
  members: IscMember[]
  maxTeamSize: number
  canEdit: boolean
  /** A submitted entry's team is frozen along with its answers. */
  submitted?: boolean
}) {
  const [addState, addAction, adding] = useActionState<TeamState, FormData>(
    addMemberAction,
    undefined
  )
  const [removeState, removeAction] = useActionState<TeamState, FormData>(
    removeMemberAction,
    undefined
  )
  const [copied, setCopied] = useState<string | null>(null)

  const full = members.length >= maxTeamSize

  // The leader anchors the team's group. A pending invited-by-email member has
  // no school_class yet — their group is unknown until isc_claim_invites
  // resolves it, so they are never flagged here.
  const leader = members.find((m) => m.isLeader)
  const leaderGroup = iscGroupForClass(leader?.schoolClass)
  const mismatched = members.filter(
    (m) => !m.isLeader && m.userId && iscGroupForClass(m.schoolClass) !== leaderGroup
  )

  return (
    <div className="clay-card p-6 space-y-4">
      <div>
        <h2 className="font-display font-bold text-foreground">Your team</h2>
        <p className="text-xs text-muted mt-1">
          You can enter on your own, or with up to {maxTeamSize - 1} classmates from your school.
        </p>
        {leaderGroup && (
          <p className="text-xs text-muted mt-1">
            This team is {iscGroupLabel(leaderGroup)} — teammates must be from those classes too.
          </p>
        )}
      </div>

      {mismatched.length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            <span className="font-semibold">
              {mismatched.map((m) => m.name ?? 'A teammate').join(', ')}
            </span>{' '}
            {mismatched.length === 1 ? 'is' : 'are'} in a different group. Teams can only include
            classmates from the same group — remove them before this entry can be submitted.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.memberId}
            className="flex items-center justify-between gap-3 rounded-xl bg-black/[0.02] px-3 py-2"
          >
            <span className="min-w-0 flex items-center gap-2 text-sm">
              {m.userId && m.acceptedAt ? (
                <Check className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-accent-yellow shrink-0" />
              )}
              <span className="truncate">
                <span className="font-medium text-foreground">{m.name ?? m.invitedEmail}</span>
                {m.schoolClass && <span className="text-muted"> · {m.schoolClass}</span>}
                {m.isLeader && <span className="text-muted"> · team leader</span>}
                {!m.userId && (
                  <span className="text-accent-yellow"> · not registered yet — invite sent</span>
                )}
                {m.userId && !m.acceptedAt && (
                  <span className="text-accent-yellow"> · invited — waiting for them to accept</span>
                )}
              </span>
            </span>

            <span className="flex items-center gap-1 shrink-0">
              {!m.userId && m.inviteToken && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl(m.inviteToken as string))
                    setCopied(m.memberId)
                  }}
                  className="px-2 h-8 rounded-lg text-xs font-semibold border border-black/10 text-muted hover:text-foreground inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copied === m.memberId ? 'Copied' : 'Copy link'}
                </button>
              )}
              {!m.userId && m.inviteToken && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Join my ISC 2026 team on SkillFleet: ${inviteUrl(m.inviteToken)}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 h-8 rounded-lg text-xs font-semibold border border-black/10 text-muted hover:text-foreground inline-flex items-center"
                >
                  WhatsApp
                </a>
              )}
              {canEdit && !m.isLeader && (
                <form action={removeAction}>
                  <input type="hidden" name="entry_id" value={entryId} />
                  <input type="hidden" name="member_id" value={m.memberId} />
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    aria-label="Remove from team"
                    className="w-8 h-8 rounded-lg text-muted hover:text-red-600 inline-flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              )}
            </span>
          </li>
        ))}
      </ul>

      {canEdit && !full && (
        <form action={addAction} className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="entry_id" value={entryId} />
          <input type="hidden" name="slug" value={slug} />
          <input
            name="email"
            type="email"
            required
            placeholder="Teammate's registered SkillFleet email"
            aria-label="Teammate email"
            className="flex-1 min-w-[220px] h-10 px-3 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-4 h-10 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {adding ? 'Checking…' : 'Add'}
          </button>
        </form>
      )}

      {canEdit && full && <p className="text-xs text-muted">Your team is full.</p>}

      {submitted && (
        <p className="text-xs text-muted">
          This entry has been submitted, so the team is now final too.
        </p>
      )}

      {(addState?.error ?? removeState?.error) && (
        <p className="text-sm text-red-600">{addState?.error ?? removeState?.error}</p>
      )}
      {(addState?.ok ?? removeState?.ok) && (
        <p className="text-sm text-green-700">{addState?.ok ?? removeState?.ok}</p>
      )}
    </div>
  )
}
