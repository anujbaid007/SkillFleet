import { describe, expect, it } from 'vitest'
import { ISC_TRACKS, PUZZLE_MASTER, LANGUAGE_OPTIONS, ISC_SEASON } from '../tracks'
import { validateSubmission } from '../validate'

const completeAi = {
  app_url: 'https://myapp.example.com',
  demo_video_url: 'https://youtu.be/abc',
  explanation: 'x'.repeat(150),
  language: 'English',
}

describe('language', () => {
  it('offers exactly English and Hindi', () => {
    expect(LANGUAGE_OPTIONS).toEqual(['English', 'Hindi'])
  })

  it('accepts a submission that names a language', () => {
    expect(validateSubmission('ai_for_impact', completeAi)).toBeNull()
    expect(validateSubmission('ai_for_impact', { ...completeAi, language: 'Hindi' })).toBeNull()
  })

  it('rejects a submission with no language', () => {
    const { language: _omitted, ...rest } = completeAi
    expect(validateSubmission('ai_for_impact', rest)).toMatch(/language/i)
  })

  it('rejects a language that is not offered', () => {
    expect(validateSubmission('ai_for_impact', { ...completeAi, language: 'French' })).toMatch(
      /language/i
    )
  })

  it('requires a language on every track, not just AI for Impact', () => {
    expect(
      validateSubmission('content_creator', {
        video_url: 'https://youtu.be/abc',
        title: 'My entry',
        theme_note: 'y'.repeat(80),
      })
    ).toMatch(/language/i)
  })
})

describe('track identity', () => {
  it('gives every track an icon, gradient, tint and accent', () => {
    for (const t of ISC_TRACKS) {
      expect(t.icon).toBeDefined()
      expect(t.gradient).toMatch(/^from-/)
      expect(t.tint).toMatch(/^from-/)
      expect(t.accent).toMatch(/^text-/)
    }
  })

  it('gives every track a prize line and something to prepare', () => {
    for (const t of ISC_TRACKS) {
      expect(t.prize.length).toBeGreaterThan(10)
      expect(t.prepare.length).toBeGreaterThan(0)
    }
  })

  it('gives Puzzle Master the same visual identity so its card matches', () => {
    expect(PUZZLE_MASTER.icon).toBeDefined()
    expect(PUZZLE_MASTER.gradient).toMatch(/^from-/)
    expect(PUZZLE_MASTER.divisions).toMatch(/5.*8/)
  })

  it('names the season once', () => {
    expect(ISC_SEASON).toBe('2026')
  })
})
