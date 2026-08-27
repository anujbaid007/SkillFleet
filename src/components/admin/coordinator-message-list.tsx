'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, MessageCircle, Search } from 'lucide-react'

export interface MessageableCoordinator {
  coordinatorId: string
  name: string
  schoolName: string
  /** "Pune, Maharashtra" — two coordinators can share a name, or a school
      name can repeat across districts, so place is what disambiguates. */
  location: string
}

/**
 * Search across name, school and place at once.
 *
 * An admin looking for someone rarely remembers which of the three they know
 * — "the Pune one", "someone at DPS", "Anita" all have to work. Matching on
 * the three joined together costs nothing at this size and avoids making the
 * admin pick a field before they can type.
 */
export function CoordinatorMessageList({
  coordinators,
}: {
  coordinators: MessageableCoordinator[]
}) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return coordinators
    return coordinators.filter((c) =>
      `${c.name} ${c.schoolName} ${c.location}`.toLowerCase().includes(q)
    )
  }, [coordinators, query])

  if (coordinators.length === 0) {
    return (
      <div className="clay-card p-12 text-center text-muted text-sm">
        No approved coordinators yet. Approve an application first, then you can message them.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="clay-card p-5 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, school, or place"
            aria-label="Search coordinators"
            className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-black/[0.06] bg-white text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
          />
        </div>
        <p className="text-xs text-muted">
          Showing <span className="font-semibold text-foreground">{visible.length}</span> of{' '}
          {coordinators.length}{' '}
          {coordinators.length === 1 ? 'coordinator' : 'coordinators'}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted text-sm">
          No coordinator matches that search.
        </div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.05]">
          {visible.map((c) => (
            <Link
              key={c.coordinatorId}
              href={`/admin/coordinators/support/${c.coordinatorId}`}
              className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-black/[0.02] transition-colors group"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground truncate">
                  {c.name}
                </span>
                <span className="block text-xs text-muted truncate mt-0.5">
                  {c.schoolName} · {c.location}
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
