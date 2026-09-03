'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { Bell, Compass } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'
import { CatalogCardLink } from '@/components/catalog/coming-soon'
import { OFFERING_STATUS_META, OFFERING_TYPE_META } from '@/lib/offering-meta'
import { catalogViewFor } from '@/lib/commerce/catalog-view'
import {
  catalogHref,
  filterOfferings,
  parseCatalogFilters,
  toFilters,
  type CatalogQuery,
  type FilterableOffering,
} from '@/lib/commerce/catalog-filter'

/*
  The Explore page holds the whole catalogue once and filters it here, in the
  browser. Before this every chip was a link back to the server, and each tap
  waited on a full render of the page. Chips are still links, so a shared or
  bookmarked address restores the same view and a no-script visitor can keep
  browsing; the click just answers from memory and updates the address bar
  quietly instead of navigating.
*/
export interface ExplorerOffering extends FilterableOffering {
  title: string
  description: string | null
  price_paise: number
  min_age: number | null
  max_age: number | null
  image_url: string | null
  interest_count: number
  topics: { id: string; name: string; category_id: string; categories: { id: string; name: string } | null } | null
}

const STATUS_OPTIONS = [
  { value: '', label: 'Show everything' },
  { value: 'bookable', label: 'Available to book' },
  { value: 'planned', label: 'Planned (coming soon)' },
  { value: 'completed', label: 'Past activities' },
]

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export function CatalogExplorer({
  offerings,
  categories,
  initial,
  nowMs,
  comingSoon,
}: {
  offerings: ExplorerOffering[]
  categories: { id: string; name: string }[]
  initial: CatalogQuery
  /** Decided once on the server, so nothing impure runs during render here. */
  nowMs: number
  comingSoon: boolean
}) {
  const [query, setQuery] = useState<Required<CatalogQuery>>({
    type: initial.type ?? null,
    category: initial.category ?? null,
    status: initial.status ?? null,
  })

  // Back and forward still work: the address is the source of truth.
  useEffect(() => {
    const onPop = () => setQuery(parseCatalogFilters(window.location.search))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // The address follows the state, not the other way round, so two quick
  // taps cannot race each other. Keeping Next's own history state intact is
  // what lets its router carry on treating this as the same page.
  useEffect(() => {
    const href = catalogHref(query)
    if (window.location.pathname + window.location.search !== href) {
      window.history.replaceState(window.history.state, '', href)
    }
  }, [query])

  const filters = useMemo(() => toFilters(query), [query])
  const rows = useMemo(() => filterOfferings(offerings, filters, nowMs), [offerings, filters, nowMs])

  function apply(patch: Partial<Required<CatalogQuery>>) {
    setQuery((prev) => ({ ...prev, ...patch }))
  }

  const chip = (patch: Partial<Required<CatalogQuery>>) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    apply(patch)
  }

  const typeChip = (selected: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${selected ? 'bg-primary text-white' : 'bg-white text-muted border border-black/10 hover:text-foreground'}`
  const categoryChip = (selected: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected ? 'border-primary text-primary bg-primary/5' : 'border-black/10 text-muted hover:text-foreground'}`

  return (
    <>
      <Reveal delay={0.05}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={catalogHref({ ...query, type: null })} onClick={chip({ type: null })} className={typeChip(!query.type)}>
              All types
            </Link>
            {Object.entries(OFFERING_TYPE_META).map(([value, meta]) => (
              <Link key={value} href={catalogHref({ ...query, type: value })} onClick={chip({ type: value })} className={typeChip(query.type === value)}>
                {meta.label}
              </Link>
            ))}
            <div className="ml-auto">
              <select
                // Old links carried status=all; they still mean the default view.
                value={catalogViewFor(query.status ?? undefined) === 'everything' ? '' : (query.status ?? '')}
                onChange={(e) => apply({ status: e.target.value || null })}
                aria-label="Filter by availability"
                className="h-9 px-3 rounded-full border border-black/10 bg-white text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link href={catalogHref({ ...query, category: null })} onClick={chip({ category: null })} className={categoryChip(!query.category)}>
                All categories
              </Link>
              {categories.map((c) => (
                <Link key={c.id} href={catalogHref({ ...query, category: c.id })} onClick={chip({ category: c.id })} className={categoryChip(query.category === c.id)}>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {rows.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="clay-card p-12 text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Compass className="w-7 h-7 text-primary" />
            </div>
            <p className="font-display font-bold text-foreground">Nothing here yet</p>
            <p className="text-muted text-sm max-w-md mx-auto">
              {filters.view === 'bookable'
                ? 'Nothing left to book here right now. Activities already booked, or outside your child’s age range, are hidden — switch to “Show everything” to see the full catalogue.'
                : 'No activities match these filters — try a different type or category.'}
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((o, i) => {
            const meta = OFFERING_TYPE_META[o.type]
            const Icon = meta?.icon
            const status = OFFERING_STATUS_META[o.status]
            return (
              <Reveal key={o.id} delay={Math.min(i * 0.05, 0.4)}>
                <CatalogCardLink
                  href={`/catalog/${o.id}`}
                  comingSoon={comingSoon}
                  className="clay-card p-0 flex flex-col h-full group overflow-hidden"
                >
                  {/* Cover image (or a type-coded gradient fallback). Rendered as a
                      background so it always fills the box, matching the fallback exactly.
                      shrink-0 guarantees the 40-tall image never compresses in the flex column. */}
                  <div className="relative h-40 w-full shrink-0 overflow-hidden">
                    {o.image_url ? (
                      <div
                        role="img"
                        aria-label={o.title}
                        className="absolute inset-0 group-hover:scale-105 transition-transform duration-300"
                        style={{ backgroundImage: `url("${o.image_url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                    ) : (
                      <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                        {Icon && <Icon className="w-10 h-10 text-white/90" />}
                      </div>
                    )}
                    {/* Consistent hairline frame so cover-image and gradient cards read with equal weight */}
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/[0.07] pointer-events-none" />
                    {/* Type chip (top-left) + status (top-right) overlays */}
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-foreground backdrop-blur-sm">
                      {Icon && <Icon className="w-3 h-3" />} {meta?.label ?? o.type}
                    </span>
                    {status && (
                      <span className={`absolute top-2.5 right-2.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${status.badge}`}>
                        {status.label}
                      </span>
                    )}
                  </div>

                  {/* Info below */}
                  <div className="flex flex-col flex-1 p-5">
                    {o.topics?.categories && (
                      <span className="text-xs text-muted truncate mb-1">{o.topics.categories.name}</span>
                    )}
                    <h2 className="font-display font-bold text-foreground leading-snug">{o.title}</h2>
                    {o.description && <p className="text-xs text-muted line-clamp-2 mt-1">{o.description}</p>}
                    <div className="flex items-center justify-between pt-3 mt-auto">
                      <span className="font-display text-lg font-bold text-foreground">{formatPrice(o.price_paise)}</span>
                      {o.status === 'planned' ? (
                        <span className="text-xs text-accent-yellow font-semibold inline-flex items-center gap-1">
                          <Bell className="w-3 h-3" /> {o.interest_count} interested
                        </span>
                      ) : (
                        (o.min_age || o.max_age) && (
                          <span className="text-xs text-muted font-medium">
                            Ages {o.min_age ?? '0'}–{o.max_age ?? '18+'}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </CatalogCardLink>
              </Reveal>
            )
          })}
        </div>
      )}
    </>
  )
}
