'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { CLASS_OPTIONS } from '@/lib/profile/details'
import { ISC_TRACKS } from '@/lib/isc/tracks'
import type { RosterStudent } from '@/app/actions/coordinator'

const SHORT: Record<string, string> = {
  ai_for_impact: 'AI',
  entrepreneurship: 'YE',
  content_creator: 'CC',
}

/** One chip per enterable track: a single value cannot say which track. */
function AttemptChips({ status }: { status: Record<string, string> }) {
  return (
    <span className="flex flex-wrap gap-1">
      {ISC_TRACKS.map((t) => {
        const state = status[t.id]
        const cls =
          state === 'submitted'
            ? 'bg-primary/10 text-primary'
            : state === 'draft'
              ? 'bg-accent-yellow/15 text-accent-yellow'
              : 'bg-black/[0.05] text-muted'
        return (
          <span
            key={t.id}
            title={`${t.name}: ${state ?? 'not started'}`}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}
          >
            {SHORT[t.id]}
          </span>
        )
      })}
    </span>
  )
}

/**
 * Grouped by class, in the same order CLASS_OPTIONS defines everywhere else in
 * the app. Attempt Status is real: because teammates are linked to real
 * accounts, every member of a team reads as having entered, not only whoever
 * pressed Submit. Qualify Status stays a placeholder until judging exists.
 *
 * Filtering runs in the browser rather than through the URL: a roster is one
 * school's worth of students, all of them already on the page, and a
 * coordinator looking someone up is not a view worth linking to.
 */
export function SchoolRoster({ students }: { students: RosterStudent[] }) {
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [onlyEntered, setOnlyEntered] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => {
      if (q && !(s.fullName ?? '').toLowerCase().includes(q)) return false
      if (classFilter && s.schoolClass !== classFilter) return false
      if (onlyEntered && Object.keys(s.iscStatus ?? {}).length === 0) return false
      return true
    })
  }, [students, query, classFilter, onlyEntered])

  if (students.length === 0) {
    return (
      <div className="clay-card p-8 text-center text-muted text-sm">
        No students from your school have joined SkillFleet yet.
      </div>
    )
  }

  const classesPresent = CLASS_OPTIONS.filter((c) => students.some((s) => s.schoolClass === c))
  const filtering = Boolean(query.trim() || classFilter || onlyEntered)

  const byClass = new Map<string, RosterStudent[]>()
  for (const s of visible) {
    const key = s.schoolClass ?? 'Class not set'
    byClass.set(key, [...(byClass.get(key) ?? []), s])
  }

  const orderedClasses = [
    ...CLASS_OPTIONS.filter((c) => byClass.has(c)),
    ...(byClass.has('Class not set') ? ['Class not set'] : []),
  ]

  const control =
    'h-9 px-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs font-semibold text-foreground focus:outline-none focus:border-primary'

  return (
    <div className="space-y-4">
      <div className="clay-card p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search students"
              className="w-full h-9 pl-9 pr-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter by class"
            className={control}
          >
            <option value="">All classes</option>
            {classesPresent.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={onlyEntered}
              onChange={(e) => setOnlyEntered(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-black/[0.06] accent-primary"
            />
            Only students who have entered
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted">
            Showing <span className="font-semibold text-foreground">{visible.length}</span> of{' '}
            {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setClassFilter('')
                setOnlyEntered(false)
              }}
              className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="clay-card p-8 text-center text-muted text-sm">
          No students match these filters — try clearing one.
        </div>
      ) : (
        orderedClasses.map((cls) => (
          <div key={cls}>
            <h3 className="font-display font-bold text-foreground text-sm mb-2">{cls}</h3>
            <div className="clay-card divide-y divide-black/[0.06]">
              <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                <span>Student</span>
                <span>Attempt status</span>
                <span>Qualify status</span>
              </div>
              {(byClass.get(cls) ?? []).map((s) => (
                <div key={s.studentId} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
                  <span className="text-foreground font-medium">{s.fullName ?? 'Student'}</span>
                  <AttemptChips status={s.iscStatus} />
                  <span className="text-muted">Opens when ISC 2026 launches</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
