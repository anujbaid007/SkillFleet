/*
  A smoke render of the two components the admin overview's championship block
  is made of.

  They are the only parts of that page a browser cannot reach until
  docs/admin-scale-migration.sql has been pasted -- until then the block is the
  migration panel -- so this is where they are proved to render at all, with
  real numbers and with nothing at all.

  The first test is the ruling that cost the most to learn: submitted/eligible
  reaches 1.39, so neither state list may show a percentage or a bar. It is
  asserted on the markup, not left to a comment.
*/

import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DashboardStates } from '@/components/admin/dashboard-states'
import { IscTimelineChart } from '@/components/admin/isc-timeline-chart'
import type { BreakdownRow } from '@/lib/admin/isc'

/** Tamil Nadu on the harness seed: 233 submitted against 168 eligible. */
const top: BreakdownRow[] = [
  { key: 'Tamil Nadu', label: 'Tamil Nadu', eligible: 168, started: 240, submitted: 233, schools: 12 },
]
const stalled: BreakdownRow[] = [
  { key: 'Uttar Pradesh', label: 'Uttar Pradesh', eligible: 4200, started: 30, submitted: 4, schools: 90 },
]

describe('DashboardStates', () => {
  it('shows the two counts with their units and never a percentage or a bar', () => {
    const s = renderToStaticMarkup(h(DashboardStates, { top, stalled }))
    expect(s).toContain('233')
    expect(s).toContain('168')
    expect(s).toContain('submitted')
    expect(s).toContain('eligible')
    // 233/168 is 139%, which is why nothing on this component is a percentage.
    // Read as text, so a class name or a %20 in an href cannot pass for one.
    const text = s.replace(/<[^>]*>/g, ' ')
    expect(text).not.toContain('%')
    expect(text).not.toContain('139')
    // ...and no bar: a bar is a width the row works out for itself.
    expect(s).not.toContain('style="width')
  })

  it('links each state to its ISC page, with the name escaped', () => {
    const s = renderToStaticMarkup(
      h(DashboardStates, {
        top: [{ ...top[0], key: 'Jammu & Kashmir', label: 'Jammu & Kashmir' }],
        stalled,
      })
    )
    expect(s).toContain('/admin/isc/state/Jammu%20%26%20Kashmir')
    expect(s).toContain('/admin/isc/state/Uttar%20Pradesh')
  })

  it('says so in words when a list is empty rather than drawing an empty panel', () => {
    const s = renderToStaticMarkup(h(DashboardStates, { top: [], stalled: [] }))
    expect(s).toContain('No state has a submitted entry yet')
    expect(s).toContain('50 eligible students')
  })
})

describe('IscTimelineChart', () => {
  it('totals the window and names both ends of it', () => {
    const points = [
      { day: '2026-08-30', started: 12, submitted: 4 },
      { day: '2026-09-05', started: 0, submitted: 0 },
    ]
    const s = renderToStaticMarkup(h(IscTimelineChart, { points }))
    expect(s).toContain('12')
    expect(s).toContain('2026')
    expect(s).toContain('Counted in entries')
  })

  it('takes the overview’s own title and copes with a window of nothing', () => {
    const s = renderToStaticMarkup(
      h(IscTimelineChart, { points: [], title: 'The last seven days' })
    )
    expect(s).toContain('The last seven days')
    expect(s).toContain('No days to show yet')
  })

  it('does not divide by nought when every day is empty', () => {
    const points = [
      { day: '2026-09-04', started: 0, submitted: 0 },
      { day: '2026-09-05', started: 0, submitted: 0 },
    ]
    const s = renderToStaticMarkup(h(IscTimelineChart, { points }))
    expect(s).not.toContain('NaN')
    expect(s).not.toContain('Infinity')
  })
})
