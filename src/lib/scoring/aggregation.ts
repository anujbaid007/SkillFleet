/**
 * Sums raw DB point rows by parameter_id.
 *
 * Pass the result of joining questionnaire_option_scores (or
 * assessment_option_scores) with the student's chosen options.
 * Returns a map { [parameter_id]: total_points } for parameters
 * that appear at least once. Missing parameters default to 0 in
 * callers — do not include them here to keep the map sparse.
 */
export function aggregateByParameter(
  rows: { parameter_id: string; points: number }[]
): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.parameter_id] = (acc[row.parameter_id] ?? 0) + row.points
    return acc
  }, {})
}
