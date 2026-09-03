import { describe, expect, it } from 'vitest'
import { catalogHref, filterOfferings, parseCatalogFilters } from '../catalog-filter'

const now = Date.parse('2026-09-03T12:00:00Z')
const rows = [
  { id: 'a', type: 'workshop', status: 'live', scheduled_at: '2026-10-01T00:00:00Z', topics: { category_id: 'cs' }, bookable: true },
  { id: 'b', type: 'trip', status: 'live', scheduled_at: '2026-08-01T00:00:00Z', topics: { category_id: 'out' }, bookable: true },
  { id: 'c', type: 'workshop', status: 'planned', scheduled_at: null, topics: { category_id: 'cs' }, bookable: false },
  { id: 'd', type: 'event', status: 'completed', scheduled_at: '2026-07-01T00:00:00Z', topics: null, bookable: false },
  { id: 'e', type: 'workshop', status: 'live', scheduled_at: '2026-11-01T00:00:00Z', topics: { category_id: 'cs' }, bookable: false },
]
const ids = (xs: { id: string }[]) => xs.map((x) => x.id)

describe('filterOfferings', () => {
  it('shows everything by default', () => {
    expect(ids(filterOfferings(rows, { view: 'everything' }, now))).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
  it('narrows by type and by category independently', () => {
    expect(ids(filterOfferings(rows, { view: 'everything', type: 'workshop' }, now))).toEqual(['a', 'c', 'e'])
    expect(ids(filterOfferings(rows, { view: 'everything', category: 'out' }, now))).toEqual(['b'])
    expect(ids(filterOfferings(rows, { view: 'everything', type: 'workshop', category: 'out' }, now))).toEqual([])
  })
  it('bookable means live, still upcoming, and bookable by someone in the family', () => {
    expect(ids(filterOfferings(rows, { view: 'bookable' }, now))).toEqual(['a'])
  })
  it('planned and completed views pass through by status', () => {
    expect(ids(filterOfferings(rows, { view: 'planned' }, now))).toEqual(['c'])
    expect(ids(filterOfferings(rows, { view: 'completed' }, now))).toEqual(['d'])
  })
})

describe('catalogHref and parseCatalogFilters round-trip', () => {
  it('omits empty filters and keeps the rest', () => {
    expect(catalogHref({})).toBe('/catalog')
    expect(catalogHref({ type: 'trip' })).toBe('/catalog?type=trip')
    expect(catalogHref({ type: 'trip', category: 'out', status: 'bookable' })).toBe('/catalog?type=trip&category=out&status=bookable')
  })
  it('parses a query string back into the same filters', () => {
    expect(parseCatalogFilters('?type=trip&category=out&status=bookable')).toEqual({ type: 'trip', category: 'out', status: 'bookable' })
    expect(parseCatalogFilters('')).toEqual({ type: null, category: null, status: null })
  })
})
