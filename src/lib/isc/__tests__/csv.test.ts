import { describe, expect, it } from 'vitest'
import { toCsv } from '../csv'

describe('toCsv', () => {
  it('writes a header row and one line per row', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          ['1', '2'],
          ['3', '4'],
        ]
      )
    ).toBe('a,b\r\n1,2\r\n3,4')
  })

  it('quotes cells containing a comma, a quote or a newline', () => {
    expect(toCsv(['x'], [['Delhi, India']])).toBe('x\r\n"Delhi, India"')
    expect(toCsv(['x'], [['say "hi"']])).toBe('x\r\n"say ""hi"""')
    expect(toCsv(['x'], [['two\nlines']])).toBe('x\r\n"two\nlines"')
  })

  it('renders null and undefined as an empty cell', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,')
  })

  it('renders numbers without quoting them', () => {
    expect(toCsv(['n'], [[42]])).toBe('n\r\n42')
  })

  it('neutralises cells a spreadsheet would run as a formula', () => {
    // Excel and Sheets execute a leading =, +, - or @. A school name is text a
    // stranger typed and must never become a formula.
    expect(toCsv(['x'], [['=SUM(A1:A9)']])).toBe(`x\r\n'=SUM(A1:A9)`)
    expect(toCsv(['x'], [['@import']])).toBe(`x\r\n'@import`)
    expect(toCsv(['x'], [['+1']])).toBe(`x\r\n'+1`)
  })

  it('quotes a neutralised cell that also needs quoting', () => {
    expect(toCsv(['x'], [['=CONCAT(A1,B1)']])).toBe(`x\r\n"'=CONCAT(A1,B1)"`)
  })
})
