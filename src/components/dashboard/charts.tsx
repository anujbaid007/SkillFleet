import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { STATUS_COLOR, type StatusKey } from '@/components/dashboard/status'

export interface RankedBar {
  key: string
  label: string
  value: number
  /** Small right-aligned context, e.g. "12 schools". */
  meta?: string
  /** Present when the row drills somewhere. */
  href?: string
}

/**
 * A ranked horizontal bar chart.
 *
 * Bars are scaled against the largest value rather than a total, because these
 * charts answer "who is ahead of whom", and scaling to a total flattens every
 * bar into a sliver as soon as one row dominates.
 */
export function RankedBars({
  rows,
  barClass = 'bg-gradient-to-r from-primary to-primary-light',
  valueClass = 'text-foreground',
  empty = 'Nothing to show yet.',
  max: maxOverride,
}: {
  rows: RankedBar[]
  barClass?: string
  valueClass?: string
  empty?: string
  max?: number
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted py-6 text-center">{empty}</p>
  }

  const max = maxOverride ?? Math.max(1, ...rows.map((r) => r.value))

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-[13px] font-semibold text-foreground truncate">{r.label}</span>
              <span className="flex items-baseline gap-2 shrink-0">
                {r.meta && <span className="text-[11px] text-muted">{r.meta}</span>}
                <span className={`text-sm font-bold tabular-nums ${valueClass}`}>{r.value}</span>
                {r.href && <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </>
        )

        return (
          <li key={r.key}>
            {r.href ? (
              <Link
                href={r.href}
                className="block rounded-lg py-1.5 px-2 hover:bg-slate-50 transition-colors group"
              >
                {body}
              </Link>
            ) : (
              <div className="py-1">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export interface Segment {
  status: StatusKey
  value: number
  /**
   * Overrides the status vocabulary's default wording.
   *
   * Needed wherever a bar counts people but sits near a panel counting
   * entries: "Submitted 2" beside "2 submitted · 2 still draft" reads as a
   * contradiction unless each says plainly what it is counting.
   */
  label?: string
}

/**
 * One stacked bar showing how a whole splits by status, with a legend.
 *
 * Used wherever the question is "of everyone, how many are where" — a shape a
 * row of separate numbers cannot show at a glance.
 */
export function SplitBar({ segments, total }: { segments: Segment[]; total: number }) {
  const safeTotal = Math.max(1, total)
  const shown = segments.filter((s) => s.value > 0)

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
        {shown.map((s) => (
          <div
            key={s.status}
            className={STATUS_COLOR[s.status].bar}
            style={{ width: `${(s.value / safeTotal) * 100}%` }}
            title={`${s.label ?? STATUS_COLOR[s.status].label}: ${s.value}`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
        {segments.map((s) => (
          <li key={s.status} className="flex items-center gap-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[s.status].bar}`} />
            <span className="text-muted">{s.label ?? STATUS_COLOR[s.status].label}</span>
            <span className="font-bold text-foreground tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A compact "x of y" progress row — the shape used for per-class and
 * per-group participation, where the denominator matters as much as the value.
 */
export function ProgressRow({
  label,
  value,
  of,
  barClass = 'bg-primary',
}: {
  label: string
  value: number
  of: number
  barClass?: string
}) {
  const pct = of > 0 ? (value / of) * 100 : 0
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-xs mb-1.5">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-muted tabular-nums">
          <span className="font-bold text-foreground">{value}</span> of {of}
          <span className="ml-2 text-[11px]">{Math.round(pct)}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}
