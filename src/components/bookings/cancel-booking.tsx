'use client'

import { useActionState, useState } from 'react'
import { XCircle, Loader2, Wallet } from 'lucide-react'
import { cancelBookingAction } from '@/app/(platform)/wallet/actions'

function formatPrice(paise: number) {
  return paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`
}

/**
 * Cancel-with-refund control. Only rendered when the 15-day rule allows it —
 * the RPC re-checks server-side regardless.
 */
export function CancelBooking({ bookingId, refundPaise }: { bookingId: string; refundPaise: number }) {
  const [state, action, pending] = useActionState(cancelBookingAction, undefined)
  const [confirming, setConfirming] = useState(false)

  if (state?.ok) {
    return (
      <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3 inline-flex items-center gap-2">
        <Wallet className="w-4 h-4" /> {state.ok}
      </p>
    )
  }

  if (!confirming) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-black/10 text-sm font-medium text-muted hover:text-red-600 hover:border-red-200 transition-colors"
        >
          <XCircle className="w-4 h-4" /> Cancel booking
        </button>
        {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      </div>
    )
  }

  return (
    <form action={action} className="clay-card p-4 space-y-3 bg-red-50/40">
      <input type="hidden" name="booking_id" value={bookingId} />
      <div>
        <p className="font-semibold text-foreground text-sm">Cancel this booking?</p>
        <p className="text-sm text-muted mt-0.5">
          {refundPaise > 0
            ? `${formatPrice(refundPaise)} will be added to your wallet, ready to spend on any other activity.`
            : 'This booking has not been paid for, so there is nothing to refund.'}
        </p>
      </div>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="clay-button bg-red-500 text-white px-4 h-10 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          {pending ? 'Cancelling…' : 'Yes, cancel'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-10 px-4 rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          Keep it
        </button>
      </div>
    </form>
  )
}
