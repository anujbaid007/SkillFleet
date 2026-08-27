import { describe, it, expect } from 'vitest'
import { classifyFallback, coerceIntent, MAX_PLAN_SIZE } from '@/lib/chat/intent'

describe('classifyFallback', () => {
  it('reads plan requests with a size', () => {
    expect(classifyFallback('plan the whole year, 12 activities')).toEqual({ kind: 'plan', count: 12 })
    expect(classifyFallback('build a year plan')).toEqual({ kind: 'plan', count: 6 })
  })

  it('caps plan size at the cart limit', () => {
    expect(classifyFallback('plan 500 activities')).toEqual({ kind: 'plan', count: MAX_PLAN_SIZE })
  })

  it('reads suggestion requests', () => {
    expect(classifyFallback('what should Maya do next?')).toMatchObject({ kind: 'suggest' })
    expect(classifyFallback('suggest 3 things')).toEqual({ kind: 'suggest', count: 3 })
  })

  it('reads searches by type and price', () => {
    expect(classifyFallback('show me workshops')).toMatchObject({ kind: 'search', type: 'workshop' })
    expect(classifyFallback('anything under 500')).toMatchObject({ kind: 'search', maxPricePaise: 50000 })
    expect(classifyFallback('trips below ₹1,200')).toMatchObject({
      kind: 'search',
      type: 'trip',
      maxPricePaise: 120000,
    })
  })

  it('reads "add" by ordinal, number and all', () => {
    expect(classifyFallback('add the second one')).toEqual({ kind: 'add', refs: [2], all: false })
    expect(classifyFallback('add all of them')).toEqual({ kind: 'add', refs: [], all: true })
    expect(classifyFallback('add number 3')).toEqual({ kind: 'add', refs: [3], all: false })
    expect(classifyFallback('add 1')).toEqual({ kind: 'add', refs: [1], all: false })
  })

  it('reads removal requests and keeps them distinct from add', () => {
    expect(classifyFallback('remove the second one')).toEqual({ kind: 'unshortlist', refs: [2], all: false })
    expect(classifyFallback('unshortlist all')).toEqual({ kind: 'unshortlist', refs: [], all: true })
    expect(classifyFallback('drop number 3')).toEqual({ kind: 'unshortlist', refs: [3], all: false })
  })

  it('asks for clarification when removal has no target', () => {
    expect(classifyFallback('remove something')).toEqual({ kind: 'help' })
  })

  it('does not mistake a price filter for an item number', () => {
    // "add" + a price should not resolve to "add item #500"
    const intent = classifyFallback('add workshops under 500')
    expect(intent.kind).not.toBe('add')
  })

  it('falls back to help when unclear', () => {
    expect(classifyFallback('hello there')).toEqual({ kind: 'help' })
    expect(classifyFallback('')).toEqual({ kind: 'help' })
  })
})

describe('coerceIntent', () => {
  it('accepts well-formed model output', () => {
    expect(coerceIntent({ kind: 'plan', count: 8, childName: 'Maya' }, 'x')).toEqual({
      kind: 'plan',
      count: 8,
      childName: 'Maya',
    })
  })

  it('clamps a silly count from the model', () => {
    expect(coerceIntent({ kind: 'plan', count: 9999 }, 'x')).toMatchObject({ count: MAX_PLAN_SIZE })
  })

  it('rejects an unknown offering type', () => {
    expect(coerceIntent({ kind: 'search', type: 'seminar' }, 'x')).toMatchObject({ type: undefined })
  })

  it('drops an "add" with no references rather than guessing', () => {
    expect(coerceIntent({ kind: 'add', refs: [], all: false }, 'hello').kind).toBe('help')
  })

  it('de-duplicates and sanitises refs', () => {
    expect(coerceIntent({ kind: 'add', refs: [2, 2, -1, 'x', 3] }, 'x')).toEqual({
      kind: 'add',
      refs: [2, 3],
      all: false,
    })
  })

  it('keeps unshortlist distinct from add', () => {
    expect(coerceIntent({ kind: 'unshortlist', refs: [1, 2] }, 'x')).toEqual({
      kind: 'unshortlist',
      refs: [1, 2],
      all: false,
    })
  })

  it('falls back to keywords for junk input', () => {
    expect(coerceIntent(null, 'plan 12 activities')).toEqual({ kind: 'plan', count: 12 })
    expect(coerceIntent({ kind: 'nonsense' }, 'show me trips')).toMatchObject({ kind: 'search', type: 'trip' })
  })
})
