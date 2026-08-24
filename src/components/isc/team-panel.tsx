'use client'

import { useActionState, useState } from 'react'
import { Check, Clock, Copy, X } from 'lucide-react'
import {
  addMemberAction,
  removeMemberAction,
  type TeamState,
  type IscMember,
} from '@/app/actions/isc'

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
}: {
  entryId: string
  slug: string
  members: IscMember[]
  maxTeamSize: number
  canEdit: boolean
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

  return (
    <div className="clay-card p-6 space-y-4">
      <div>
        <h2 className="font-display font-bold text-foreground">Your team</h2>
        <p className="text-xs text-muted mt-1">
          You can enter on your own, or with up to {maxTeamSize - 1} classmates from your school.
        </p>
      </div>

      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.memberId}
            className="flex items-center justify-between gap-3 rounded-xl bg-black/[0.02] px-3 py-2"
          >
            <span className="min-w-0 flex items-center gap-2 text-sm">
              {m.userId ? (
                <Check className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-accent-yellow shrink-0" />
              )}
              <span className="truncate">
                <span className="font-medium text-foreground">{m.name ?? m.invitedEmail}</span>
                {m.schoolClass && <span className="text-muted"> · {m.schoolClass}</span>}
                {m.isLeader && <span className="text-muted"> · team leader</span>}
                {!m.userId && <span className="text-muted"> · not signed up yet</span>}
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
            placeholder="Classmate's email"
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

      {(addState?.error ?? removeState?.error) && (
        <p className="text-sm text-red-600">{addState?.error ?? removeState?.error}</p>
      )}
      {(addState?.ok ?? removeState?.ok) && (
        <p className="text-sm text-green-700">{addState?.ok ?? removeState?.ok}</p>
      )}
    </div>
  )
}
