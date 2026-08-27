import { describe, it, expect } from 'vitest'
import { filterSchools } from '@/lib/schools/search'

const schools = [
  { name: 'Govt Boys Sr Sec School', address: 'Hari Nagar Ashram, New Delhi' },
  { name: 'Govt Boys Sr Sec School', address: 'Jangpura, New Delhi' },
  { name: 'DAV Public School', address: 'Pandara Road, New Delhi' },
  { name: 'St. Xaviers School', address: 'Civil Lines, New Delhi' },
]

describe('filterSchools', () => {
  it('returns everything for an empty query', () =>
    expect(filterSchools(schools, '')).toHaveLength(4))

  it('ignores surrounding whitespace', () =>
    expect(filterSchools(schools, '   ')).toHaveLength(4))

  it('matches case-insensitively', () =>
    expect(filterSchools(schools, 'dav')).toHaveLength(1))

  it('matches a term from the middle of the name', () =>
    expect(filterSchools(schools, 'sec school')).toHaveLength(2))

  it('matches multiple terms in any order', () =>
    expect(filterSchools(schools, 'boys govt')).toHaveLength(2))

  it('matches on the address, which is what separates duplicate names', () => {
    const found = filterSchools(schools, 'jangpura')
    expect(found).toHaveLength(1)
    expect(found[0].address).toContain('Jangpura')
  })

  it('combines a name term and an address term', () =>
    expect(filterSchools(schools, 'govt jangpura')).toHaveLength(1))

  it('returns nothing when a term matches no school', () =>
    expect(filterSchools(schools, 'govt nowhere')).toHaveLength(0))

  it('tolerates a null address', () =>
    expect(
      filterSchools([{ name: 'Some School', address: null }], 'some')
    ).toHaveLength(1))

  it('caps results at the limit', () =>
    expect(filterSchools(schools, '', 2)).toHaveLength(2))
})
