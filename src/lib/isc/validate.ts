import { CLASS_OPTIONS } from '@/lib/profile/details'
import { TRACK_FIELDS, type FieldSpec, type IscTrackId } from '@/lib/isc/tracks'
import { istDaysBetween } from '@/lib/isc/dates'

/** ISC is open to Classes 5-12. Younger students see the page but cannot enter. */
const FIRST_ELIGIBLE = CLASS_OPTIONS.indexOf('Class 5')

export function isEligibleClass(schoolClass: string | null | undefined): boolean {
  if (!schoolClass) return false
  const index = CLASS_OPTIONS.indexOf(schoolClass)
  return index >= 0 && index >= FIRST_ELIGIBLE
}

/**
 * Links are the only way work is handed in, so a bad link is a lost entry.
 * Only http(s) is accepted: javascript: and data: would otherwise reach a
 * judge as a clickable link.
 */
export function validateUrl(value: string): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return 'This link is required.'
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return 'That does not look like a link. It should start with https://'
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'The link must start with http:// or https://'
  }
  if (!parsed.hostname.includes('.')) return 'That link is missing a website address.'
  return null
}

function validateField(spec: FieldSpec, raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim() : ''

  if (spec.kind === 'url') {
    const urlError = validateUrl(value)
    return urlError ? `${spec.label}: ${urlError}` : null
  }

  if (spec.kind === 'select') {
    if (!value) return `${spec.label}: please choose one.`
    if (spec.options && !spec.options.includes(value)) {
      return `${spec.label}: choose ${spec.options.join(' or ')}.`
    }
    return null
  }

  if (!value) return `${spec.label}: this is required.`
  if (spec.min && value.length < spec.min) {
    return `${spec.label}: please write at least ${spec.min} characters.`
  }
  if (spec.max && value.length > spec.max) {
    return `${spec.label}: please keep it under ${spec.max} characters.`
  }
  return null
}

/**
 * The first field with a problem, and what to say about it.
 *
 * Returns the field key as well as the message so the form can send the
 * student straight to the offending input rather than making them hunt down
 * a seven-field form for the one thing they missed.
 */
export function firstInvalidField(
  track: IscTrackId,
  submission: Record<string, unknown>
): { key: string; message: string } | null {
  for (const spec of TRACK_FIELDS[track]) {
    const message = validateField(spec, submission?.[spec.key])
    if (message) return { key: spec.key, message }
  }
  return null
}

/** Returns the first problem found, or null when the submission is complete. */
export function validateSubmission(
  track: IscTrackId,
  submission: Record<string, unknown>
): string | null {
  return firstInvalidField(track, submission)?.message ?? null
}

/**
 * Locked is derived from the deadline, never stored. A missing or unparseable
 * deadline counts as locked: failing closed cannot corrupt a submission,
 * failing open could.
 */
export function isTrackLocked(deadlineIso: string, now: Date): boolean {
  if (!deadlineIso) return true
  const deadline = new Date(deadlineIso)
  if (Number.isNaN(deadline.getTime())) return true
  return now.getTime() > deadline.getTime()
}

/**
 * How long a track is still open, in plain words.
 *
 * The sibling of isTrackLocked: same deadline, read as time remaining rather
 * than as a yes or no. Counted in Indian calendar days, so "1 day left" means
 * "until the end of tomorrow" to a student in India, which is what they will
 * take it to mean.
 */
export function countdownLabel(deadlineIso: string, now: Date): string {
  if (!deadlineIso) return 'Deadline not set'
  const deadline = new Date(deadlineIso)
  if (Number.isNaN(deadline.getTime())) return 'Deadline not set'
  if (now.getTime() > deadline.getTime()) return 'Closed'

  const days = istDaysBetween(now, deadline)
  if (days <= 0) return 'Closes today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}
