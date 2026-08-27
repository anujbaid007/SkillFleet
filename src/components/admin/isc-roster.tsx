'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import {
  buildStudentProfile,
  type RosterMember,
  type RosterRow,
  type RosterStudent,
} from '@/lib/isc/roster'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
import { IscStudentProfile } from '@/components/admin/isc-student-profile'

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
            ? 'bg-primary/10 text-primary'
            : 'bg-black/[0.05] text-muted',
      }
    case 'team':
      return {
        text: `Team of ${status.size}/${status.maxSize} · ${
          status.entryStatus === 'submitted' ? 'Submitted' : 'Draft'
        }`,
        tone:
          status.entryStatus === 'submitted'
            ? 'bg-primary/10 text-primary'
            : 'bg-black/[0.05] text-muted',
      }
  }
}

/**
 * Every eligible student at one school, not just the ones who entered.
 *
 * Listing the whole roster is the point: a school's real story is as much
 * about the thirty students who never started as the eight who did, and an
 * entry list can only ever show the eight.
 *
 * The profile opens in place rather than on its own route. Everything it needs
 * is already on this page, so a route would mean a second round trip to render
 * data the browser is holding.
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
  const [query, setQuery] = useState('')

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])

  const selected = selectedId ? studentById.get(selectedId) : undefined
  if (selected) {
    return (
      <IscStudentProfile
        profile={buildStudentProfile(selected, entries, members, submissionByEntry)}
        onClose={() => setSelectedId(null)}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const visible = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows

  return (
    <div className="space-y-3">
      <div className="clay-card p-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a student by name"
            aria-label="Find a student by name"
            className="w-full h-9 pl-9 pr-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
          />
        </div>
        <p className="text-xs text-muted mt-2">
          Showing <span className="font-semibold text-foreground">{visible.length}</span> of{' '}
          {rows.length} {rows.length === 1 ? 'student' : 'students'}
        </p>
      </div>

      <div className="clay-card divide-y divide-black/[0.06]">
        {visible.length === 0 ? (
          <p className="p-12 text-sm text-muted text-center">
            {rows.length === 0
              ? 'No eligible students have an account at this school yet.'
              : 'No student here matches that name.'}
          </p>
        ) : (
          visible.map((row) => {
            const c = chip(row)
            return (
              <button
                key={row.studentId}
                type="button"
                onClick={() => setSelectedId(row.studentId)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-black/[0.02]"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground truncate">
                    {row.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {row.schoolClass ?? 'Class not set'}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.tone}`}>
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
