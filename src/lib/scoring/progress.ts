import type { ParameterTarget, ProgressStatus } from '@/lib/scoring/types'

/**
 * Returns whether a student's display score is below, within, or above
 * the target range for their age band and this parameter.
 *
 * Both boundaries are inclusive: a score exactly at target_min or target_max
 * is 'on_target'.
 */
export function parameterStatus(
  displayScore: number,
  target: ParameterTarget
): ProgressStatus {
  if (displayScore < target.target_min) return 'below_target'
  if (displayScore > target.target_max) return 'above_target'
  return 'on_target'
}

/**
 * Returns how many display-scale points the student needs to reach target_min.
 * Returns 0 when already at or above target_min.
 * Used to show "X more points to reach target" in the dashboard.
 */
export function pointsToTarget(displayScore: number, target: ParameterTarget): number {
  return Math.max(0, target.target_min - displayScore)
}
