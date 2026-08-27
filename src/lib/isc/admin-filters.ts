import { iscGroupForClass } from '@/lib/isc/groups'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
import type { FunnelMember } from '@/lib/isc/funnel'

/** The query string the filter bar owns. Place is not here — it is the route. */
export interface IscFilterParams {
  track?: string
  status?: string
  group?: string
  language?: string
  q?: string
}

export interface FilteredIscData {
  entries: AnalyticsEntry[]
  /** Members of the surviving entries only, so the funnel narrows with
      everything else rather than staying frozen at the unfiltered number. */
  funnelMembers: FunnelMember[]
}

/**
 * Narrow a scope's data by the filter bar, for every panel at once.
 *
 * Shared by the national, state and district pages rather than written out
 * three times: three copies of this would be three chances for one page to
 * drift and start disagreeing with the other two about what "submitted, Group
 * 1, Hindi" means.
 */
export function applyIscFilters(
  entries: AnalyticsEntry[],
  funnelMembers: FunnelMember[],
  submissionByEntry: Map<string, Record<string, unknown>>,
  params: IscFilterParams
): FilteredIscData {
  const q = (params.q ?? '').trim().toLowerCase()

  const filtered = entries.filter((e) => {
    if (params.track && e.track !== params.track) return false
    if (params.status && e.status !== params.status) return false
    if (params.group && iscGroupForClass(e.leaderClass) !== params.group) return false
    // Language lives inside the submission JSONB rather than on the entry
    // itself, so it is read from the map the loader already built instead of
    // widening AnalyticsEntry for one filter.
    if (params.language) {
      const language = submissionByEntry.get(e.entryId)?.language
      if (language !== params.language) return false
    }
    if (q && !e.schoolName.toLowerCase().includes(q)) return false
    return true
  })

  const keptIds = new Set(filtered.map((e) => e.entryId))
  return {
    entries: filtered,
    funnelMembers: funnelMembers.filter((m) => keptIds.has(m.entryId)),
  }
}
