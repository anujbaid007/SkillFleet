import type { BaselineInput, BaselineConfig } from '@/lib/scoring/types'

/**
 * Calculates the baseline score for a single growth parameter.
 *
 * Takes raw input point sums (already aggregated from questionnaire responses,
 * active certificate points, and assessment results) and returns an internal
 * score in the range 0–1000.
 *
 * Call this once per parameter per student after onboarding completes.
 * The cert_provisional_fraction is pre-applied by the DB when it stores
 * points_provisional — do not apply it again here.
 */
export function calcBaselineForParameter(input: BaselineInput, config: BaselineConfig): number {
  const raw =
    input.testPoints * config.testWeight +
    input.certPoints * config.certWeight +
    input.questionnairePoints * config.questionnaireWeight

  return Math.max(0, Math.min(1000, Math.round(raw)))
}
