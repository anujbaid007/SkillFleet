'use client'

import { useActionState, useState } from 'react'
import { Check } from 'lucide-react'
import { bulkRedeemAction } from '@/app/(platform)/packages/[id]/book/actions'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'

interface Offering {
  id: string
  title: string
  type: string
  price_paise: number
  scheduled_at: string | null
  category: string | null
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function BulkBookForm({
  packageId,
  remaining,
  offerings,
}: {
  packageId: string
  remaining: number
  offerings: Offering[]
}) {
  const [state, action, pending] = useActionState(bulkRedeemAction, undefined)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < remaining) next.add(id)
      return next
    })
  }

  const atLimit = selected.size >= remaining

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="space-y-2.5">
        {offerings.map((o) => {
          const meta = OFFERING_TYPE_META[o.type]
          const Icon = meta?.icon
          const isSel = selected.has(o.id)
          const disabled = !isSel && atLimit
          const date = fmtDate(o.scheduled_at)
          return (
            <label
              key={o.id}
              className={`clay-card p-4 flex items-center gap-4 cursor-pointer transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isSel ? 'ring-2 ring-primary/40' : ''}`}
            >
              <input
                type="checkbox"
                name="offering_ids"
                value={o.id}
                checked={isSel}
                disabled={disabled}
                onChange={() => toggle(o.id)}
                className="w-5 h-5 rounded accent-[color:var(--color-primary)] shrink-0"
              />
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                {Icon && <Icon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-foreground text-sm truncate">{o.title}</p>
                <p className="text-xs text-muted">
                  {meta?.label ?? o.type}
                  {o.category ? ` · ${o.category}` : ''}
                  {date ? ` · ${date}` : ''} · {formatPrice(o.price_paise)}
                </p>
              </div>
            </label>
          )
        })}
      </div>

      {state?.error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>}

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-10">
        <div className="clay-card p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            <span className="font-display font-bold text-foreground">{selected.size}</span> selected ·{' '}
            {remaining} slot{remaining === 1 ? '' : 's'} available
          </p>
          <button
            type="submit"
            disabled={pending || selected.size === 0}
            className="clay-button bg-cta text-white px-6 h-11 font-semibold text-sm inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            {pending
              ? 'Booking…'
              : `Book ${selected.size} · use ${selected.size} slot${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </form>
  )
}
