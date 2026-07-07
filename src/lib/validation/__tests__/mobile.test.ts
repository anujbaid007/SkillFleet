import { describe, it, expect } from 'vitest'
import { validateMobile } from '@/lib/validation/mobile'

describe('validateMobile', () => {
  it('accepts a valid 10-digit number starting 6–9', () =>
    expect(validateMobile('9876543210')).toBeNull())

  it('accepts a number with spaces and strips them', () =>
    expect(validateMobile('98765 43210')).toBeNull())

  it('rejects empty', () => expect(validateMobile('')).toMatch(/required/i))

  it('rejects fewer than 10 digits', () =>
    expect(validateMobile('98765')).toMatch(/10 digits/i))

  it('rejects more than 10 digits', () =>
    expect(validateMobile('98765432101')).toMatch(/10 digits/i))

  it('rejects numbers starting below 6', () =>
    expect(validateMobile('1234567890')).toMatch(/valid/i))

  it('rejects letters', () =>
    expect(validateMobile('98765abcde')).toMatch(/10 digits|valid/i))
})
