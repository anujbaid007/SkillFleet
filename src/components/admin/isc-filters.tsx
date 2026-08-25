'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { ISC_TRACKS } from '@/lib/isc/tracks'

const SELECT =
  'h-9 px-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs font-semibold text-foreground focus:outline-none focus:border-primary'

/**
 * Filters write to the query string rather than local state, so a filtered view
 * is a real URL an admin can bookmark or paste to a colleague.
 */
export function IscFilters({
  schools,
  languages,
  showing,
  total,
}: {
  schools: string[]
  languages: string[]
  showing: number
  total: number
}) {
  const router = useRouter()
  const params = useSearchParams()

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    const qs = next.toString()
    router.push(qs ? `/admin/isc?${qs}` : '/admin/isc')
  }

  const active = ['track', 'status', 'school', 'language', 'q'].filter((k) => params.get(k))

  return (
    <div className="clay-card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            defaultValue={params.get('q') ?? ''}
            onChange={(e) => {
              const v = e.target.value
              // Debounce so each keystroke is not its own navigation.
              window.clearTimeout(
                (window as unknown as { __iscQ?: number }).__iscQ
              )
              ;(window as unknown as { __iscQ?: number }).__iscQ = window.setTimeout(
                () => set('q', v),
                350
              )
            }}
            placeholder="Search student or school"
            aria-label="Search entries"
            className="w-full h-9 pl-9 pr-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={params.get('track') ?? ''}
          onChange={(e) => set('track', e.target.value)}
          aria-label="Filter by track"
          className={SELECT}
        >
          <option value="">All tracks</option>
          {ISC_TRACKS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={params.get('status') ?? ''}
          onChange={(e) => set('status', e.target.value)}
          aria-label="Filter by status"
          className={SELECT}
        >
          <option value="">Any status</option>
          <option value="submitted">Submitted</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={params.get('language') ?? ''}
          onChange={(e) => set('language', e.target.value)}
          aria-label="Filter by language"
          className={SELECT}
        >
          <option value="">Any language</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={params.get('school') ?? ''}
          onChange={(e) => set('school', e.target.value)}
          aria-label="Filter by school"
          className={`${SELECT} max-w-[220px]`}
        >
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted">
          Showing <span className="font-semibold text-foreground">{showing}</span> of {total}{' '}
          {total === 1 ? 'entry' : 'entries'}
        </p>
        {active.length > 0 && (
          <button
            type="button"
            onClick={() => router.push('/admin/isc')}
            className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear {active.length} filter{active.length === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </div>
  )
}
