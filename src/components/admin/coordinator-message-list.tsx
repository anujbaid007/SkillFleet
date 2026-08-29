'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, MessageCircle, Search, X } from 'lucide-react'

export interface MessageableCoordinator {
  coordinatorId: string
  name: string
  schoolName: string
  state: string
  district: string
}

const SELECT =
  'h-11 px-3 rounded-lg border border-black/10 bg-white text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 disabled:bg-slate-50'

/**
 * Find one coordinator out of a list that will keep growing.
 *
 * Search matches name, school and place together, because an admin rarely
 * remembers which of the three they know — "the Pune one", "someone at DPS",
 * "Anita" all have to work.
 *
 * State and district narrow it structurally, for when search alone would still
 * leave too many: options are built from the coordinators actually present, so
 * a filter can never offer a place that returns nothing, and district stays
 * disabled until a state is chosen since a district only means something
 * inside one.
 */
export function CoordinatorMessageList({
  coordinators,
}: {
  coordinators: MessageableCoordinator[]
}) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')

  const states = useMemo(
    () => [...new Set(coordinators.map((c) => c.state).filter(Boolean))].sort(),
    [coordinators]
  )

  const districts = useMemo(
    () =>
      [
        ...new Set(
          coordinators
            .filter((c) => !state || c.state === state)
            .map((c) => c.district)
            .filter(Boolean)
        ),
      ].sort(),
    [coordinators, state]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return coordinators.filter((c) => {
      if (state && c.state !== state) return false
      if (district && c.district !== district) return false
      if (q && !`${c.name} ${c.schoolName} ${c.district} ${c.state}`.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [coordinators, query, state, district])

  // A district from another state would silently match nothing, so changing
  // the state clears it — the same rule the ISC filter bar used to apply.
  const onStateChange = (next: string) => {
    setState(next)
    setDistrict('')
  }

  const activeCount = [query.trim(), state, district].filter(Boolean).length

  if (coordinators.length === 0) {
    return (
      <div className="dash-panel p-12 text-center text-muted text-sm">
        No approved coordinators yet. Approve an application first, then you can message them.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="dash-panel p-5 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, school, or place"
              aria-label="Search coordinators"
              className="w-full h-11 pl-10 pr-3 rounded-lg border border-black/10 bg-white text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <select
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            aria-label="Filter coordinators by state"
            className={SELECT}
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            aria-label="Filter coordinators by district"
            disabled={!state}
            className={SELECT}
          >
            <option value="">{state ? 'All districts' : 'Pick a state first'}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted">
            Showing <span className="font-semibold text-foreground">{visible.length}</span> of{' '}
            {coordinators.length}{' '}
            {coordinators.length === 1 ? 'coordinator' : 'coordinators'}
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setState('')
                setDistrict('')
              }}
              className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="dash-panel p-12 text-center text-muted text-sm">
          No coordinator matches those filters.
        </div>
      ) : (
        <div className="dash-panel divide-y divide-black/[0.05]">
          {visible.map((c) => (
            <Link
              key={c.coordinatorId}
              href={`/admin/coordinators/support/${c.coordinatorId}`}
              className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors group"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground truncate">
                  {c.name}
                </span>
                <span className="block text-xs text-muted truncate mt-0.5">
                  {c.schoolName} · {c.district}, {c.state}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0 text-muted group-hover:text-primary transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline">Message</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
