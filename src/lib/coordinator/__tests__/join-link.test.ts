import { describe, expect, it } from 'vitest'
import {
  schoolSlug,
  joinCode,
  joinPath,
  parseJoinSlug,
  idRangeForCode,
} from '@/lib/coordinator/join-link'

// Every name below is a real one from the schools table.
describe('schoolSlug', () => {
  it('drops the descriptive tail from a long name', () => {
    expect(schoolSlug('Shree Swaminarayan Vidyaveli Gyan Kendra English Medium School')).toBe(
      'swaminarayan-vidyaveli'
    )
  })

  // "Public" identifies the school; dropping it would leave just "delhi".
  it('keeps load-bearing words', () => {
    expect(schoolSlug('D K Public School')).toBe('d-k-public')
    expect(schoolSlug('Mothers Public School')).toBe('mothers-public')
    expect(schoolSlug('Vanasthali International School')).toBe('vanasthali-international')
    expect(schoolSlug('New Ideal Convent School')).toBe('new-ideal-convent')
    expect(schoolSlug('Ram Mehar Vidyalaya')).toBe('ram-mehar-vidyalaya')
  })

  it('strips punctuation', () => {
    expect(schoolSlug('St. Johns School')).toBe('st-johns')
    expect(schoolSlug('St. Xaviers School')).toBe('st-xaviers')
  })

  it('never ends mid-word or on a hyphen', () => {
    // Fills the 24-character budget exactly, then stops rather than cutting
    // 'road' in half.
    const slug = schoolSlug('Seth M R Jaipuria School Kanpur Road Campus')
    expect(slug).toBe('seth-m-r-jaipuria-kanpur')
    expect(slug.length).toBe(24)
    expect(slug).not.toMatch(/-$/)
  })

  it('stays within the length cap', () => {
    const long = schoolSlug(
      'Kendriya Vidyalaya Sangathan Regional Office Ahmedabad Number Two Campus'
    )
    expect(long.length).toBeLessThanOrEqual(24)
    expect(long).not.toMatch(/-$/)
  })

  it('falls back rather than returning nothing', () => {
    // Every word is filler.
    expect(schoolSlug('The English Medium School')).toBe('the-english-medium')
    // No usable letters at all.
    expect(schoolSlug('!!!')).toBe('school')
    expect(schoolSlug('')).toBe('school')
  })

  it('keeps a single-word name intact', () => {
    expect(schoolSlug('Kunskapsskolan Lucknow')).toBe('kunskapsskolan-lucknow')
  })
})

describe('joinCode', () => {
  it('takes six hex characters from the id', () => {
    expect(joinCode('4218493c-7d86-4ab7-97ca-47a80654faeb')).toBe('421849')
  })

  it('is stable and lowercase', () => {
    expect(joinCode('4218493C-7D86-4AB7-97CA-47A80654FAEB')).toBe('421849')
  })
})

describe('joinPath', () => {
  it('reads as a name, not an id', () => {
    expect(
      joinPath(
        '4218493c-7d86-4ab7-97ca-47a80654faeb',
        'Shree Swaminarayan Vidyaveli Gyan Kendra English Medium School'
      )
    ).toBe('/join/swaminarayan-vidyaveli-421849')
  })

  it('is far shorter than the raw id it replaces', () => {
    const path = joinPath('4218493c-7d86-4ab7-97ca-47a80654faeb', 'St. Johns School')
    expect(path).toBe('/join/st-johns-421849')
    expect(path.length).toBeLessThan('/join/4218493c-7d86-4ab7-97ca-47a80654faeb'.length)
  })
})

describe('parseJoinSlug', () => {
  it('reads the readable form', () => {
    expect(parseJoinSlug('swaminarayan-vidyaveli-421849')).toEqual({
      slug: 'swaminarayan-vidyaveli',
      code: '421849',
    })
  })

  // Links already sent to a WhatsApp group cannot be recalled.
  it('still accepts an original bare-uuid link', () => {
    expect(parseJoinSlug('4218493c-7d86-4ab7-97ca-47a80654faeb')).toEqual({
      schoolId: '4218493c-7d86-4ab7-97ca-47a80654faeb',
    })
  })

  it('handles a single-word slug', () => {
    expect(parseJoinSlug('vanasthali-421849')).toEqual({ slug: 'vanasthali', code: '421849' })
  })

  it('returns nothing usable for junk', () => {
    expect(parseJoinSlug('no-code-here')).toEqual({})
    expect(parseJoinSlug('')).toEqual({})
  })
})

describe('idRangeForCode', () => {
  it('brackets every uuid with that prefix', () => {
    const { low, high } = idRangeForCode('421849')
    expect(low).toBe('42184900-0000-0000-0000-000000000000')
    expect(high).toBe('421849ff-ffff-ffff-ffff-ffffffffffff')
    // The real school sits inside the range.
    expect('4218493c-7d86-4ab7-97ca-47a80654faeb' > low).toBe(true)
    expect('4218493c-7d86-4ab7-97ca-47a80654faeb' < high).toBe(true)
  })
})
