import { describe, it, expect } from 'vitest'
import { joinNames, templateReason, templateSummary, templateItems } from '@/lib/recommender/narrative'
import type { ParameterGap, RankedCandidate } from '@/lib/recommender/types'

describe('joinNames', () => {
  it('formats 0, 1, 2, and 3 names', () => {
    expect(joinNames([])).toBe('')
    expect(joinNames(['Fitness'])).toBe('Fitness')
    expect(joinNames(['Fitness', 'EQ'])).toBe('Fitness and EQ')
    expect(joinNames(['Fitness', 'EQ', 'IQ'])).toBe('Fitness, EQ and IQ')
  })
})

const candidate: RankedCandidate = {
  offeringId: 'dance',
  title: 'Dance & Movement',
  type: 'workshop',
  pricePaise: 50000,
  matchScore: 1800,
  parameters: [
    { id: 'fit', name: 'Fitness', points: 50 },
    { id: 'eq', name: 'EQ', points: 20 },
  ],
}

describe('templateReason', () => {
  it('names the top two parameters and the child', () => {
    const reason = templateReason('Maya', candidate)
    expect(reason).toContain('Fitness and EQ')
    expect(reason).toContain('Maya')
  })
})

describe('templateSummary', () => {
  const below: ParameterGap[] = [
    { parameterId: 'fit', name: 'Fitness', displayScore: 10, targetMin: 40, targetMax: 70, status: 'below_target', deficit: 30 },
  ]
  it('mentions the gap areas when there are gaps', () => {
    expect(templateSummary('Maya', below)).toContain('Fitness')
  })
  it('gives an on-track message when there are no gaps', () => {
    expect(templateSummary('Maya', [])).toContain('on track')
  })
})

describe('templateItems', () => {
  it('assigns 1-based ranks and carries match score + parameters', () => {
    const items = templateItems('Maya', [candidate])
    expect(items[0].rank).toBe(1)
    expect(items[0].offering_id).toBe('dance')
    expect(items[0].match_score).toBe(1800)
    expect(items[0].parameters).toHaveLength(2)
  })
})
