'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { reviewOfferingAction } from '@/app/(admin)/admin/offerings/actions'

export function OfferingReviewControls({ offeringId }: { offeringId: string }) {
  const [rejecting, setRejecting] = useState(false)

  if (rejecting) {
    return (
      <form action={reviewOfferingAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={offeringId} />
        <input type="hidden" name="decision" value="reject" />
        <input
          name="notes"
          autoFocus
          placeholder="Reason for the vendor…"
          className="h-9 px-3 rounded-lg border border-black/10 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button type="submit" className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
          Send
        </button>
        <button type="button" onClick={() => setRejecting(false)} className="px-2 py-1.5 text-muted text-xs hover:text-foreground">
          Cancel
        </button>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <form action={reviewOfferingAction}>
        <input type="hidden" name="id" value={offeringId} />
        <input type="hidden" name="decision" value="approve" />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors inline-flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" /> Approve
        </button>
      </form>
      <button
        type="button"
        onClick={() => setRejecting(true)}
        className="px-3 py-1.5 rounded-lg border border-black/10 text-muted text-xs font-semibold hover:text-red-600 hover:border-red-200 transition-colors inline-flex items-center gap-1"
      >
        <X className="w-3.5 h-3.5" /> Reject
      </button>
    </div>
  )
}
