import { ageEligible } from '@/lib/recommender/candidates'
import type { ParameterGap, CandidateOffering, RankedCandidate, RankedParameter } from '@/lib/recommender/types'

export interface PlanOptions {
  age: number | null
  bookedOfferingIds?: Set<string>
  /** How many activities to plan for the year. */
  size: number
  /**
   * Optional variety seed. The greedy pass always takes the highest-scoring
   * candidate, so this only changes which of several EQUALLY good options wins
   * — letting "Rebuild" produce a fresh plan without ever picking a worse
   * activity. Omit for fully deterministic output (used by the tests).
   */
  seed?: number
}

/** Small deterministic PRNG (mulberry32) so a given seed always shuffles alike. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Once an offering covers a gap, that gap's remaining weight drops to this
 * fraction — so the next pick favours still-uncovered gaps. Lower = more
 * breadth (a wider spread of parameters), higher = more depth on the top gaps.
 */
const COVERAGE_DECAY = 0.3

/**
 * Builds a BALANCED year plan: greedily picks `size` offerings, but after each
 * pick it decays the weight of the gaps that pick already addressed. The result
 * spreads across a child's lagging parameters instead of stacking the single
 * strongest one — a curriculum, not a top-N list. Deterministic: candidates are
 * pre-sorted, so the same inputs always yield the same plan.
 */
export function buildBalancedPlan(
  gaps: ParameterGap[],
  offerings: CandidateOffering[],
  options: PlanOptions
): RankedCandidate[] {
  const { age, bookedOfferingIds, size, seed } = options
  if (size <= 0) return []

  // Mutable residual weight per below-target gap, seeded from its deficit.
  const residual = new Map<string, { gap: ParameterGap; weight: number }>()
  for (const g of gaps) {
    if (g.status === 'below_target' && g.deficit > 0) residual.set(g.parameterId, { gap: g, weight: g.deficit })
  }
  if (residual.size === 0) return []

  // Candidate order only decides ties. Default is deterministic (cheaper first);
  // with a seed it's shuffled so a rebuild surfaces different equally-good picks.
  const eligible = offerings.filter((o) => !bookedOfferingIds?.has(o.id) && ageEligible(o, age))
  const available =
    seed === undefined
      ? [...eligible].sort((a, b) => a.pricePaise - b.pricePaise || a.title.localeCompare(b.title))
      : shuffled(eligible, seed)

  const chosen: RankedCandidate[] = []
  const usedIds = new Set<string>()

  while (chosen.length < size) {
    let best: CandidateOffering | null = null
    let bestScore = 0
    let bestParams: RankedParameter[] = []

    for (const o of available) {
      if (usedIds.has(o.id)) continue
      let score = 0
      const params: RankedParameter[] = []
      for (const [parameterId, points] of Object.entries(o.contributions)) {
        const r = residual.get(parameterId)
        if (!r || points <= 0) continue
        score += r.weight * points
        params.push({ id: parameterId, name: r.gap.name, points })
      }
      if (score > bestScore) {
        best = o
        bestScore = score
        bestParams = params
      }
    }

    if (!best || bestScore <= 0) break

    usedIds.add(best.id)
    bestParams.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    chosen.push({
      offeringId: best.id,
      title: best.title,
      type: best.type,
      pricePaise: best.pricePaise,
      matchScore: bestScore,
      parameters: bestParams,
    })

    // Covered gaps become less urgent, so later picks target the rest.
    for (const p of bestParams) {
      const r = residual.get(p.id)
      if (r) r.weight *= COVERAGE_DECAY
    }
  }

  return chosen
}
