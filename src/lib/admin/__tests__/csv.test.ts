import { describe, it, expect } from 'vitest'
import { CSV_BOM, csvRow } from '@/lib/admin/csv'

describe('csvRow', () => {
  it('quotes commas, quotes and newlines and ends the line', () => {
    expect(csvRow(['a', 'b,c', 'say "hi"', null, 3, 'x\ny'])).toBe(
      'a,"b,c","say ""hi""",,3,"x\ny"\n'
    )
  })
  it('treats undefined as an empty field and quotes a carriage return', () => {
    expect(csvRow([undefined, 'a\rb'])).toBe(',"a\rb"\n')
  })
  it('writes an empty row for no values', () => {
    expect(csvRow([])).toBe('\n')
  })
  it('leaves ordinary values unquoted', () => {
    expect(csvRow(['Maya Sharma', 0, 'group1'])).toBe('Maya Sharma,0,group1\n')
  })
})

describe('CSV_BOM', () => {
  it('is the UTF-8 byte order mark Excel needs to read Devanagari', () => {
    expect(CSV_BOM.codePointAt(0)).toBe(0xfeff)
  })
})
