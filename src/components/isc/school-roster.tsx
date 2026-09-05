'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Search, Users, X } from 'lucide-react'
import { Panel } from '@/components/dashboard/panel'
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
  'h-10 px-3 rounded-lg border border-black/10 bg-white text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'

function chip(row: RosterRow): { text: string; tone: string } {
  const status = row.status
  switch (status.kind) {
    case 'not_started':
      return { text: 'Not started', tone: 'bg-slate-100 text-slate-500' }
    case 'invited':
      return { text: 'Invited · awaiting reply', tone: 'bg-amber-50 text-amber-700' }
    case 'solo':
      return {
        text: `Solo · ${status.entryStatus === 'submitted' ? 'Submitted' : 'Draft'}`,
        tone:
          status.entryStatus === 'submitted'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-slate-100 text-slate-500',
      }
    case 'team':
      return {
        text: `Team ${status.size}/${status.maxSize} · ${
          status.entryStatus === 'submitted' ? 'Submitted' : 'Draft'
        }`,
        tone:
          status.entryStatus === 'submitted'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-slate-100 text-slate-500',
      }
  }
}

/**
 * Every eligible student at ONE school and what each is actually doing —
 * including the ones doing nothing, which an entry list can never show.
 *
 * That completeness is the whole point. A school's real story is as much about
 * the students who never started as the ones who did, and it is the only place
 * in the app that answers "who do I telephone" after the cold-schools list has
 * said which school to telephone about.
 *
 * Shared by the coordinator dashboard and the admin school page on purpose: a
 * coordinator asks exactly the questions about their own students that an
 * admin asks about everyone's, and the answer was written twice before this.
 * Only the wording differs, which is what the three copy props are for.
 *
 * The filters are local state rather than the query string, unlike the
 * page-level entry filters: this list lives inside one school's page and its
 * filters are a way of reading what is already on screen. The profile opens in
 * place for the same reason — everything it needs is already here, so a route
 * would mean a second round trip for data the browser is holding.
 */
export function SchoolRoster({
  rows,
  students,
  entries,
  members,
  submissionByEntry,
  title = 'Students',
  subtitle = 'Everyone eligible at your school — open a student to see their team and what they submitted',
  emptyLabel = 'No eligible students from your school have joined SkillFleet yet.',
}: {
  rows: RosterRow[]
  students: RosterStudent[]
  entries: AnalyticsEntry[]
  members: RosterMember[]
  submissionByEntry: Map<string, Record<string, unknown>>
  title?: string
  subtitle?: string
  /** Shown when the school has no eligible students at all, as opposed to none matching. */
  emptyLabel?: string
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
    <Panel
      title={title}
      subtitle={subtitle}
      icon={Users}
      padded={false}
      action={
        <span className="text-[11px] text-muted whitespace-nowrap">
          {visible.length} of {rows.length}
        </span>
      }
    >
      <div className="px-5 pb-4 space-y-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={filters.q ?? ''}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Find a student by name"
              aria-label="Find a student by name"
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-black/10 bg-white text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear {activeCount}
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-black/[0.05] divide-y divide-black/[0.04]">
        {visible.length === 0 ? (
          <p className="p-12 text-sm text-muted text-center">
            {rows.length === 0 ? emptyLabel : 'No student matches those filters.'}
          </p>
        ) : (
          visible.map((row) => {
            const c = chip(row)
            return (
              <button
                key={row.studentId}
                type="button"
                onClick={() => setSelectedId(row.studentId)}
                className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-foreground truncate">
                    {row.name}
                  </span>
                  <span className="block text-[11px] text-muted mt-0.5">
                    {row.schoolClass ?? 'Class not set'}
                  </span>
                </span>
                <span className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${c.tone}`}>
                    {c.text}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted" aria-hidden="true" />
                </span>
              </button>
            )
          })
        )}
      </div>
    </Panel>
  )
}
