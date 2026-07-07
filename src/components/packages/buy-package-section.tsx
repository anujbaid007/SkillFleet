'use client'

import { useActionState, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { buyPackageAction } from '@/app/(platform)/packages/actions'

interface Child {
  student_id: string
  full_name: string | null
}
interface Tier {
  id: string
  name: string
  slot_count: number
  price_paise: number
  validity_days: number
  description: string | null
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export function BuyPackageSection({
  childrenList,
  tiers,
  packagedStudentIds = [],
}: {
  childrenList: Child[]
  tiers: Tier[]
  packagedStudentIds?: string[]
}) {
  const [state, action, pending] = useActionState(buyPackageAction, undefined)
  const blocked = useMemo(() => new Set(packagedStudentIds), [packagedStudentIds])

  // Default to the first child who can still buy a package.
  const firstAvailable = childrenList.find((c) => !blocked.has(c.student_id))?.student_id
  const [selectedChild, setSelectedChild] = useState(firstAvailable ?? childrenList[0]?.student_id ?? '')
  const selectedBlocked = blocked.has(selectedChild)

  return (
    <form action={action} className="space-y-4">
      <div className="clay-card p-5 space-y-2">
        <label htmlFor="student_id" className="block text-sm font-medium text-foreground">
          Buy for
        </label>
        <select
          id="student_id"
          name="student_id"
          required
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
        >
          {childrenList.map((c) => {
            const has = blocked.has(c.student_id)
            return (
              <option key={c.student_id} value={c.student_id} disabled={has}>
                {c.full_name ?? 'Student'}
                {has ? ' — already has a package' : ''}
              </option>
            )
          })}
        </select>
        {selectedBlocked && (
          <p className="text-sm text-muted">
            This child already has an active package — upgrade it from “Your packages” above.
          </p>
        )}
        {state?.error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{state.error}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div key={t.id} className="clay-card p-5 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center text-white font-display font-bold text-lg mb-3">
                {t.slot_count}
              </div>
              <h3 className="font-display font-bold text-foreground">{t.name}</h3>
              <p className="text-xs text-muted mt-0.5">{t.slot_count} bookings · valid {t.validity_days} days</p>
              {t.description && <p className="text-xs text-muted mt-2 line-clamp-2">{t.description}</p>}
              <p className="font-display text-2xl font-bold text-foreground mt-3">{formatPrice(t.price_paise)}</p>
              <button
                type="submit"
                name="tier_id"
                value={t.id}
                disabled={pending || selectedBlocked}
                className="mt-4 inline-flex items-center justify-center gap-1.5 clay-button bg-cta text-white w-full h-11 font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" /> {pending ? 'Working…' : 'Buy package'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </form>
  )
}
