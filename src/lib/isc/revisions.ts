import { TRACK_FIELDS, type IscTrackId } from '@/lib/isc/tracks'

export interface RevisionChange {
  key: string
  /** The label the student saw on the form, so history reads like the form. */
  label: string
  from: string
  to: string
}

export interface EntryRevision {
  revisionId: string
  editedAt: string
  editorName: string | null
  changes: RevisionChange[]
}

/** Long answers are shown abbreviated; the full text lives on the entry itself. */
export function truncate(value: string, max = 120): string {
  if (!value) return '(empty)'
  return value.length <= max ? value : `${value.slice(0, max)}…`
}

/** "Edited 1 times" reads badly enough to be worth three special cases. */
export function editCountLabel(n: number): string {
  if (n <= 0) return 'Not edited'
  if (n === 1) return 'Edited once'
  if (n === 2) return 'Edited twice'
  return `Edited ${n} times`
}

interface RawRevision {
  revision_id?: unknown
  edited_at?: unknown
  editor_name?: unknown
  changed?: unknown
}

/**
 * Shape the RPC's payload for display.
 *
 * Defensive throughout: this renders on an admin screen, and a malformed row
 * should cost one missing history entry, not a blank page.
 */
export function parseRevisions(track: IscTrackId, raw: unknown): EntryRevision[] {
  if (!Array.isArray(raw)) return []

  // Field order comes from the form, so a revision touching several fields
  // lists them the way the student encountered them.
  const order = new Map(TRACK_FIELDS[track].map((spec, i) => [spec.key, i]))
  const labels = new Map(TRACK_FIELDS[track].map((spec) => [spec.key, spec.label]))

  const out: EntryRevision[] = []

  for (const row of raw as RawRevision[]) {
    if (!row || typeof row !== 'object') continue
    const revisionId = typeof row.revision_id === 'string' ? row.revision_id : null
    const editedAt = typeof row.edited_at === 'string' ? row.edited_at : null
    if (!revisionId || !editedAt) continue

    const changedRaw = row.changed
    if (!changedRaw || typeof changedRaw !== 'object') continue

    const changes: RevisionChange[] = Object.entries(
      changedRaw as Record<string, { from?: unknown; to?: unknown }>
    )
      .map(([key, delta]) => ({
        key,
        // A field the track no longer defines still deserves to be shown.
        label: labels.get(key) ?? key,
        from: typeof delta?.from === 'string' ? delta.from : '',
        to: typeof delta?.to === 'string' ? delta.to : '',
      }))
      .sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999))

    if (changes.length === 0) continue

    out.push({
      revisionId,
      editedAt,
      editorName: typeof row.editor_name === 'string' ? row.editor_name : null,
      changes,
    })
  }

  return out
}
