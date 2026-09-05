'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { SearchHit } from '@/lib/admin/users'

const GROUP_ORDER: SearchHit['kind'][] = ['student', 'school', 'coordinator']
const GROUP_LABEL: Record<SearchHit['kind'], string> = {
  student: 'Students',
  school: 'Schools',
  coordinator: 'Coordinators',
}

/** Matches SEARCH_MIN_LENGTH in src/lib/admin/users.ts: below this, admin_search
 *  returns nothing, and the SQL comment says so is not cheap to find out. */
const MIN_LENGTH = 2
const DEBOUNCE_MS = 250

function hrefFor(hit: SearchHit): string {
  switch (hit.kind) {
    case 'student':
      return `/admin/users/${hit.id}`
    case 'school':
      // The schools page does not read `q` yet -- that lands in a later
      // task -- but the parameter is harmless today and correct once it does.
      return `/admin/schools?q=${encodeURIComponent(hit.title)}`
    case 'coordinator':
      return `/admin/coordinators?q=${encodeURIComponent(hit.title)}`
  }
}

/**
 * The admin header's search box: one input that finds a student, a school or
 * a coordinator by name, email, phone or affiliation number, without leaving
 * whatever admin page is open.
 *
 * Debounced 250ms so a fast typist does not fire a request per keystroke, and
 * fires nothing at all under two characters -- the same floor admin_search
 * itself applies, and for the same reason: a one-letter query is not a real
 * search, it is most of the database.
 */
export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  // The last query whose fetch actually finished (success or failure). Set
  // only inside the async callbacks below, never synchronously in the effect.
  const [settledQuery, setSettledQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)

  const trimmed = query.trim()
  // Derived at render time, not a separate boolean flipped synchronously in
  // the effect below: still searching whenever the current query has not
  // finished a round trip yet.
  const loading = trimmed.length >= MIN_LENGTH && settledQuery !== trimmed

  useEffect(() => {
    // Below the floor there is nothing to fetch, and the panel already stays
    // closed at this length (see showPanel) -- so there is nothing to
    // synchronise with an external system yet.
    if (trimmed.length < MIN_LENGTH) return
    const id = ++requestId.current
    const timer = setTimeout(() => {
      fetch(`/admin/search?q=${encodeURIComponent(trimmed)}`, { cache: 'no-store' })
        .then((res) => {
          if (id !== requestId.current) return
          if (!res.ok) throw new Error('search failed')
          return res.json() as Promise<{ hits: SearchHit[] }>
        })
        .then((body) => {
          if (id !== requestId.current || !body) return
          setHits(body.hits ?? [])
          setFailed(false)
          setSettledQuery(trimmed)
          setActiveIndex(-1)
        })
        .catch(() => {
          if (id !== requestId.current) return
          setHits([])
          setFailed(true)
          setSettledQuery(trimmed)
        })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [trimmed])

  // Close on a click outside the box, so the panel does not linger over
  // whatever the admin clicks next.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((kind) => ({ kind, items: hits.filter((h) => h.kind === kind) })).filter(
        (g) => g.items.length > 0
      ),
    [hits]
  )
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped])

  function go(hit: SearchHit) {
    setOpen(false)
    setQuery('')
    setHits([])
    router.push(hrefFor(hit))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      e.currentTarget.blur()
      return
    }
    if (!open || flat.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length)
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < flat.length) {
      e.preventDefault()
      go(flat[activeIndex])
    }
  }

  const showPanel = open && trimmed.length >= MIN_LENGTH
  const announcement =
    trimmed.length < MIN_LENGTH
      ? ''
      : loading
        ? 'Searching…'
        : failed
          ? 'Search failed.'
          : hits.length === 0
            ? 'No matches.'
            : `${hits.length} ${hits.length === 1 ? 'result' : 'results'}.`

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="admin-global-search-listbox"
          aria-autocomplete="list"
          aria-label="Search students, schools or coordinators"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search students, schools, coordinators…"
          className="h-10 w-full rounded-xl border-2 border-black/[0.06] bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {showPanel && (
        <div
          id="admin-global-search-listbox"
          role="listbox"
          className="clay-card absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto p-2"
        >
          {loading && flat.length === 0 && <p className="px-3 py-2 text-sm text-muted">Searching…</p>}
          {!loading && failed && <p className="px-3 py-2 text-sm text-muted">Search failed. Try again.</p>}
          {!loading && !failed && hits.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">No matches.</p>
          )}
          {grouped.map((g) => (
            <div key={g.kind} className="mb-1 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                {GROUP_LABEL[g.kind]}
              </p>
              {g.items.map((hit) => {
                const index = flat.indexOf(hit)
                const active = index === activeIndex
                return (
                  <button
                    type="button"
                    key={`${hit.kind}-${hit.id}`}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(hit)}
                    className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors ${
                      active ? 'bg-primary/10' : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{hit.title}</span>
                    {hit.subtitle && <span className="text-xs text-muted">{hit.subtitle}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
