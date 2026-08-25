'use client'

import { useActionState, useEffect } from 'react'
import { entryFormAction, type EntryFormState } from '@/app/actions/isc'
import { TRACK_FIELDS, type IscTrackId } from '@/lib/isc/tracks'

const INPUT =
  'w-full px-4 py-2.5 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

/** Every field on an ISC entry is required, so the marker is unconditional. */
function Required() {
  return (
    <span className="text-red-500 ml-0.5" aria-hidden="true">
      *
    </span>
  )
}

export function EntryForm({
  entryId,
  track,
  submission,
  status,
  locked,
  canEdit,
}: {
  entryId: string
  track: IscTrackId
  submission: Record<string, unknown>
  status: string
  locked: boolean
  canEdit: boolean
}) {
  // One hook, one action: the two buttons differ only by the `intent` they
  // post. Separate hooks could not express "whichever ran most recently".
  const [state, action, pending] = useActionState<EntryFormState, FormData>(
    entryFormAction,
    undefined
  )

  const readOnly = locked || !canEdit

  // Send the student straight to the field that needs fixing. On a seven-field
  // form, an error message at the bottom is easy to miss and gives no clue
  // which input it is about.
  useEffect(() => {
    if (!state?.field) return
    const el = document.getElementById(state.field)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Focus after the scroll starts, so the browser does not fight it.
    const t = setTimeout(() => (el as HTMLElement).focus({ preventScroll: true }), 150)
    return () => clearTimeout(t)
  }, [state])

  return (
    <form action={action} className="clay-card p-6 space-y-5">
      <input type="hidden" name="entry_id" value={entryId} />
      <input type="hidden" name="track" value={track} />

      {!readOnly && (
        <p className="text-xs text-muted">
          All fields are required
          <Required />
        </p>
      )}

      {TRACK_FIELDS[track].map((spec) => {
        const value = (submission?.[spec.key] as string) ?? ''
        const errored = state?.field === spec.key
        // A red border on the offending field, so it is obvious once scrolled to.
        const cls = `${INPUT} disabled:opacity-70 ${errored ? 'border-red-400' : ''}`
        return (
          <div key={spec.key}>
            <label htmlFor={spec.key} className="block text-sm font-medium text-foreground mb-1">
              {spec.label}
              {!readOnly && <Required />}
            </label>
            {spec.kind === 'textarea' ? (
              <textarea
                id={spec.key}
                name={spec.key}
                defaultValue={value}
                rows={5}
                maxLength={spec.max}
                disabled={readOnly}
                aria-invalid={errored || undefined}
                className={`${cls} resize-y`}
              />
            ) : spec.kind === 'select' ? (
              <select
                id={spec.key}
                name={spec.key}
                defaultValue={value}
                disabled={readOnly}
                aria-invalid={errored || undefined}
                className={cls}
              >
                <option value="">Choose one</option>
                {(spec.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={spec.key}
                name={spec.key}
                type={spec.kind === 'url' ? 'url' : 'text'}
                defaultValue={value}
                maxLength={spec.max}
                disabled={readOnly}
                aria-invalid={errored || undefined}
                placeholder={spec.placeholder ?? (spec.kind === 'url' ? 'https://' : undefined)}
                className={cls}
              />
            )}
            {spec.help && <p className="text-xs text-muted mt-1">{spec.help}</p>}
            {errored && <p className="text-xs text-red-600 mt-1">{state?.error}</p>}
          </div>
        )
      })}

      {!readOnly && (
        <p className="text-xs text-muted">
          Your parent or guardian already agreed to you entering ISC 2026.
        </p>
      )}

      {/* Only shown when the problem is not tied to a specific field — a
          field-level error is already printed under that field. */}
      {state?.error && !state.field && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">{state.ok}</p>
      )}

      {readOnly ? (
        <p className="text-sm text-muted">
          {locked
            ? 'Entries for this track have closed, so this can no longer be edited.'
            : 'Only your team leader can edit this entry.'}
        </p>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={pending}
            className="px-5 h-11 rounded-xl text-sm font-semibold border border-black/10 text-foreground hover:bg-black/[0.03] disabled:opacity-60"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
            className="clay-button bg-cta text-white px-6 h-11 text-sm font-semibold disabled:opacity-60"
          >
            {pending ? 'Working…' : status === 'submitted' ? 'Save changes' : 'Submit entry'}
          </button>
        </div>
      )}
    </form>
  )
}
