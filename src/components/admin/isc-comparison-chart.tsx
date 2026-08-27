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
    <div className="clay-card p-5">
      <h2 className="font-display font-bold text-foreground text-sm">{title}</h2>
      <p className="text-xs text-muted mt-0.5">{sub}</p>

      {rows.length === 0 ? (
        <p className="text-xs text-muted mt-3">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="block group rounded-lg -mx-1 px-1 py-0.5 hover:bg-black/[0.02]">
                <span className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-foreground font-medium truncate group-hover:underline">
                    {r.label}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-muted">{r.sub}</span>
                    <span className="text-green-700 font-semibold tabular-nums">{r.count}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                  </span>
                </span>
                <span className="block h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-primary"
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
