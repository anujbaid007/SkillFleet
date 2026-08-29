import { AlertTriangle, UserPlus } from 'lucide-react'
import { Panel } from '@/components/dashboard/panel'
import { StudentDrilldown } from '@/components/coordinator/student-drilldown'
import { needsNudge, type RosterEntryStatus } from '@/lib/coordinator/analytics'
import type { RosterMember } from '@/lib/isc/roster'
import type { AnalyticsEntry } from '@/lib/isc/analytics'

/**
 * The two lists worth acting on today.
 *
 * Split rather than merged: a student sitting on a finished-looking draft needs
 * a different conversation from one who has not opened ISC at all, and one
 * combined list would hide that.
 *
 * Each list drills class → student → profile rather than printing every name
 * at once. A wall of name chips works at three students and falls apart at
 * three hundred, and class is the cut a coordinator chases by anyway.
 */
export function NeedsNudge({
  students,
  entries,
  members,
  submissionByEntry,
}: {
  students: RosterEntryStatus[]
  entries: AnalyticsEntry[]
  members: RosterMember[]
  submissionByEntry: Map<string, Record<string, unknown>>
}) {
  const { drafts, notEntered } = needsNudge(students)

  if (drafts.length === 0 && notEntered.length === 0) return null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {drafts.length > 0 && (
        <Panel
          title={`Sitting on a draft (${drafts.length})`}
          subtitle="They have started, but a draft is not an entry. It only counts once they press Submit entry."
          icon={AlertTriangle}
        >
          <StudentDrilldown
            students={drafts}
            entries={entries}
            members={members}
            submissionByEntry={submissionByEntry}
            emptyLabel="Nobody is sitting on a draft."
          />
        </Panel>
      )}

      {notEntered.length > 0 && (
        <Panel
          title={`Yet to start (${notEntered.length})`}
          subtitle="Eligible for ISC 2026 with nothing begun on any championship."
          icon={UserPlus}
        >
          <StudentDrilldown
            students={notEntered}
            entries={entries}
            members={members}
            submissionByEntry={submissionByEntry}
            emptyLabel="Everyone eligible has started something."
          />
        </Panel>
      )}
    </div>
  )
}
