import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface ComparisonRow {
  label: string
  /** What the bar is drawn from — submitted entries at every level. */
  count: number
  sub: string
  href: string
}

/**
 * The level below the current one: state bars nationally, district bars in a
 * state, school bars in a district.
 *
 * The bars are the drill control. A separate "view" link beside each row would
 * be one more thing to aim at for exactly the same result, and the ranked bar
 * is already what an admin is reading when they decide where to look next.
 */
export function IscComparisonChart({
  title,
  sub,
  rows,
  empty,
}: {
  title: string
  sub: string
  rows: ComparisonRow[]
  empty: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <div className="clay-card p-6 sm:p-7">
      <h2 className="font-display font-bold text-foreground text-base">{title}</h2>
      <p className="text-xs text-muted mt-1">{sub}</p>

      {rows.length === 0 ? (
        <p className="text-xs text-muted mt-5">{empty}</p>
      ) : (
        <ul className="mt-5 space-y-3.5 max-h-[28rem] overflow-y-auto">
          {rows.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="block group rounded-xl -mx-2 px-2 py-1.5 hover:bg-black/[0.02] transition-colors"
              >
                <span className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-foreground font-semibold truncate group-hover:underline">
                    {r.label}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-muted">{r.sub}</span>
                    <span className="text-green-700 font-bold tabular-nums text-sm">{r.count}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                  </span>
                </span>
                <span className="block h-2 rounded-full bg-black/[0.05] mt-2 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                    style={{ width: `${(r.count / max) * 100}%` }}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
