'use client'

import { useActionState, useState } from 'react'
import { Ticket } from 'lucide-react'
import { bookOfferingAction, redeemPackageSlotAction } from '@/app/(platform)/catalog/actions'
import { calculateAge, isAgeEligible } from '@/lib/utils/age'

interface Child {
  student_id: string
  full_name: string | null
  date_of_birth: string | null
}

interface PackageOption {
  id: string
  student_id: string
  slots_remaining: number
}

interface Props {
  offeringId: string
  offeringMinAge: number | null
  offeringMaxAge: number | null
  childrenList: Child[]
  packages: PackageOption[]
}

export function BookOfferingForm({
  offeringId,
  offeringMinAge,
  offeringMaxAge,
  childrenList,
  packages,
}: Props) {
  const [payState, payAction, payPending] = useActionState(bookOfferingAction, undefined)
  const [redeemState, redeemAction, redeemPending] = useActionState(redeemPackageSlotAction, undefined)
  const [selectedChild, setSelectedChild] = useState(childrenList[0]?.student_id ?? '')

  const child = childrenList.find((c) => c.student_id === selectedChild)
  const age = child?.date_of_birth ? calculateAge(child.date_of_birth) : null
  const eligible = age === null || isAgeEligible(age, offeringMinAge, offeringMaxAge)
  const pkg = packages.find((p) => p.student_id === selectedChild)
  const error = payState?.error ?? redeemState?.error

  return (
    <div className="clay-card p-5 space-y-4">
      <div>
        <label htmlFor="student_id" className="block text-sm font-medium text-foreground mb-1">
          Book for
        </label>
        <select
          id="student_id"
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
        >
          {childrenList.map((c) => {
            const a = c.date_of_birth ? calculateAge(c.date_of_birth) : null
            const ok = a === null || isAgeEligible(a, offeringMinAge, offeringMaxAge)
            return (
              <option key={c.student_id} value={c.student_id} disabled={!ok}>
                {c.full_name ?? 'Student'}
                {a !== null ? ` (age ${a})` : ''}
                {!ok ? ' — outside age range' : ''}
              </option>
            )
          })}
        </select>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {/* Redeem a package slot (free) if this child has one */}
      {pkg && eligible && (
        <form action={redeemAction}>
          <input type="hidden" name="package_id" value={pkg.id} />
          <input type="hidden" name="offering_id" value={offeringId} />
          <button
            type="submit"
            disabled={redeemPending}
            className="clay-button bg-primary text-white w-full h-11 font-semibold text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Ticket className="w-4 h-4" />
            {redeemPending ? 'Redeeming…' : `Use 1 package slot (${pkg.slots_remaining} left)`}
          </button>
        </form>
      )}

      {/* Pay à la carte */}
      <form action={payAction}>
        <input type="hidden" name="offering_id" value={offeringId} />
        <input type="hidden" name="student_id" value={selectedChild} />
        <button
          type="submit"
          disabled={payPending || !eligible}
          className={`w-full h-11 font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed ${
            pkg
              ? 'rounded-xl border border-black/10 text-muted hover:text-foreground transition-colors'
              : 'clay-button bg-cta text-white'
          }`}
        >
          {payPending ? 'Booking…' : pkg ? 'Or book & pay separately' : 'Book & continue to payment'}
        </button>
      </form>
    </div>
  )
}
