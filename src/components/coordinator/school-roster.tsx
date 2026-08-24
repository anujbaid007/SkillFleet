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
 */
export function SchoolRoster({ students }: { students: RosterStudent[] }) {
  if (students.length === 0) {
    return (
      <div className="clay-card p-8 text-center text-muted text-sm">
        No students from your school have joined SkillFleet yet.
      </div>
    )
  }

  const byClass = new Map<string, RosterStudent[]>()
  for (const s of students) {
    const key = s.schoolClass ?? 'Class not set'
    byClass.set(key, [...(byClass.get(key) ?? []), s])
  }

  const orderedClasses = [
    ...CLASS_OPTIONS.filter((c) => byClass.has(c)),
    ...(byClass.has('Class not set') ? ['Class not set'] : []),
  ]

  return (
    <div className="space-y-6">
      {orderedClasses.map((cls) => (
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
      ))}
    </div>
  )
}
