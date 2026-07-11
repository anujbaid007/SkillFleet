import { parameterStatus, pointsToTarget } from '@/lib/scoring/progress'
import type { ParameterTarget } from '@/lib/scoring/types'
import type { ParameterGap } from '@/lib/recommender/types'

/** A parameter's current display score paired with its name, for gap analysis. */
export interface ScoredParameter {
  parameterId: string
  name: string
  displayScore: number // 0–100
}

/**
 * Computes each parameter's standing vs the student's age-band target and
 * returns them sorted by severity — largest deficit first. Parameters with no
 * target row are treated as target 0–0 (never a gap), so unmapped parameters
 * never dominate the recommendations.
 *
 * This is the deterministic core of gap detection: given the same scores and
 * targets, it always returns the same ordering.
 */
export function detectGaps(
  parameters: ScoredParameter[],
  targets: ParameterTarget[]
): ParameterGap[] {
  const targetByParam = new Map(targets.map((t) => [t.parameter_id, t]))

  const gaps: ParameterGap[] = parameters.map((p) => {
    const target = targetByParam.get(p.parameterId) ?? {
      parameter_id: p.parameterId,
      age_band_id: '',
      target_min: 0,
      target_max: 0,
    }
    return {
      parameterId: p.parameterId,
      name: p.name,
      displayScore: p.displayScore,
      targetMin: target.target_min,
      targetMax: target.target_max,
      status: parameterStatus(p.displayScore, target),
      deficit: pointsToTarget(p.displayScore, target),
    }
  })

  // Largest deficit first; ties broken by lower current score, then name for stability.
  return gaps.sort(
    (a, b) => b.deficit - a.deficit || a.displayScore - b.displayScore || a.name.localeCompare(b.name)
  )
}

/** The subset of gaps that are genuinely below target (deficit > 0), severity-ordered. */
export function belowTargetGaps(gaps: ParameterGap[]): ParameterGap[] {
  return gaps.filter((g) => g.status === 'below_target' && g.deficit > 0)
}
