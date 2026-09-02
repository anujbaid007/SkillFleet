import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TRACK_FIELDS, type IscTrackId } from '@/lib/isc/tracks'

/**
 * The database now refuses to submit an entry with a required field missing
 * (docs/isc-submit-validation.sql). Its list of fields per track is written by
 * hand in SQL, so nothing would stop it drifting from TRACK_FIELDS the next
 * time a field is added — except this test, which reads the SQL and checks.
 *
 * It parses the CASE arms rather than the whole file, so an unrelated edit to
 * the function cannot break it, and a real drift cannot slip past it.
 */
const SQL = readFileSync(join(process.cwd(), 'docs/isc-submit-validation.sql'), 'utf8')

function arrayFor(fn: 'isc_required_fields' | 'isc_link_fields', track: string): string[] {
  const body = SQL.slice(SQL.indexOf(`FUNCTION public.${fn}(`))
  const arm = body.match(new RegExp(`WHEN '${track}'\\s+THEN ARRAY\\[([^\\]]*)\\]`))
  if (!arm) throw new Error(`no CASE arm for ${track} in ${fn}`)
  return arm[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, ''))
    .filter(Boolean)
}

const TRACKS = Object.keys(TRACK_FIELDS) as IscTrackId[]

describe('isc-submit-validation.sql stays in step with TRACK_FIELDS', () => {
  for (const track of TRACKS) {
    it(`${track}: every app field is required by the database`, () => {
      const app = TRACK_FIELDS[track].map((f) => f.key).sort()
      const db = arrayFor('isc_required_fields', track).sort()
      expect(db).toEqual(app)
    })

    it(`${track}: the database checks exactly the app's link fields for http(s)`, () => {
      const app = TRACK_FIELDS[track]
        .filter((f) => f.kind === 'url')
        .map((f) => f.key)
        .sort()
      const db = arrayFor('isc_link_fields', track).sort()
      expect(db).toEqual(app)
    })
  }

  it('the submit function actually calls the check', () => {
    const submit = SQL.slice(SQL.indexOf('FUNCTION public.isc_submit_entry('))
    expect(submit).toContain('isc_first_incomplete_field(v_track, v_sub)')
    expect(submit).toContain("'incomplete_submission'")
  })
})
