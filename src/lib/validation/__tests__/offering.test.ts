import { describe, it, expect } from 'vitest'
import { validateOffering } from '@/lib/validation/offering'

const base = {
  title: 'Test Workshop',
  type: 'workshop',
  price_rupees: '999',
  min_age: '8',
  max_age: '14',
}

describe('validateOffering', () => {
  it('returns no errors for valid data', () => {
    expect(validateOffering(base)).toEqual({})
  })

  it('requires title', () => {
    const errors = validateOffering({ ...base, title: '   ' })
    expect(errors.title).toBeTruthy()
  })

  it('requires valid type', () => {
    const errors = validateOffering({ ...base, type: 'seminar' })
    expect(errors.type).toBeTruthy()
  })

  it('rejects negative price', () => {
    const errors = validateOffering({ ...base, price_rupees: '-100' })
    expect(errors.price).toBeTruthy()
  })

  it('rejects min_age > max_age', () => {
    const errors = validateOffering({ ...base, min_age: '15', max_age: '10' })
    expect(errors.age_range).toBeTruthy()
  })
})
