'use client'

import { useActionState } from 'react'
import { Layers, Loader2 } from 'lucide-react'
import { bookPlanWithPackageAction } from '@/app/(platform)/recommendations/actions'

/**
 * Redeems every offering in the plan against the child's package in one click.
 * Only rendered when the child has an active package with slots remaining; the
 * RPC itself caps at the remaining slot count and skips anything ineligible.
 */
export function BookPlanButton({
  packageId,
  offeringIds,
  slotsRemaining,
}: {
  packageId: string
  offeringIds: string[]
  slotsRemaining: number
}) {
  const [state, action, pending] = useActionState(bookPlanWithPackageAction, undefined)
  const willBook = Math.min(offeringIds.length, slotsRemaining)

  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="package_id" value={packageId} />
      {offeringIds.map((id) => (
        <input key={id} type="hidden" name="offering_ids" value={id} />
      ))}
      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white px-5 h-11 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
        {pending ? 'Booking…' : `Redeem ${willBook} with package`}
      </button>
      {state?.error && <span className="block text-xs text-red-500">{state.error}</span>}
    </form>
  )
}
