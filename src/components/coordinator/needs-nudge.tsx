import { AlertTriangle, UserPlus } from 'lucide-react'
import { needsNudge, type RosterEntryStatus } from '@/lib/coordinator/analytics'

function NameList({ students }: { students: RosterEntryStatus[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {students.map((s) => (
        <li
          key={s.studentId}
          className="text-xs font-medium text-foreground bg-black/[0.04] rounded-lg px-2 py-1"
        >
          {s.fullName ?? 'Student'}
          {s.schoolClass && <span className="text-muted"> · {s.schoolClass}</span>}
        </li>
      ))}
    </ul>
  )
}

/**
 * The two lists worth acting on today.
 *
 * Split rather than merged: a student sitting on a finished-looking draft needs
 * a different conversation from one who has not opened ISC at all, and one
 * combined list would hide that.
 */
export function NeedsNudge({ students }: { students: RosterEntryStatus[] }) {
  const { drafts, notEntered } = needsNudge(students)

  if (drafts.length === 0 && notEntered.length === 0) return null

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {drafts.length > 0 && (
        <div className="clay-card p-5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-accent-yellow/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-accent-yellow" />
            </span>
            <h2 className="font-display font-bold text-foreground text-sm">
              Sitting on a draft ({drafts.length})
            </h2>
          </div>
          <p className="text-xs text-muted mt-2">
            They have started, but a draft is not an entry. It only counts once they press Submit
            entry.
          </p>
          <NameList students={drafts} />
        </div>
      )}

      {notEntered.length > 0 && (
        <div className="clay-card p-5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-primary" />
            </span>
            <h2 className="font-display font-bold text-foreground text-sm">
              Yet to start ({notEntered.length})
            </h2>
          </div>
          <p className="text-xs text-muted mt-2">
            Eligible for ISC 2026 with nothing begun on any championship.
          </p>
          <NameList students={notEntered} />
        </div>
      )}
    </div>
  )
}
