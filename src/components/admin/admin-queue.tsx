'use client'

import { useActionState, useState, type ReactNode } from 'react'
import Link from 'next/link'

/*
  The frame every review queue sits in: status tabs, a search box, a page of
  rows with a checkbox each, and a bulk bar that appears once something is
  ticked.

  The rows themselves are passed in as ReactNode. Each queue draws its own row
  -- a school with its likely duplicates, a coordinator with their phone
  number and board, a certificate with its skill and points -- and this
  component never needs to know what is in one.

  TWO THINGS THIS GETS RIGHT ON PURPOSE, because both are ways to approve the
  wrong row:

  * A SELECTION BELONGS TO ONE PAGE. When the set of visible ids changes --
    a page link, a new search, or the list shifting under the admin after a
    bulk action -- the selection is dropped. Carrying ticks across a page
    boundary would mean submitting ids the admin can no longer see.
  * WHAT IS SUBMITTED IS WHAT IS ON SCREEN. The ids sent to the action are the
    intersection of the ticked set and the rows currently rendered, never the
    ticked set alone.
*/

/** What a bulk action reports back. `failed` is never folded into `ok`. */
export interface BulkResult {
  ok: number
  failed: number
  /** Plain sentence for the admin: what happened, and why anything failed. */
  message: string
}

export interface QueueTab {
  label: string
  href: string
  active: boolean
}

export interface QueueRow {
  id: string
  node: ReactNode
  /** False for a row no bulk decision can touch -- one already reviewed. */
  selectable: boolean
}

const TAB_ON = 'bg-primary text-white'
const TAB_OFF = 'border border-black/10 text-muted hover:text-foreground'

export function AdminQueue({
  basePath,
  status,
  tabs,
  q,
  searchLabel,
  searchPlaceholder,
  rows,
  summary,
  emptyMessage,
  pagination,
  action,
  approveLabel = 'Approve selected',
  approveFields,
  rejectPlaceholder = 'Why are these being rejected?',
}: {
  basePath: string
  /** Carried through the search form as a hidden field, so searching stays on the tab. */
  status: string
  tabs: QueueTab[]
  q?: string
  searchLabel: string
  searchPlaceholder: string
  rows: QueueRow[]
  /** How many rows match, in the queue's own words. Rendered by the server. */
  summary?: ReactNode
  emptyMessage: string
  /** Rendered by the server so Pagination keeps its own link building. */
  pagination?: ReactNode
  /** A server action. It re-checks the admin role itself; this form is not a gate. */
  action: (formData: FormData) => Promise<BulkResult>
  approveLabel?: string
  /** Extra inputs the approve decision needs -- the certificates queue's points. */
  approveFields?: ReactNode
  rejectPlaceholder?: string
}) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set())
  const [rejecting, setRejecting] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Which rows are on screen right now, as one comparable string. Adjusting
  // state during render rather than in an effect: React re-runs this component
  // immediately with the new state and never commits the stale selection.
  const signature = rows.map((r) => r.id).join(',')
  const [lastSignature, setLastSignature] = useState(signature)
  if (signature !== lastSignature) {
    setLastSignature(signature)
    setTicked(new Set())
    setRejecting(false)
  }

  const [result, formAction, pending] = useActionState<BulkResult | null, FormData>(
    async (_prev, formData) => {
      const outcome = await action(formData)
      setTicked(new Set())
      setRejecting(false)
      setDismissed(false)
      return outcome
    },
    null
  )

  const selectableIds = rows.filter((r) => r.selectable).map((r) => r.id)
  // The intersection, not the ticked set: a tick for a row that is no longer
  // rendered is never submitted.
  const selectedIds = selectableIds.filter((id) => ticked.has(id))
  const allTicked = selectableIds.length > 0 && selectedIds.length === selectableIds.length

  function toggle(id: string) {
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setTicked(allTicked ? new Set() : new Set(selectableIds))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${t.active ? TAB_ON : TAB_OFF}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* A GET form: the search term lands in the URL, so a filtered queue can
          be bookmarked, shared, or linked to from the header search box. */}
      <form method="get" action={basePath} className="clay-card flex flex-wrap items-center gap-2 p-4">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className="h-10 min-w-[14rem] flex-1 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm text-foreground placeholder:text-muted/60"
        />
        <button type="submit" className="clay-button h-10 bg-cta px-4 text-sm font-semibold text-white">
          Search
        </button>
        {q && (
          <Link
            href={`${basePath}?status=${encodeURIComponent(status)}`}
            className="inline-flex h-10 items-center px-3 text-sm text-muted hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {result && !dismissed && (
        <div
          role="status"
          className={`clay-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm ${
            result.failed > 0 ? 'text-foreground' : 'text-green-700'
          }`}
        >
          <span>{result.message}</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs font-semibold text-muted hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        // The pagination goes here too: page nine thousand of a two-page queue
        // is an empty list, and without a Previous link the only way back is
        // to notice the tabs.
        <div className="clay-card p-12 text-center">
          <p className="text-muted">{emptyMessage}</p>
          {pagination && <div className="mt-4 text-left">{pagination}</div>}
        </div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.06]">
          {(summary || selectableIds.length > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              {selectableIds.length > 0 ? (
                <label className="flex cursor-pointer items-center gap-3 text-xs font-semibold text-muted">
                  <input
                    type="checkbox"
                    checked={allTicked}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-black/20 accent-primary"
                  />
                  Select every row on this page
                </label>
              ) : (
                <span />
              )}
              {summary && <span className="text-xs text-muted">{summary}</span>}
            </div>
          )}
          {/* The checkbox is a column of its own so each queue's row keeps the
              padding and layout it already had. */}
          {rows.map((row) => (
            <div key={row.id} className="flex items-start">
              <span className="shrink-0 pl-5 pt-[1.55rem]">
                {row.selectable ? (
                  <input
                    type="checkbox"
                    checked={ticked.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label="Select this row"
                    className="h-4 w-4 rounded border-black/20 accent-primary"
                  />
                ) : (
                  <span className="block h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">{row.node}</div>
            </div>
          ))}
          {pagination && <div className="px-5 pb-5">{pagination}</div>}
        </div>
      )}

      {selectedIds.length > 0 && (
        <form
          action={formAction}
          className="clay-card sticky bottom-4 z-20 flex flex-wrap items-center gap-3 border-2 border-primary/20 bg-white p-4"
        >
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <p className="text-sm font-semibold text-foreground">
            {selectedIds.length} selected
          </p>

          {rejecting ? (
            <>
              {/* A textarea, not a single line: a school reads this reason
                  back, so it needs room to be written properly. */}
              <textarea
                name="note"
                required
                rows={2}
                placeholder={rejectPlaceholder}
                aria-label="Reason for rejecting these rows"
                className="min-h-[2.5rem] min-w-[16rem] flex-1 resize-y rounded-xl border-2 border-black/[0.06] px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                name="decision"
                value="reject"
                disabled={pending}
                className="h-10 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? 'Working…' : 'Confirm reject'}
              </button>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="h-10 px-3 text-xs font-semibold text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {approveFields}
              <button
                type="submit"
                name="decision"
                value="approve"
                disabled={pending}
                className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {pending ? 'Working…' : approveLabel}
              </button>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="h-10 rounded-xl border border-black/10 px-4 text-xs font-semibold text-muted hover:text-red-600"
              >
                Reject selected
              </button>
            </>
          )}
        </form>
      )}
    </div>
  )
}
