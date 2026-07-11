'use client'

import { useActionState, useState } from 'react'
import { CalendarRange, Loader2 } from 'lucide-react'
import { generatePlanAction } from '@/app/(platform)/recommendations/actions'

const SIZES = [6, 12, 15, 18]

export function PlanBuilder({
  studentId,
  defaultSize,
  hasPlan,
}: {
  studentId: string
  defaultSize: number
  hasPlan: boolean
}) {
  const [state, action, pending] = useActionState(generatePlanAction, undefined)
  const [size, setSize] = useState(defaultSize)

  return (
    <form action={action} className="clay-card p-5 space-y-4">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="size" value={size} />

      <div>
        <p className="font-display font-bold text-foreground">How many activities this year?</p>
        <p className="text-sm text-muted">Pick a target — we&apos;ll assemble a balanced plan across the growth gaps.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SIZES.map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setSize(n)}
            className={[
              'h-10 min-w-[3.5rem] px-4 rounded-xl text-sm font-bold transition-colors',
              size === n ? 'bg-primary text-white' : 'bg-black/[0.05] text-muted hover:text-foreground',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className="clay-button bg-cta text-white px-5 h-11 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
          {pending ? 'Planning the year…' : hasPlan ? `Rebuild ${size}-activity plan` : `Plan ${size} activities`}
        </button>
        {state?.error && <span className="text-xs text-red-500">{state.error}</span>}
      </div>
    </form>
  )
}
