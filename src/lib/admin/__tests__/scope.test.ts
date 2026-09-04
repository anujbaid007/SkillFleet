import { describe, it, expect } from 'vitest'
import {
  parseRosterFilters,
  rosterFiltersToQuery,
  scopeToRpcArgs,
  geoScopeToRpcArgs,
  filtersToRpcArgs,
  normalizeScope,
  parseScope,
  scopeHasOrphanDistrict,
  pageCount,
  MAX_PAGE,
  MAX_FILTER_LENGTH,
  type SearchParams,
} from '@/lib/admin/scope'

describe('parseRosterFilters', () => {
  it('reads known keys and defaults page to 1', () => {
    expect(parseRosterFilters({ track: 'ai_for_impact', page: '3', junk: 'x' })).toEqual({
      track: 'ai_for_impact',
      page: 3,
    })
  })
  it('ignores bad pages and empty strings', () => {
    expect(parseRosterFilters({ page: '-2', q: '' })).toEqual({ page: 1 })
    expect(parseRosterFilters({ page: 'abc' })).toEqual({ page: 1 })
  })
  it('takes the first value of an array', () => {
    expect(parseRosterFilters({ status: ['submitted', 'draft'] })).toEqual({
      status: 'submitted',
      page: 1,
    })
  })
  it('never throws, whatever the query string holds', () => {
    const junk: SearchParams[] = [
      {},
      { page: [] },
      { page: ['', ''] },
      { q: '   ' },
      { track: undefined, status: [] },
      { page: '0' },
      { page: '1e30' },
      { page: '99999999999999999999' },
      { page: '3.9' },
      { q: 'x'.repeat(5000) },
    ]
    for (const sp of junk) {
      const f = parseRosterFilters(sp)
      expect(Number.isInteger(f.page)).toBe(true)
      expect(f.page).toBeGreaterThanOrEqual(1)
      expect(f.page).toBeLessThanOrEqual(MAX_PAGE)
    }
  })
  it('trims values and caps their length', () => {
    expect(parseRosterFilters({ track: '  ai_for_impact  ' }).track).toBe('ai_for_impact')
    expect(parseRosterFilters({ q: 'x'.repeat(5000) }).q).toHaveLength(MAX_FILTER_LENGTH)
  })
  it('round-trips: parse -> query -> parse is a fixed point', () => {
    const inputs: SearchParams[] = [
      { track: 'ai_for_impact', page: '3', junk: 'x' },
      { q: 'a b', status: 'submitted' },
      { page: '-2', q: '' },
      { page: '99999999999999999999' },
      { division: 'group1', language: 'English', page: '7' },
      { q: '  padded  ', page: '3.9' },
      { q: 'x'.repeat(5000) },
      { status: ['submitted', 'draft'] },
    ]
    for (const sp of inputs) {
      const once = parseRosterFilters(sp)
      const twice = parseRosterFilters(fromQuery(rosterFiltersToQuery(once)))
      expect(twice).toEqual(once)
      expect(rosterFiltersToQuery(twice)).toBe(rosterFiltersToQuery(once))
    }
  })
})

function fromQuery(query: string): SearchParams {
  const out: SearchParams = {}
  new URLSearchParams(query.replace(/^\?/, '')).forEach((v, k) => {
    out[k] = v
  })
  return out
}

describe('rosterFiltersToQuery', () => {
  it('serialises only set keys and omits page 1', () => {
    expect(rosterFiltersToQuery({ track: 'puzzle_master', page: 1 })).toBe('?track=puzzle_master')
    expect(rosterFiltersToQuery({ page: 1 })).toBe('')
  })
  it('applies overrides and encodes', () => {
    expect(rosterFiltersToQuery({ q: 'a b', page: 1 }, { page: 2 })).toBe('?q=a+b&page=2')
  })
})

describe('rpc args', () => {
  it('maps scope with nulls', () => {
    expect(scopeToRpcArgs({ state: 'Haryana' })).toEqual({
      p_state: 'Haryana',
      p_district: null,
      p_school_id: null,
    })
  })
  it('maps filters with nulls', () => {
    expect(filtersToRpcArgs({ status: 'draft', page: 4 })).toEqual({
      p_track: null,
      p_status: 'draft',
      p_division: null,
      p_language: null,
      p_q: null,
    })
  })
  it('maps the geography-only scope', () => {
    expect(geoScopeToRpcArgs({ state: 'Bihar', district: 'Aurangabad' })).toEqual({
      p_state: 'Bihar',
      p_district: 'Aurangabad',
    })
  })
})

describe('a district without a state', () => {
  it('is dropped, because the SQL raises on it', () => {
    expect(scopeToRpcArgs({ district: 'Aurangabad' })).toEqual({
      p_state: null,
      p_district: null,
      p_school_id: null,
    })
    expect(geoScopeToRpcArgs({ district: 'Aurangabad' })).toEqual({ p_state: null, p_district: null })
    expect(normalizeScope({ district: 'Aurangabad' })).toEqual({})
  })
  it('is still dropped when a school id is present', () => {
    expect(scopeToRpcArgs({ district: 'Aurangabad', schoolId: 's1' })).toEqual({
      p_state: null,
      p_district: null,
      p_school_id: 's1',
    })
  })
  it('is reportable, so a page can say the district was ignored', () => {
    expect(scopeHasOrphanDistrict({ district: 'Aurangabad' })).toBe(true)
    expect(scopeHasOrphanDistrict({ state: 'Bihar', district: 'Aurangabad' })).toBe(false)
    expect(scopeHasOrphanDistrict({ state: 'Bihar' })).toBe(false)
  })
  it('cannot survive parseScope either', () => {
    expect(parseScope({ district: 'Aurangabad', page: '2' })).toEqual({})
    expect(parseScope({ state: ' Bihar ', district: 'Aurangabad', school: 's1' })).toEqual({
      state: 'Bihar',
      district: 'Aurangabad',
      schoolId: 's1',
    })
    expect(parseScope({ state: '   ' })).toEqual({})
  })
})

describe('pageCount', () => {
  it('rounds up and never returns below one', () => {
    expect(pageCount(0, 50)).toBe(1)
    expect(pageCount(51, 50)).toBe(2)
    expect(pageCount(100, 50)).toBe(2)
  })
  it('never returns Infinity or NaN', () => {
    expect(pageCount(10, 0)).toBe(1)
    expect(pageCount(Number.NaN, 50)).toBe(1)
    expect(pageCount(10, -5)).toBe(1)
  })
})
