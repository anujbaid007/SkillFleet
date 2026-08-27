import { iscGroupForClass } from '@/lib/isc/groups'
import type { RosterRow } from '@/lib/isc/roster'

/**
 * How a roster row is competing, as one flat value a dropdown can offer.
 *
 * Deliberately mixes two things an admin actually asks about together — how
 * they are competing (alone, in a team, only invited, not at all) and whether
 * the work is in (submitted or still a draft). Splitting them into two
 * dropdowns would make the common questions — "who has submitted", "who is
 * still just invited" — take two controls instead of one, and most of the
 * sixteen combinations are meaningless anyway.
 */
export type RosterStatusFilter =
  | 'not_started'
  | 'invited'
  | 'solo'
  | 'team'
  | 'submitted'
  | 'draft'

export const ROSTER_STATUS_OPTIONS: { value: RosterStatusFilter; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'draft', label: 'Still a draft' },
  { value: 'solo', label: 'Competing solo' },
  { value: 'team', label: 'In a team' },
  { value: 'invited', label: 'Invited, no reply' },
  { value: 'not_started', label: 'Not started' },
]

export interface RosterFilterParams {
  track?: string
  group?: string
  schoolClass?: string
  status?: string
  q?: string
}

function matchesStatus(row: RosterRow, status: string): boolean {
  const s = row.status
  switch (status) {
    case 'not_started':
      return s.kind === 'not_started'
    case 'invited':
      return s.kind === 'invited'
    case 'solo':
      return s.kind === 'solo'
    case 'team':
      return s.kind === 'team'
    // Submitted and draft only describe a row that has an entry behind it. A
    // student who has merely been invited has no entry of their own, so they
    // are neither, and must not fall into "still a draft" by default.
    case 'submitted':
      return (s.kind === 'solo' || s.kind === 'team') && s.entryStatus === 'submitted'
    case 'draft':
      return (s.kind === 'solo' || s.kind === 'team') && s.entryStatus !== 'submitted'
    default:
      return true
  }
}

/** Narrow a school roster by every filter the roster bar offers. */
export function filterRoster(rows: RosterRow[], params: RosterFilterParams): RosterRow[] {
  const q = (params.q ?? '').trim().toLowerCase()

  return rows.filter((row) => {
    if (params.track && !row.tracks.includes(params.track as RosterRow['tracks'][number])) {
      return false
    }
    if (params.group && iscGroupForClass(row.schoolClass) !== params.group) return false
    if (params.schoolClass && row.schoolClass !== params.schoolClass) return false
    if (params.status && !matchesStatus(row, params.status)) return false
    if (q && !row.name.toLowerCase().includes(q)) return false
    return true
  })
}

/**
 * The classes actually present at this school, in the order the roster shows
 * them. Built from the rows rather than from the full national class list so
 * the dropdown never offers a class that would return nothing.
 */
export function classOptions(rows: RosterRow[]): string[] {
  return [
    ...new Set(rows.map((r) => r.schoolClass).filter((c): c is string => Boolean(c))),
  ].sort((a, b) => {
    const na = Number(a.replace(/\D/g, ''))
    const nb = Number(b.replace(/\D/g, ''))
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
    return a.localeCompare(b)
  })
}
