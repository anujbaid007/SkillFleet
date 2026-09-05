import { BarChart3 } from 'lucide-react'
import { Panel } from '@/components/dashboard/panel'
import { RankedBars } from '@/components/dashboard/charts'
import type { BreakdownRow } from '@/lib/admin/isc'

export type BreakdownLevel = 'state' | 'district' | 'school'

const COPY: Record<BreakdownLevel, { title: string; sub: string; empty: string }> = {
  state: {
    title: 'States',
    sub: 'Students who submitted, most first — open a state to see its districts',
    empty: 'No entry anywhere yet.',
  },
  district: {
    title: 'Districts',
    sub: 'Students who submitted, most first — open a district to see its schools',
    empty: 'No entry in this state yet.',
  },
  school: {
    title: 'Schools',
    sub: 'Students who submitted, most first — open a school to see its entries',
    empty: 'No school in this district yet.',
  },
}

/**
 * The level below the current one: state bars nationally, district bars in a
 * state, school bars in a district.
 *
 * The bars are the drill control. A separate "view" link beside each row would
 * be one more thing to aim at for exactly the same result, and the ranked bar
 * is already what an admin reads when deciding where to look next.
 *
 * The bar is students who SUBMITTED and the small figure beside it is eligible
 * students. `started` is deliberately absent: an entry is scoped by its
 * school's state, so a team-mate from a neighbouring state counts toward the
 * entry's state and a column of started figures does not add up to the
 * national one. A number that looks like a part of a whole and is not is worse
 * than no number.
 *
 * The rows arrive ordered by eligible students; they are re-sorted here so the
 * longest bar is at the top, because a ranked chart whose bars are not ranked
 * reads as broken.
 */
export function IscComparisonChart({
  rows,
  level,
  basePath,
}: {
  rows: BreakdownRow[]
  level: BreakdownLevel
  basePath: string
}) {
  const copy = COPY[level]

  const hrefFor = (key: string) => {
    const k = encodeURIComponent(key)
    if (level === 'state') return `/admin/isc/state/${k}`
    if (level === 'district') return `${basePath}/district/${k}`
    return `${basePath}/school/${k}`
  }

  const ranked = [...rows].sort(
    (a, b) => b.submitted - a.submitted || b.eligible - a.eligible || a.label.localeCompare(b.label)
  )

  return (
    <Panel
      title={copy.title}
      subtitle={copy.sub}
      icon={BarChart3}
      action={
        <span className="whitespace-nowrap text-[11px] text-muted">
          {ranked.length.toLocaleString('en-IN')} {ranked.length === 1 ? 'row' : 'rows'}
        </span>
      }
    >
      <div className="max-h-[26rem] overflow-y-auto pr-1">
        <RankedBars
          rows={ranked.map((r) => ({
            key: r.key,
            label: r.label,
            value: r.submitted,
            meta: `${r.eligible.toLocaleString('en-IN')} eligible`,
            href: hrefFor(r.key),
          }))}
          barClass="bg-gradient-to-r from-emerald-400 to-emerald-500"
          valueClass="text-emerald-600"
          empty={copy.empty}
        />
      </div>
    </Panel>
  )
}
