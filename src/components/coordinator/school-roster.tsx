import { CLASS_OPTIONS } from '@/lib/profile/details'
import type { RosterStudent } from '@/app/actions/coordinator'

/**
 * Grouped by class, in the same order CLASS_OPTIONS defines everywhere else in
 * the app. Attempt / Qualify Status are real columns carrying placeholder text
 * — neither ISC entries nor judging exist yet, but the shape does not change
 * once they do; only the placeholder is replaced with real values.
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
                <span className="text-muted">Opens when ISC 2026 launches</span>
                <span className="text-muted">Opens when ISC 2026 launches</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
