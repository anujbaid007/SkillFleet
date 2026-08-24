'use client'

import { useActionState, useState } from 'react'
import {
  reviewCoordinatorClaimAction,
  type SchoolReviewState,
} from '@/app/(admin)/admin/schools/actions'

export interface CoordinatorClaim {
  schoolId: string
  schoolName: string
  applicantName: string
  /** Contact number from their profile. Email lives on auth.users, which needs
      the service-role key this environment has not been given yet. */
  applicantPhone: string | null
  board: string | null
  studentCountRange: string | null
}

/**
 * A coordinator claiming a school that is already approved — there is no
 * school-level decision to attach this to, so it gets its own row rather than
 * living inside SchoolReviewRow.
 */
export function CoordinatorClaimRow({ claim }: { claim: CoordinatorClaim }) {
  const [state, action, pending] = useActionState<SchoolReviewState, FormData>(
    reviewCoordinatorClaimAction,
    undefined
  )
  const [rejecting, setRejecting] = useState(false)

  if (state?.ok) {
    return <div className="px-5 py-4 text-sm text-green-700 bg-green-50">{state.ok}</div>
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{claim.applicantName}</p>
          <p className="text-xs text-muted">
            {claim.applicantPhone && `${claim.applicantPhone} · `}
            applying to coordinate <span className="font-medium">{claim.schoolName}</span>
            {claim.board && ` · ${claim.board}`}
            {claim.studentCountRange && ` · ${claim.studentCountRange} students`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
        </div>
      </div>

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
