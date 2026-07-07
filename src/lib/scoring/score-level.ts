import type { ScoreLevel } from '@/lib/scoring/types'

/**
 * Returns the score level that contains `displayScore` (0–100 scale).
 * Returns null if the score falls outside all defined levels.
 */
export function scoreLevelFor(displayScore: number, levels: ScoreLevel[]): ScoreLevel | null {
  return levels.find((l) => displayScore >= l.min_score && displayScore <= l.max_score) ?? null
}
