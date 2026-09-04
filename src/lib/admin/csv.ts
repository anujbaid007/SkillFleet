/*
  RFC 4180 rows for the admin exports.

  Quoting rule: a field is quoted only when it has to be -- it contains a
  comma, a double quote, a CR or an LF -- and an embedded quote is doubled.
  null and undefined are the empty field, not the text "null".

  Deliberately NOT done here: prefixing values that begin with = + - @ to
  defuse spreadsheet formula injection. This export carries Indian phone
  numbers, and "+919876543210" is a phone number, not a formula; mangling every
  one of them to protect a founder opening their own export is the wrong trade.
  If this file ever feeds a CSV sent to a third party, revisit that.
*/

/** Excel needs this to read a UTF-8 file as UTF-8; Devanagari names depend on it. */
export const CSV_BOM = '\uFEFF'

export function csvRow(values: (string | number | null | undefined)[]): string {
  return (
    values
      .map((v) => {
        if (v === null || v === undefined) return ''
        const s = String(v)
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      })
      .join(',') + '\n'
  )
}
