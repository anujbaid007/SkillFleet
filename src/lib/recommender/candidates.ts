import type { ParameterGap, CandidateOffering, RankedCandidate } from '@/lib/recommender/types'

export interface RankOptions {
  /** Student age in years; used for age-appropriateness filtering. Null = don't filter by age. */
  age: number | null
  /** Offering ids the student already has a live/paid booking for — excluded. */
  bookedOfferingIds?: Set<string>
  /** Max recommendations to return. Default 6. */
  limit?: number
}

export function ageEligible(offering: CandidateOffering, age: number | null): boolean {
  if (age == null) return true
  if (offering.minAge != null && age < offering.minAge) return false
  if (offering.maxAge != null && age > offering.maxAge) return false
  return true
}

/**
 * Ranks candidate offerings against a student's below-target gaps.
 *
 * matchScore = Σ over gaps of (gap.deficit × offering points for that parameter).
 * An offering that boosts a severe gap a lot scores highest; offerings that
 * touch no gap (matchScore 0) are dropped. This is deterministic and testable
 * — the LLM only adds narrative afterward, it does not change the ranking.
 */
export function rankCandidates(
  gaps: ParameterGap[],
  offerings: CandidateOffering[],
  options: RankOptions
): RankedCandidate[] {
  const { age, bookedOfferingIds, limit = 6 } = options

  // Only below-target gaps drive the match, keyed for fast lookup.
  const gapByParam = new Map(
    gaps.filter((g) => g.status === 'below_target' && g.deficit > 0).map((g) => [g.parameterId, g])
  )
  if (gapByParam.size === 0) return []

  const ranked: RankedCandidate[] = []

  for (const o of offerings) {
    if (bookedOfferingIds?.has(o.id)) continue
    if (!ageEligible(o, age)) continue

    let matchScore = 0
    const parameters = []
    for (const [parameterId, points] of Object.entries(o.contributions)) {
      const gap = gapByParam.get(parameterId)
      if (!gap || points <= 0) continue
      matchScore += gap.deficit * points
      parameters.push({ id: parameterId, name: gap.name, points })
    }

    if (matchScore <= 0 || parameters.length === 0) continue

    // Strongest-contributing parameter first for a readable "why".
    parameters.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    ranked.push({
      offeringId: o.id,
      title: o.title,
      type: o.type,
      pricePaise: o.pricePaise,
      matchScore,
      parameters,
    })
  }

  // Best match first; ties → cheaper first, then title for stability.
  ranked.sort(
    (a, b) => b.matchScore - a.matchScore || a.pricePaise - b.pricePaise || a.title.localeCompare(b.title)
  )
  return ranked.slice(0, limit)
}
