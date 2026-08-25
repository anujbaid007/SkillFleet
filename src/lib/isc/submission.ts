import { TRACK_FIELDS, type IscTrackId } from '@/lib/isc/tracks'

/**
 * Reads the posted fields for a track into a plain submission object.
 *
 * Blank fields are omitted, not stored as "". An empty string is a value, and
 * storing one makes every count drawn from the submission wrong — a language
 * panel counts the blank as a language, and the admin detail view prints a row
 * for a field the student never touched. Absence is the honest representation.
 *
 * Safe for the edit history: isc_submission_diff() compares
 * COALESCE(submission ->> key, ''), so a missing key and an empty string are
 * already indistinguishable to it. Clearing a field still records a real
 * revision from its old value to ''.
 */
export function readSubmission(track: IscTrackId, formData: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const spec of TRACK_FIELDS[track]) {
    const value = ((formData.get(spec.key) as string) ?? '').trim()
    if (value) out[spec.key] = value
  }
  return out
}
