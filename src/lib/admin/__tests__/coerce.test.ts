import { describe, it, expect } from 'vitest'
import { field, toNullableText, toNumber, toText } from '@/lib/admin/coerce'

describe('toNumber', () => {
  it('reads a plain number', () => {
    expect(toNumber(42)).toBe(42)
  })
  it('reads a bigint, which is how a count past 2^53 arrives', () => {
    expect(toNumber(BigInt(9007199254740993))).toBe(9007199254740992)
    expect(toNumber(BigInt(123))).toBe(123)
  })
  it('reads a string, which is how numeric and some drivers send bigint', () => {
    expect(toNumber('123')).toBe(123)
    expect(toNumber(' 8000 ')).toBe(8000)
    expect(toNumber('1.39')).toBeCloseTo(1.39)
  })
  it('never returns NaN or Infinity', () => {
    for (const v of [null, undefined, '', '   ', 'abc', {}, [], true, Number.NaN, Infinity]) {
      expect(toNumber(v)).toBe(0)
    }
  })
  it('takes a fallback', () => {
    expect(toNumber(undefined, -1)).toBe(-1)
  })
})

describe('toText', () => {
  it('passes strings through and stringifies numbers', () => {
    expect(toText('draft')).toBe('draft')
    expect(toText(3)).toBe('3')
  })
  it('falls back rather than printing null', () => {
    expect(toText(null)).toBe('')
    expect(toText(undefined, 'unknown')).toBe('unknown')
  })
})

describe('toNullableText', () => {
  it('keeps null null rather than inventing an empty string', () => {
    expect(toNullableText(null)).toBeNull()
    expect(toNullableText(undefined)).toBeNull()
    expect(toNullableText('')).toBe('')
    expect(toNullableText('group1')).toBe('group1')
  })
})

describe('field', () => {
  it('reads a property off an unknown row and tolerates a non-object', () => {
    expect(field({ a: 1 }, 'a')).toBe(1)
    expect(field(null, 'a')).toBeUndefined()
    expect(field('nope', 'a')).toBeUndefined()
  })
})
