import { describe, expect, it } from 'vitest'
import { ISC_TRACKS, TRACK_FIELDS, trackBySlug, trackById } from '../tracks'
import { isEligibleClass, validateUrl, validateSubmission, isTrackLocked } from '../validate'

describe('tracks', () => {
  it('exposes exactly the three enterable tracks', () => {
    expect(ISC_TRACKS.map((t) => t.id)).toEqual([
      'ai_for_impact',
      'entrepreneurship',
      'content_creator',
    ])
  })

  it('caps every team at three, the leader included', () => {
    for (const t of ISC_TRACKS) expect(t.maxTeamSize).toBe(3)
  })

  it('resolves a track by slug and by id, and refuses Puzzle Master', () => {
    expect(trackBySlug('ai-for-impact')?.id).toBe('ai_for_impact')
    expect(trackById('content_creator')?.slug).toBe('content-creator')
    expect(trackBySlug('puzzle-master')).toBeNull()
    expect(trackBySlug('nonsense')).toBeNull()
  })

  it('defines fields for every track', () => {
    for (const t of ISC_TRACKS) expect(TRACK_FIELDS[t.id].length).toBeGreaterThan(0)
  })
})

describe('isEligibleClass', () => {
  it('accepts Classes 5 to 12', () => {
    for (const c of ['Class 5', 'Class 8', 'Class 12']) {
      expect(isEligibleClass(c)).toBe(true)
    }
  })

  it('rejects Kindergarten through Class 4', () => {
    for (const c of ['Kindergarten', 'Class 1', 'Class 4']) {
      expect(isEligibleClass(c)).toBe(false)
    }
  })

  it('rejects a missing or unknown class', () => {
    expect(isEligibleClass(null)).toBe(false)
    expect(isEligibleClass(undefined)).toBe(false)
    expect(isEligibleClass('Year 9')).toBe(false)
  })
})

describe('validateUrl', () => {
  it('accepts http and https', () => {
    expect(validateUrl('https://youtu.be/abc')).toBeNull()
    expect(validateUrl('http://example.com/a')).toBeNull()
  })

  it('rejects empty, malformed and non-web schemes', () => {
    expect(validateUrl('')).not.toBeNull()
    expect(validateUrl('not a url')).not.toBeNull()
    expect(validateUrl('javascript:alert(1)')).not.toBeNull()
    expect(validateUrl('ftp://example.com')).not.toBeNull()
  })
})

describe('validateSubmission', () => {
  const goodAi = {
    app_url: 'https://myapp.example.com',
    demo_video_url: 'https://youtu.be/abc',
    explanation: 'x'.repeat(150),
    // Every track now also asks which language the entry is in.
    language: 'English',
  }

  it('accepts a complete AI for Impact submission', () => {
    expect(validateSubmission('ai_for_impact', goodAi)).toBeNull()
  })

  it('names the first missing field', () => {
    const { app_url: _omitted, ...rest } = goodAi
    expect(validateSubmission('ai_for_impact', rest)).toMatch(/app/i)
  })

  it('rejects text below the minimum length', () => {
    expect(validateSubmission('ai_for_impact', { ...goodAi, explanation: 'too short' })).toMatch(
      /explanation|problem/i
    )
  })

  it('rejects text above the maximum length', () => {
    expect(
      validateSubmission('ai_for_impact', { ...goodAi, explanation: 'x'.repeat(5000) })
    ).toMatch(/problem|explanation/i)
  })

  it('rejects a bad URL inside a submission', () => {
    expect(validateSubmission('ai_for_impact', { ...goodAi, app_url: 'nope' })).toMatch(/app/i)
  })

  it('validates the entrepreneurship and content creator shapes too', () => {
    expect(validateSubmission('entrepreneurship', {})).not.toBeNull()
    expect(
      validateSubmission('content_creator', {
        video_url: 'https://youtu.be/abc',
        title: 'My entry',
        theme_note: 'y'.repeat(80),
        language: 'Hindi',
      })
    ).toBeNull()
  })
})

describe('isTrackLocked', () => {
  const deadline = '2026-12-31T18:29:59Z'

  it('is open before the deadline', () => {
    expect(isTrackLocked(deadline, new Date('2026-10-01T00:00:00Z'))).toBe(false)
  })

  it('is locked after the deadline', () => {
    expect(isTrackLocked(deadline, new Date('2027-01-02T00:00:00Z'))).toBe(true)
  })

  it('treats a missing deadline as locked rather than open', () => {
    expect(isTrackLocked('', new Date('2026-10-01T00:00:00Z'))).toBe(true)
  })
})
