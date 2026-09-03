import { describe, expect, it } from 'vitest'
import { catalogViewFor } from '../catalog-view'

describe('catalogViewFor', () => {
  it('shows everything when no status is chosen', () => {
    expect(catalogViewFor(undefined)).toBe('everything')
    expect(catalogViewFor('')).toBe('everything')
  })

  it('keeps old "all" links meaning everything', () => {
    expect(catalogViewFor('all')).toBe('everything')
  })

  it('narrows to bookable only when asked', () => {
    expect(catalogViewFor('bookable')).toBe('bookable')
  })

  it('passes the planned and completed views through', () => {
    expect(catalogViewFor('planned')).toBe('planned')
    expect(catalogViewFor('completed')).toBe('completed')
  })

  it('treats an unknown value as everything rather than an empty page', () => {
    expect(catalogViewFor('garbage')).toBe('everything')
  })
})
