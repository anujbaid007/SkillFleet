'use client'

import { useActionState, useState } from 'react'
import { AlertTriangle, Check, Clock, X } from 'lucide-react'
import {
  reviewCoordinatorClaimAction,
  type SchoolReviewState,
} from '@/app/(admin)/admin/schools/actions'

export interface CoordinatorClaim {
  schoolId: string
  schoolName: string
  schoolLocation: string
  /** The school's own review state — a claim can sit on a school that is
      itself still awaiting approval, and the admin should see that. */
  schoolReviewStatus: string
  coordinatorStatus: string
  reviewNotes: string | null
  applicantName: string
  /** Contact number from their profile. Email lives on auth.users, which needs
      the service-role key this environment has not been given yet. */
  applicantPhone: string | null
  board: string | null
  studentCountRange: string | null
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Check }> = {
  pending: { label: 'Awaiting review', cls: 'bg-accent-yellow/15 text-accent-yellow', icon: Clock },
  approved: { label: 'Approved', cls: 'bg-green-50 text-green-700', icon: Check },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-600', icon: X },
}

export function CoordinatorClaimRow({ claim }: { claim: CoordinatorClaim }) {
  const [state, action, pending] = useActionState<SchoolReviewState, FormData>(
    reviewCoordinatorClaimAction,
    undefined
  )
  const [rejecting, setRejecting] = useState(false)

  if (state?.ok) {
    return <div className="px-5 py-4 text-sm text-green-700 bg-green-50">{state.ok}</div>
  }

  const meta = STATUS_META[claim.coordinatorStatus] ?? STATUS_META.pending
  const StatusIcon = meta.icon
  const decided = claim.coordinatorStatus !== 'pending'

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{claim.applicantName}</p>
          <p className="text-xs text-muted">
            {claim.applicantPhone && `${claim.applicantPhone} · `}
            wants to coordinate <span className="font-medium">{claim.schoolName}</span> ·{' '}
            {claim.schoolLocation}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {claim.board ?? 'Board not given'}
            {claim.studentCountRange && ` · ${claim.studentCountRange} students`}
          </p>

          {/* A claim can arrive on a school that is itself still unverified —
              worth knowing before vouching for the person running it. */}
          {claim.schoolReviewStatus !== 'approved' && (
            <p className="text-xs text-accent-yellow inline-flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" />
              This school is still {claim.schoolReviewStatus} in the schools queue
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 ${meta.cls}`}
          >
            <StatusIcon className="w-3 h-3" />
            {meta.label}
          </span>

          {!decided && (
            <>
              <form action={action}>
                <input type="hidden" name="school_id" value={claim.schoolId} />
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

      {claim.coordinatorStatus === 'rejected' && claim.reviewNotes && (
        <p className="text-xs text-muted rounded-xl bg-black/[0.02] px-3 py-2">
          Reason given: {claim.reviewNotes}
        </p>
      )}

      {rejecting && (
        <form action={action} className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="school_id" value={claim.schoolId} />
          <input type="hidden" name="decision" value="reject" />
          <input
            name="notes"
            required
            placeholder="Why is this being rejected?"
            aria-label="Reason for rejecting this application"
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

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  )
}
