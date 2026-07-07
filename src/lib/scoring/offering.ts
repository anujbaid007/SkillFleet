import { internalToDisplay } from '@/lib/scoring/conversions'

/**
 * Applies one offering's contribution points to a student's accrued score
 * for a single parameter.
 *
 * `contributionPoints` comes from `offering_parameter_contributions.points`.
 * It may be negative for score reversals (e.g. a rejected certificate that
 * previously had provisional points applied).
 *
 * Returns the new accrued score, clamped to the internal range [0, 1000].
 */
export function applyOfferingPoints(
  currentAccruedScore: number,
  contributionPoints: number
): number {
  return Math.max(0, Math.min(1000, currentAccruedScore + contributionPoints))
}

/**
 * Returns the combined display score (0–100) for one parameter.
 *
 * `baselineInternal`  = student_parameter_scores.baseline_score
 * `accruedInternal`   = student_parameter_scores.accrued_score
 *
 * The sum is clamped to [0, 1000] before converting to display scale,
 * so the result is always in [0, 100].
 */
export function totalDisplayScore(
  baselineInternal: number,
  accruedInternal: number
): number {
  const total = Math.max(0, Math.min(1000, baselineInternal + accruedInternal))
  return internalToDisplay(total)
}
