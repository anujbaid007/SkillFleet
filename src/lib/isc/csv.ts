/** Cells a spreadsheet would evaluate rather than display. */
const FORMULA_START = /^[=+\-@]/

/**
 * One CSV cell.
 *
 * A leading =, +, - or @ is prefixed with an apostrophe: Excel and Sheets
 * execute those, and a school name is text a stranger typed. The apostrophe is
 * the standard neutraliser and is not shown as part of the value.
 */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  if (/["\r\n,]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/**
 * Rows as CSV, CRLF-delimited because that is what Excel expects on Windows.
 * No trailing newline: a blank final line reads as an empty record.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))]
  return lines.join('\r\n')
}
