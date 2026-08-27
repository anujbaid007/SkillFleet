import { BarChart3 } from 'lucide-react'
import { Panel } from '@/components/dashboard/panel'
import { RankedBars } from '@/components/dashboard/charts'

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
 * is already what an admin reads when deciding where to look next.
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
  return (
    <Panel
      title={title}
      subtitle={sub}
      icon={BarChart3}
      action={
        <span className="text-[11px] text-muted whitespace-nowrap">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        </span>
      }
    >
      <div className="max-h-[26rem] overflow-y-auto pr-1">
        <RankedBars
          rows={rows.map((r) => ({
            key: r.href,
            label: r.label,
            value: r.count,
            meta: r.sub,
            href: r.href,
          }))}
          barClass="bg-gradient-to-r from-emerald-400 to-emerald-500"
          valueClass="text-emerald-600"
          empty={empty}
        />
      </div>
    </Panel>
  )
}
