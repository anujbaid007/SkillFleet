// Score scale conversions.
// Internal scale: 0–1000 (stored in student_parameter_scores, score_contributions, etc.)
// Display scale:  0–100  (shown in UI, used in score_levels and parameter_targets)

/** Converts an internal score (0–1000) to display scale (0–100). Clamps then rounds. */
export function internalToDisplay(internal: number): number {
  return Math.round(Math.max(0, Math.min(1000, internal)) / 10)
}

/** Converts a display score (0–100) to internal scale (0–1000). Clamps then rounds. */
export function displayToInternal(display: number): number {
  return Math.round(Math.max(0, Math.min(100, display)) * 10)
}
