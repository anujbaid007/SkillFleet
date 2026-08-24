'use client'

import { useActionState } from 'react'
import { entryFormAction, type EntryFormState } from '@/app/actions/isc'
import { TRACK_FIELDS, type IscTrackId } from '@/lib/isc/tracks'

const INPUT =
  'w-full px-4 py-2.5 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

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

  return (
    <form action={action} className="clay-card p-6 space-y-5">
      <input type="hidden" name="entry_id" value={entryId} />
      <input type="hidden" name="track" value={track} />

      {TRACK_FIELDS[track].map((spec) => {
        const value = (submission?.[spec.key] as string) ?? ''
        return (
          <div key={spec.key}>
            <label htmlFor={spec.key} className="block text-sm font-medium text-foreground mb-1">
              {spec.label}
            </label>
            {spec.kind === 'textarea' ? (
              <textarea
                id={spec.key}
                name={spec.key}
                defaultValue={value}
                rows={5}
                maxLength={spec.max}
                disabled={readOnly}
                className={`${INPUT} resize-y disabled:opacity-70`}
              />
            ) : (
              <input
                id={spec.key}
                name={spec.key}
                type={spec.kind === 'url' ? 'url' : 'text'}
                defaultValue={value}
                maxLength={spec.max}
                disabled={readOnly}
                placeholder={spec.kind === 'url' ? 'https://' : undefined}
                className={`${INPUT} disabled:opacity-70`}
              />
            )}
            {spec.help && <p className="text-xs text-muted mt-1">{spec.help}</p>}
          </div>
        )
      })}

      {!readOnly && (
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input type="checkbox" name="consent" className="mt-1" />
          <span>
            My parent or guardian agrees to my taking part, and to Skill Fleet showing this entry
            for the championship. The work stays mine.
          </span>
        </label>
      )}

      {state?.error && (
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
