// All shared types for the scoring engine.
// Internal scale = 0–1000 (stored in DB).
// Display scale = 0–100 (shown in UI, used in score_levels and parameter_targets).

export interface AgeBand {
  id: string
  label: string       // 'Junior' | 'Explorer' | 'Builder' | 'Achiever'
  min_age: number     // inclusive
  max_age: number     // inclusive
  display_order: number
}

export interface ScoreLevel {
  id: string
  name: string        // 'Seed' | 'Sprout' | 'Growing' | 'Thriving' | 'Flourishing'
  min_score: number   // display scale 0–100, inclusive
  max_score: number   // display scale 0–100, inclusive
  color_class: string // Tailwind class, e.g. 'text-accent-teal'
  display_order: number
}

export interface ParameterTarget {
  parameter_id: string
  age_band_id: string
  target_min: number  // display scale 0–100, inclusive
  target_max: number  // display scale 0–100, inclusive
}

export interface BaselineInput {
  /** Raw sum of assessment option scores for this parameter. Internal scale 0–1000. */
  testPoints: number
  /** Sum of cert points currently active (points_provisional for pending certs +
   *  points_approved for approved certs). Internal scale 0–1000.
   *  The 50% provisional fraction is pre-computed by the DB trigger — not applied here. */
  certPoints: number
  /** Sum of questionnaire option scores for this parameter. Internal scale 0–1000. */
  questionnairePoints: number
}

export interface BaselineConfig {
  testWeight: number           // 0.45 from baseline_config.test_weight
  certWeight: number           // 0.30 from baseline_config.cert_weight
  questionnaireWeight: number  // 0.25 from baseline_config.questionnaire_weight
}

export type ProgressStatus = 'below_target' | 'on_target' | 'above_target'
