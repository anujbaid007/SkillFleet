'use client'

import { useActionState, useState } from 'react'
import { Check, Clock, X } from 'lucide-react'
import { reviewSchoolAction, type SchoolReviewState } from '@/app/(admin)/admin/schools/actions'
import type { SimilarSchool } from '@/lib/admin/queues'
import { formatIstDay, istDay } from '@/lib/isc/dates'

export type { SimilarSchool }

export interface PendingSchool {
  id: string
  name: string
  state: string
  district: string
  /** The school's own review state. Only a pending one can still be decided. */
  reviewStatus: string
  created_at: string
  submittedBy: string
  similar: SimilarSchool[]
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Check }> = {
  pending: { label: 'Awaiting review', cls: 'bg-accent-yellow/15 text-accent-yellow', icon: Clock },
  approved: { label: 'Approved', cls: 'bg-green-50 text-green-700', icon: Check },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-600', icon: X },
}

/** One school in the queue, its likely duplicates, and the three decisions. */
export function SchoolReviewRow({ school }: { school: PendingSchool }) {
  const [state, action, pending] = useActionState<SchoolReviewState, FormData>(
    reviewSchoolAction,
    undefined
  )
  const [rejecting, setRejecting] = useState(false)

  // Only an approved school can absorb a duplicate.
  const mergeable = school.similar.filter((s) => s.review_status === 'approved')

  // The threshold that feeds this list is deliberately low, because a missed
  // duplicate splits a school silently while a spurious suggestion only costs
  // a glance. Flagging the strong matches keeps that recall without letting
  // the weak "…Public School" overlaps dull the signal.
  const STRONG_MATCH = 0.6

  const meta = STATUS_META[school.reviewStatus] ?? STATUS_META.pending
  const StatusIcon = meta.icon
  const decided = school.reviewStatus !== 'pending'

  if (state?.ok) {
    return <div className="px-5 py-4 text-sm text-green-700 bg-green-50">{state.ok}</div>
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{school.name}</p>
          {/*
            formatIstDay(istDay(...)), never toLocaleDateString: this renders on
            the server first, whose zone is UTC on Workers, so a school added
            just after midnight in India would read as the previous day.
          */}
          <p className="text-xs text-muted">
            {school.district}, {school.state} · added by {school.submittedBy} ·{' '}
            {formatIstDay(istDay(school.created_at))}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {decided && (
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 ${meta.cls}`}
            >
              <StatusIcon className="w-3 h-3" />
              {meta.label}
            </span>
          )}

          {!decided && (
            <>
              <form action={action}>
                <input type="hidden" name="school_id" value={school.id} />
                <input type="hidden" name="decision" value="approve" />
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {pending ? 'Saving…' : 'Approve'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setRejecting((v) => !v)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-red-600"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {rejecting && !decided && (
        <form action={action} className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="school_id" value={school.id} />
          <input type="hidden" name="decision" value="reject" />
          <input
            name="notes"
            required
            placeholder="Why is this being rejected?"
            className="flex-1 min-w-[220px] h-9 px-3 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="px-4 h-9 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            Confirm reject
          </button>
        </form>
      )}

      {mergeable.length > 0 && !decided && (
        <div className="rounded-xl bg-accent-yellow/[0.08] border border-accent-yellow/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Possibly the same as {mergeable.length === 1 ? 'this' : 'one of these'}:
          </p>
          {mergeable.map((m) => (
            <form key={m.id} action={action} className="flex items-center gap-3 flex-wrap">
              <input type="hidden" name="school_id" value={school.id} />
              <input type="hidden" name="decision" value="merge" />
              <input type="hidden" name="merge_into" value={m.id} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-foreground">{m.name}</span>
                  {m.score >= STRONG_MATCH && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-yellow/20 text-accent-yellow">
                      Close match
                    </span>
                  )}
                </span>
                {m.address && <span className="block text-xs text-muted truncate">{m.address}</span>}
              </span>
              <button
                type="submit"
                disabled={pending}
                className="px-3 h-8 rounded-lg text-xs font-semibold border border-primary text-primary hover:bg-primary/[0.06] disabled:opacity-60 shrink-0"
              >
                Merge into this
              </button>
            </form>
          ))}
        </div>
      )}

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  )
}
