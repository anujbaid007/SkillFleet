import { catalogViewFor, type CatalogView } from './catalog-view'

/*
  The Explore page's filtering, kept pure so the browser can run it on the
  list it already holds. Switching a chip then costs nothing, where a round
  trip to the server cost a full render of the page.
*/
export interface FilterableOffering {
  id: string
  type: string
  status: string
  scheduled_at: string | null
  topics: { category_id: string } | null
  /** Decided on the server, where the family's ages and bookings live. */
  bookable: boolean
}

export interface CatalogFilters {
  type?: string | null
  category?: string | null
  view: CatalogView
}

export function filterOfferings<T extends FilterableOffering>(rows: T[], f: CatalogFilters, nowMs: number): T[] {
  let out = rows
  if (f.type) out = out.filter((o) => o.type === f.type)
  if (f.category) out = out.filter((o) => o.topics?.category_id === f.category)
  if (f.view === 'planned' || f.view === 'completed') {
    out = out.filter((o) => o.status === f.view)
  } else if (f.view === 'bookable') {
    const upcoming = (o: T) => o.scheduled_at == null || new Date(o.scheduled_at).getTime() >= nowMs
    out = out.filter((o) => o.status === 'live' && upcoming(o) && o.bookable)
  }
  return out
}

/** The address bar's view of the filters: what the chips link to and what a shared link restores. */
export interface CatalogQuery {
  type?: string | null
  category?: string | null
  status?: string | null
}

export function catalogHref(q: CatalogQuery): string {
  const params = new URLSearchParams()
  if (q.type) params.set('type', q.type)
  if (q.category) params.set('category', q.category)
  if (q.status) params.set('status', q.status)
  const qs = params.toString()
  return `/catalog${qs ? `?${qs}` : ''}`
}

export function parseCatalogFilters(search: string): Required<CatalogQuery> {
  const p = new URLSearchParams(search)
  return { type: p.get('type'), category: p.get('category'), status: p.get('status') }
}

export function toFilters(q: CatalogQuery): CatalogFilters {
  return { type: q.type ?? null, category: q.category ?? null, view: catalogViewFor(q.status ?? undefined) }
}
