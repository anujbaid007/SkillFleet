import { describe, it, expect } from 'vitest'
import { scoreLevelFor } from '@/lib/scoring/score-level'
import type { ScoreLevel } from '@/lib/scoring/types'

// Mirrors supabase/migrations/0002_seed_data.sql score_levels
const LEVELS: ScoreLevel[] = [
  { id: 'l1', name: 'Seed',        min_score: 0,  max_score: 20,  color_class: 'text-accent-yellow', display_order: 1 },
  { id: 'l2', name: 'Sprout',      min_score: 21, max_score: 40,  color_class: 'text-accent-teal',   display_order: 2 },
  { id: 'l3', name: 'Growing',     min_score: 41, max_score: 60,  color_class: 'text-primary',        display_order: 3 },
  { id: 'l4', name: 'Thriving',    min_score: 61, max_score: 80,  color_class: 'text-accent-purple',  display_order: 4 },
  { id: 'l5', name: 'Flourishing', min_score: 81, max_score: 100, color_class: 'text-accent-pink',    display_order: 5 },
]

describe('scoreLevelFor', () => {
  it('returns Seed for score 0 (min boundary)', () =>
    expect(scoreLevelFor(0, LEVELS)?.name).toBe('Seed'))

  it('returns Seed for score 20 (max boundary of Seed)', () =>
    expect(scoreLevelFor(20, LEVELS)?.name).toBe('Seed'))

  it('returns Sprout for score 21 (min boundary of Sprout)', () =>
    expect(scoreLevelFor(21, LEVELS)?.name).toBe('Sprout'))

  it('returns Sprout for score 40', () =>
    expect(scoreLevelFor(40, LEVELS)?.name).toBe('Sprout'))

  it('returns Growing for score 50', () =>
    expect(scoreLevelFor(50, LEVELS)?.name).toBe('Growing'))

  it('returns Thriving for score 61', () =>
    expect(scoreLevelFor(61, LEVELS)?.name).toBe('Thriving'))

  it('returns Thriving for score 80', () =>
    expect(scoreLevelFor(80, LEVELS)?.name).toBe('Thriving'))

  it('returns Flourishing for score 81', () =>
    expect(scoreLevelFor(81, LEVELS)?.name).toBe('Flourishing'))

  it('returns Flourishing for score 100 (max boundary)', () =>
    expect(scoreLevelFor(100, LEVELS)?.name).toBe('Flourishing'))

  it('returns the color_class along with the level', () =>
    expect(scoreLevelFor(50, LEVELS)?.color_class).toBe('text-primary'))

  it('returns null when score is below all levels', () =>
    expect(scoreLevelFor(-1, LEVELS)).toBeNull())

  it('returns null when score is above all levels', () =>
    expect(scoreLevelFor(101, LEVELS)).toBeNull())

  it('returns null for an empty levels array', () =>
    expect(scoreLevelFor(50, [])).toBeNull())
})
