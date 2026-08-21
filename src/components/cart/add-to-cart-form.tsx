'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Check, Loader2 } from 'lucide-react'
import { addToCartAction } from '@/app/(platform)/cart/actions'
import { calculateAge, isAgeEligible } from '@/lib/utils/age'

interface Child {
  student_id: string
  full_name: string | null
  date_of_birth: string | null
}

interface Props {
  offeringId: string
  offeringMinAge: number | null
  offeringMaxAge: number | null
  childrenList: Child[]
  /** student_ids that already have this activity in the cart */
  inCartFor: string[]
}

export function AddToCartForm({ offeringId, offeringMinAge, offeringMaxAge, childrenList, inCartFor }: Props) {
  const [state, action, pending] = useActionState(addToCartAction, undefined)
  const [selectedChild, setSelectedChild] = useState(childrenList[0]?.student_id ?? '')

  const child = childrenList.find((c) => c.student_id === selectedChild)
  const age = child?.date_of_birth ? calculateAge(child.date_of_birth) : null
  const eligible = age === null || isAgeEligible(age, offeringMinAge, offeringMaxAge)
  const alreadyInCart = inCartFor.includes(selectedChild) || state?.ok != null

  return (
    <form action={action} className="clay-card p-5 space-y-4">
      <input type="hidden" name="offering_id" value={offeringId} />

      <div>
        <label htmlFor="student_id" className="block text-sm font-medium text-foreground mb-1">
          Book for
        </label>
        <select
          id="student_id"
          name="student_id"
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
        >
          {childrenList.map((c) => {
            const a = c.date_of_birth ? calculateAge(c.date_of_birth) : null
            const ok = a === null || isAgeEligible(a, offeringMinAge, offeringMaxAge)
            return (
              <option key={c.student_id} value={c.student_id}>
                {c.full_name ?? 'Student'}
                {a !== null ? ` (age ${a})` : ''}
                {ok ? '' : ' — outside age range'}
              </option>
            )
          })}
        </select>
      </div>

      {!eligible && (
        <p className="text-sm text-accent-yellow bg-accent-yellow/10 rounded-xl px-4 py-3">
          This activity is for ages {offeringMinAge ?? '0'}–{offeringMaxAge ?? '18+'}.
        </p>
      )}

      {state?.error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>}

      {alreadyInCart ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
            <Check className="w-4 h-4" /> In your cart
          </span>
          <Link href="/cart" className="clay-button bg-cta text-white px-5 h-11 text-sm font-semibold inline-flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Go to cart
          </Link>
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending || !eligible}
          className="clay-button bg-cta text-white px-5 h-11 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
          {pending ? 'Adding…' : 'Add to cart'}
        </button>
      )}

      <p className="text-xs text-muted">
        Add more activities to unlock a bulk discount — 6+ save 10%, 12+ save 15%, 15+ save 20%, 18+ save 25%.
      </p>
    </form>
  )
}
