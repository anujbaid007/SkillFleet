/*
  A smoke render of every component in the Coordinators section that is fed by
  section G.

  These are the only parts of the section a browser cannot reach until
  docs/admin-scale-migration.sql has been pasted -- until then every one of
  them is replaced by the migration panel -- so this is where they are proved
  to render at all, with real numbers and with nothing at all. Server
  components with no hooks, so renderToStaticMarkup is enough; nothing here
  touches a database or a router.
*/

import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CoordinatorFunnelPanel } from '@/components/admin/coordinator-funnel-panel'
import { CoordinatorTrendChart } from '@/components/admin/coordinator-trend-chart'
import { CoordinatorBreakdownTable } from '@/components/admin/coordinator-breakdown-table'
import { CoordinatorDirectory } from '@/components/admin/coordinator-directory'
import { CoordinatorNumbers, CoordinatorProfileCard } from '@/components/admin/coordinator-profile'
import { CoordinatorHeader } from '@/components/admin/coordinator-header'

const summary = {
  coordinators: 33, approved: 19, pending: 6, rejected: 3,
  schools_total: 40, schools_claimed: 28, schools_approved: 19, schools_uncovered: 21,
  students_covered: 1056, students_uncovered: 420, students_entered: 1003,
  median_students_per_coordinator: 2.5, entered_pct: 95,
}
const zero = { ...summary, coordinators: 0, approved: 0, pending: 0, rejected: 0, schools_total: 0, schools_claimed: 0, schools_approved: 0, schools_uncovered: 0, students_covered: 0, students_uncovered: 0, students_entered: 0, median_students_per_coordinator: 0, entered_pct: 0 }

describe('the section G components render', () => {
  it('shows reach as the headline and a real percentage beside it', () => {
    expect(renderToStaticMarkup(h(CoordinatorFunnelPanel, { summary }))).toContain('1,056')
    expect(renderToStaticMarkup(h(CoordinatorFunnelPanel, { summary: zero, scoped: true }))).toContain('0%')
  })
  it('labels the trend by signup day and survives an empty window', () => {
    const points = [
      { day: '2026-09-01', coordinators: 5, cohort_claimed: 4, cohort_approved: 2 },
      { day: '2026-09-02', coordinators: 0, cohort_claimed: 0, cohort_approved: 0 },
    ]
    expect(renderToStaticMarkup(h(CoordinatorTrendChart, { points, approvedTotal: 19 }))).toContain('1 Sept 2026')
    expect(renderToStaticMarkup(h(CoordinatorTrendChart, { points: [], approvedTotal: 0, scoped: true }))).toContain('No days')
  })
  it('puts an entered share on a breakdown row and copes with no rows', () => {
    const rows = [{ key: 'Bihar', label: 'Bihar', coordinators: 4, approved: 2, schools_claimed: 3, schools_total: 5, students_covered: 120, students_entered: 110 }]
    expect(renderToStaticMarkup(h(CoordinatorBreakdownTable, { rows, level: 'state', hrefFor: (k: string) => `/x/${k}` }))).toContain('91.7%')
    expect(renderToStaticMarkup(h(CoordinatorBreakdownTable, { rows: [], level: 'district' }))).toContain('No school in this state')
  })
  it('renders a claim-less row as "No account" and an empty directory as words', () => {
    const page = {
      rows: [
        { id: 'c1', full_name: 'Anita Rao', email: null, phone: null, school_id: 's1', school_name: 'DPS', state: 'Bihar', district: 'Patna', claim_status: 'approved', schools_claimed: 2, students: 10, students_entered: 5, joined_at: '2026-01-01T00:00:00.000Z' },
        { id: 'c2', full_name: null, email: 'a@b.c', phone: null, school_id: null, school_name: null, state: null, district: null, claim_status: 'none', schools_claimed: 0, students: 0, students_entered: 0, joined_at: '2026-01-01T00:00:00.000Z' },
      ],
      total: 2, page: 1, size: 50,
    }
    const s = renderToStaticMarkup(h(CoordinatorDirectory, { page, query: { sort: 'students_desc', page: 1, state: 'Bihar' }, basePath: '/d', states: ['Bihar'] }))
    expect(s).toContain('No account')
    expect(s).toContain('(50%)')
    const s2 = renderToStaticMarkup(h(CoordinatorDirectory, { page: { rows: [], total: 0, page: 1, size: 50 }, query: { sort: 'students_desc', page: 1 }, basePath: '/d', states: [] }))
    expect(s2).toContain('No teacher has signed up')
  })
  it('renders a profile with no email and a coordinator with no claim', () => {
    const profile = { id: 'c1', full_name: null, email: null, phone: null, joined_at: '2026-01-01T00:00:00.000Z', onboarding_completed: false }
    const claim = { id: 's1', name: 'DPS', state: 'Bihar', district: 'Patna', review_status: 'pending', claim_status: 'pending', notes: 'why', board: null }
    expect(renderToStaticMarkup(h(CoordinatorProfileCard, { profile, claim, claimsHeld: 2 }))).toContain('No account')
    expect(renderToStaticMarkup(h(CoordinatorProfileCard, { profile, claim: null, claimsHeld: 0 }))).toContain('No school claimed')
    const detail = { id: 'c1', full_name: null, email: null, phone: null, joined_at: '2026-01-01T00:00:00.000Z', onboarding_completed: true, schools_claimed: 2, school: null, students: 10, students_entered: 5, entered_pct: 50, entries: 3, submitted: 1, by_track: [{ key: 'ai_for_impact', count: 2 }] }
    expect(renderToStaticMarkup(h(CoordinatorNumbers, { detail }))).toContain('50%')
    expect(renderToStaticMarkup(h(CoordinatorNumbers, { detail: { ...detail, by_track: [] } }))).toContain('Nothing has been entered')
  })
  it('renders the shared header', () => {
    expect(renderToStaticMarkup(h(CoordinatorHeader, { active: 'directory', title: 'Directory' }))).toContain('Directory')
  })
})
