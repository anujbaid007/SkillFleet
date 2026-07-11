import type { ParameterGap, RankedCandidate, RecommendationItem } from '@/lib/recommender/types'

/** Joins parameter names into readable prose: [] -> '', [a] -> 'a', [a,b] -> 'a and b', [a,b,c] -> 'a, b and c'. */
export function joinNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Deterministic, network-free reason for one recommended offering. Also used as
 * the fallback when the LLM is unavailable, so recommendations never break.
 */
export function templateReason(firstName: string, candidate: RankedCandidate): string {
  const names = candidate.parameters.slice(0, 2).map((p) => p.name)
  const list = joinNames(names)
  return `Builds ${list} — ${names.length > 1 ? 'areas' : 'an area'} where ${firstName} is below target for their age.`
}

/** Deterministic overall summary across the student's top gaps. */
export function templateSummary(firstName: string, belowGaps: ParameterGap[]): string {
  if (belowGaps.length === 0) {
    return `${firstName} is on track across every growth area right now — these are optional ways to keep the momentum going.`
  }
  const top = joinNames(belowGaps.slice(0, 3).map((g) => g.name))
  return `${firstName}'s biggest growth areas right now are ${top}. These suggestions focus there without over-indexing on strengths.`
}

/** Deterministic overall summary for a balanced year plan. */
export function templatePlanSummary(firstName: string, belowGaps: ParameterGap[], count: number): string {
  if (count === 0) {
    return `We couldn’t assemble a plan from the current live catalogue — check back as more activities go live.`
  }
  if (belowGaps.length === 0) {
    return `A balanced ${count}-activity year for ${firstName}, mixing enrichment across every growth area.`
  }
  const top = joinNames(belowGaps.slice(0, 3).map((g) => g.name))
  return `A balanced ${count}-activity year for ${firstName} — it lifts ${top} while keeping variety across the year rather than doubling down on one area.`
}

/** Assembles full recommendation items from rules output using template reasons. */
export function templateItems(firstName: string, ranked: RankedCandidate[]): RecommendationItem[] {
  return ranked.map((c, i) => ({
    offering_id: c.offeringId,
    title: c.title,
    rank: i + 1,
    reason: templateReason(firstName, c),
    match_score: c.matchScore,
    parameters: c.parameters,
  }))
}
