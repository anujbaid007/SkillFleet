'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { CLASS_OPTIONS } from '@/lib/profile/details'
import { buildStudentProfile, type RosterMember, type RosterStudent } from '@/lib/isc/roster'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
import { IscStudentProfile } from '@/components/admin/isc-student-profile'

export interface DrilldownStudent {
  studentId: string
  fullName: string | null
  schoolClass: string | null
}

const NO_CLASS = 'Class not set'

/**
 * A worklist that stays readable as it grows: classes, then students, then one
 * student in full.
 *
 * A flat list of name chips is fine for three students and unusable for three
 * hundred, which is where these lists are heading. Class is the first cut a
 * coordinator actually makes — they chase a class at a time — so it is the
 * level the list opens at.
 *
 * Everything is already on the page, so drilling costs no fetch; the levels
 * are just three views of one array.
 */
export function StudentDrilldown({
  students,
  entries,
  members,
  submissionByEntry,
  emptyLabel,
}: {
  students: DrilldownStudent[]
  entries: AnalyticsEntry[]
  members: RosterMember[]
  submissionByEntry: Map<string, Record<string, unknown>>
  emptyLabel: string
}) {
  const [openClass, setOpenClass] = useState<string | null>(null)
  const [openStudent, setOpenStudent] = useState<DrilldownStudent | null>(null)

  const byClass = useMemo(() => {
    const map = new Map<string, DrilldownStudent[]>()
    for (const s of students) {
      const key = s.schoolClass ?? NO_CLASS
      map.set(key, [...(map.get(key) ?? []), s])
    }
    // CLASS_OPTIONS order, so this reads like a register rather than in
    // whatever order the rows arrived.
    const ordered = [
      ...CLASS_OPTIONS.filter((c) => map.has(c)),
      ...(map.has(NO_CLASS) ? [NO_CLASS] : []),
    ]
    return ordered.map((cls) => ({
      schoolClass: cls,
      students: [...(map.get(cls) ?? [])].sort((a, b) =>
        (a.fullName ?? '').localeCompare(b.fullName ?? '')
      ),
    }))
  }, [students])

  if (students.length === 0) {
    return <p className="text-xs text-muted py-4">{emptyLabel}</p>
  }

  if (openStudent) {
    const student: RosterStudent = {
      id: openStudent.studentId,
      name: openStudent.fullName ?? 'Student',
      schoolClass: openStudent.schoolClass,
    }
    return (
      <div className="mt-3">
        <IscStudentProfile
          profile={buildStudentProfile(student, entries, members, submissionByEntry)}
          onClose={() => setOpenStudent(null)}
        />
      </div>
    )
  }

  if (openClass) {
    const group = byClass.find((g) => g.schoolClass === openClass)
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setOpenClass(null)}
          className="text-[11px] font-semibold text-muted hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All classes
        </button>
        <p className="text-xs font-bold text-foreground mb-2">{openClass}</p>
        <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.05] overflow-hidden">
          {(group?.students ?? []).map((s) => (
            <li key={s.studentId}>
              <button
                type="button"
                onClick={() => setOpenStudent(s)}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-[13px] font-medium text-foreground truncate">
                  {s.fullName ?? 'Student'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <ul className="mt-3 divide-y divide-black/[0.05] rounded-xl border border-black/[0.05] overflow-hidden">
      {byClass.map((g) => (
        <li key={g.schoolClass}>
          <button
            type="button"
            onClick={() => setOpenClass(g.schoolClass)}
            className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="text-[13px] font-semibold text-foreground">{g.schoolClass}</span>
            <span className="flex items-center gap-2 shrink-0 text-muted">
              <span className="text-[11px] inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {g.students.length}
              </span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
