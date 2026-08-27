'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Search, X } from 'lucide-react'
import { ISC_TRACKS } from '@/lib/isc/tracks'
import { ISC_GROUPS, iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
import {
  buildStudentProfile,
  type RosterMember,
  type RosterRow,
  type RosterStudent,
} from '@/lib/isc/roster'
import {
  classOptions,
  filterRoster,
  ROSTER_STATUS_OPTIONS,
  type RosterFilterParams,
} from '@/lib/isc/roster-filters'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
import { IscStudentProfile } from '@/components/admin/isc-student-profile'

const SELECT =
  'h-10 px-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs font-semibold text-foreground focus:outline-none focus:border-primary'

function chip(row: RosterRow): { text: string; tone: string } {
  const status = row.status
  switch (status.kind) {
    case 'not_started':
      return { text: 'Not started', tone: 'bg-black/[0.05] text-muted' }
    case 'invited':
      return { text: 'Invited · awaiting reply', tone: 'bg-accent-yellow/15 text-accent-yellow' }
    case 'solo':
      return {
        text: `Solo entry · ${status.entryStatus === 'submitted' ? 'Submitted' : 'Draft'}`,
        tone:
          status.entryStatus === 'submitted'
            ? 'bg-green-100 text-green-800'
            : 'bg-black/[0.05] text-muted',
      }
    case 'team':
      return {
        text: `Team of ${status.size}/${status.maxSize} · ${
          status.entryStatus === 'submitted' ? 'Submitted' : 'Draft'
        }`,
        tone:
          status.entryStatus === 'submitted'
            ? 'bg-green-100 text-green-800'
            : 'bg-black/[0.05] text-muted',
      }
  }
}

/**
 * Every eligible student at one school, not just the ones who entered.
 *
 * Listing the whole roster is the point: a school's real story is as much
 * about the students who never started as the ones who did, and an entry list
 * can only ever show the ones who did. The filters exist because that same
 * completeness makes the list long — an admin asking "which Class 9 students
 * have not submitted for Content Creator" should not have to read every row
 * to answer it.
 *
 * Filtering is local state rather than the query string, unlike the page-level
 * filter bar: this list lives inside one school's page and its filters are a
 * way of reading what is already on screen, not a view worth linking to.
 *
 * The profile opens in place rather than on its own route. Everything it needs
 * is already here, so a route would mean a second round trip for data the
 * browser is holding.
 */
export function IscRoster({
  rows,
  students,
  entries,
  members,
  submissionByEntry,
}: {
  rows: RosterRow[]
  students: RosterStudent[]
  entries: AnalyticsEntry[]
  members: RosterMember[]
  submissionByEntry: Map<string, Record<string, unknown>>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<RosterFilterParams>({})

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const classes = useMemo(() => classOptions(rows), [rows])
  const visible = useMemo(() => filterRoster(rows, filters), [rows, filters])

  const selected = selectedId ? studentById.get(selectedId) : undefined
  if (selected) {
    return (
      <IscStudentProfile
        profile={buildStudentProfile(selected, entries, members, submissionByEntry)}
        onClose={() => setSelectedId(null)}
      />
    )
  }

  const set = (key: keyof RosterFilterParams, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))

  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="clay-card p-5 space-y-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={filters.q ?? ''}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Find a student by name"
              aria-label="Find a student by name"
              className="w-full h-10 pl-10 pr-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={filters.track ?? ''}
            onChange={(e) => set('track', e.target.value)}
            aria-label="Filter students by track"
            className={SELECT}
          >
            <option value="">All tracks</option>
            {ISC_TRACKS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={filters.group ?? ''}
            onChange={(e) => set('group', e.target.value)}
            aria-label="Filter students by group"
            className={SELECT}
          >
            <option value="">Any group</option>
            {(Object.keys(ISC_GROUPS) as IscGroup[]).map((g) => (
              <option key={g} value={g}>
                {iscGroupLabel(g)}
              </option>
            ))}
          </select>

          <select
            value={filters.schoolClass ?? ''}
            onChange={(e) => set('schoolClass', e.target.value)}
            aria-label="Filter students by class"
            className={SELECT}
          >
            <option value="">Any class</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.status ?? ''}
            onChange={(e) => set('status', e.target.value)}
            aria-label="Filter students by status"
            className={SELECT}
          >
            <option value="">Any status</option>
            {ROSTER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted">
            Showing <span className="font-semibold text-foreground">{visible.length}</span> of{' '}
            {rows.length} {rows.length === 1 ? 'student' : 'students'}
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      <div className="clay-card divide-y divide-black/[0.05]">
        {visible.length === 0 ? (
          <p className="p-14 text-sm text-muted text-center">
            {rows.length === 0
              ? 'No eligible students have an account at this school yet.'
              : 'No student here matches those filters.'}
          </p>
        ) : (
          visible.map((row) => {
            const c = chip(row)
            return (
              <button
                key={row.studentId}
                type="button"
                onClick={() => setSelectedId(row.studentId)}
                className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-black/[0.02] transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground truncate">
                    {row.name}
                  </span>
                  <span className="block text-xs text-muted mt-0.5">
                    {row.schoolClass ?? 'Class not set'}
                  </span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full ${c.tone}`}>
                    {c.text}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted" aria-hidden="true" />
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
