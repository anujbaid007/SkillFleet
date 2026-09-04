import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readFileSync } from 'node:fs'
import { seed } from './seed.mjs'

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : dflt }
const scale = { students: arg('students', 2000), schools: arg('schools', 40), entries: arg('entries', 8000) }

const db = new PGlite({ extensions: { pg_trgm } })
const t0 = Date.now()
await db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
await seed(db, scale)
await db.exec(readFileSync(new URL('../../docs/admin-scale-migration.sql', import.meta.url), 'utf8'))
const seedMs = Date.now() - t0
console.log(`seeded ${scale.students} students, ${scale.schools} schools, ${scale.entries} entries in ${seedMs} ms`)

// ANALYZE is not optional. Without column statistics the planner falls back to a
// default selectivity that FAVOURS index scans, so a plan can pass here and still
// sequential-scan on Supabase, where real statistics exist — a false pass, in the
// dangerous direction. Every plan asserted below is planned from real statistics.
const tAnalyze = Date.now()
await db.exec('analyze')
console.log(`analyzed every table in ${Date.now() - tAnalyze} ms - plans below use real statistics`)

const failures = []
const timings = []
export async function check(name, fn) {
  const t = Date.now()
  try { await fn() } catch (e) { failures.push(`${name}: ${e.message}`) }
  timings.push([name, Date.now() - t])
}
export function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`)
}
// Pass the UNDERLYING TABLE QUERY here, never a call to one of the admin
// functions. `explain select * from admin_isc_roster(...)` only ever prints
// "Function Scan on admin_isc_roster" — Postgres does not expand a plpgsql
// body into the plan — so asserting on a function call passes vacuously and
// proves nothing about index use. Give it the `select ... from isc_entries
// where ...` that the function runs internally instead.
export async function assertIndexScan(sql, params, forbiddenTable) {
  const { rows } = await db.query(`explain ${sql}`, params)
  const plan = rows.map((r) => Object.values(r)[0]).join('\n')
  // Refuse to report success on a plan that never mentions the table at all: a
  // typo in the table name, or a query that does not touch it, would otherwise
  // make this assertion silently vacuous.
  if (!new RegExp(`\\b${forbiddenTable}\\b`).test(plan)) throw new Error(`cannot judge ${forbiddenTable}: the plan never mentions it (misspelled table, or the query does not read it?):\n${plan}`)
  if (new RegExp(`Seq Scan on ${forbiddenTable}\\b`).test(plan)) throw new Error(`sequential scan on ${forbiddenTable}:\n${plan}`)
}
export { db }

const CHECKS = []

// --- checks are appended below by later tasks ---
//
// HOW TO ADD A CHECK (read this before editing this file):
//   Append your `CHECKS.push(...)` calls in the space below, IMMEDIATELY ABOVE
//   the RUNNER block at the bottom of the file. The runner iterates CHECKS, so
//   anything pushed after it never runs. Never move, duplicate or wrap the
//   runner block, and never add code below it.
//
//   CHECKS.push(() => check('admin_isc_roster: page 1', async () => {
//     const { rows } = await db.query('select * from admin_isc_roster($1)', [50])
//     assertEqual(rows.length, 50, 'page size')
//   }))

// ---------------------------------------------------------------------------
// Task 2 — section A (indexes) and section B (division column, trigger, backfill)
// ---------------------------------------------------------------------------

const MIGRATION_SQL = readFileSync(new URL('../../docs/admin-scale-migration.sql', import.meta.url), 'utf8')

const EXPECTED_INDEXES = [
  'certificate_uploads_status_idx',
  'isc_entries_created_idx', 'isc_entries_division_idx', 'isc_entries_language_idx',
  'isc_entries_school_idx', 'isc_entries_status_idx', 'isc_entries_submitted_idx',
  'isc_entries_track_idx',
  'isc_entry_members_entry_idx', 'isc_entry_members_user_idx',
  'schools_coord_status_idx', 'schools_geo_idx', 'schools_name_trgm', 'schools_review_idx',
  'user_profiles_class_idx', 'user_profiles_created_idx', 'user_profiles_geo_idx',
  'user_profiles_name_trgm', 'user_profiles_phone_idx', 'user_profiles_role_idx',
  'user_profiles_school_idx',
]

CHECKS.push(() => check('section A: every index exists', async () => {
  const { rows } = await db.query(
    `select indexname from pg_indexes where schemaname = 'public' and indexname = any($1) order by 1`,
    [EXPECTED_INDEXES])
  const found = rows.map((r) => r.indexname)
  const missing = EXPECTED_INDEXES.filter((n) => !found.includes(n))
  assertEqual(missing, [], 'indexes missing from the migration')
}))

CHECKS.push(() => check('section A: indexes are actually used', async () => {
  // Raw table queries on purpose — EXPLAIN of an admin function only ever shows
  // "Function Scan" and would prove nothing. A Bitmap Heap Scan counts as a pass;
  // only a plain Seq Scan on the named table fails.
  const { rows: [e] } = await db.query(`select school_id, created_by from isc_entries order by id limit 1`)
  await assertIndexScan('select id from isc_entries where school_id = $1', [e.school_id], 'isc_entries')
  await assertIndexScan('select id from isc_entry_members where user_id = $1', [e.created_by], 'isc_entry_members')
  await assertIndexScan('select id from user_profiles where school_id = $1', [e.school_id], 'user_profiles')
  await assertIndexScan("select id from isc_entries where division = 'group2'", [], 'isc_entries')
}))

CHECKS.push(() => check('isc_division_for_class maps every class', async () => {
  const { rows } = await db.query(`
    select c, isc_division_for_class(c) d from unnest(array[
      'Class 3','Class 4','Class 5','Class 6','Class 7','Class 8',
      'Class 9','Class 10','Class 11','Class 12','', 'Class 13', null]) c`)
  const got = Object.fromEntries(rows.map((r) => [r.c === null ? 'null' : r.c, r.d]))
  assertEqual(got, {
    'Class 3': null, 'Class 4': null,
    'Class 5': 'group1', 'Class 6': 'group1', 'Class 7': 'group1', 'Class 8': 'group1',
    'Class 9': 'group2', 'Class 10': 'group2', 'Class 11': 'group2', 'Class 12': 'group2',
    '': null, 'Class 13': null, 'null': null,
  }, 'class -> division')
}))

CHECKS.push(() => check('division backfill', async () => {
  const { rows: [n] } = await db.query(`select
      count(*)::int total,
      count(*) filter (where e.division is distinct from isc_division_for_class(p.school_class))::int wrong,
      count(*) filter (where e.division = 'group1')::int g1,
      count(*) filter (where e.division = 'group2')::int g2,
      count(*) filter (where e.division is null)::int unknown
    from isc_entries e join user_profiles p on p.id = e.created_by`)
  const { rows: [{ entries }] } = await db.query(`select count(*)::int entries from isc_entries`)
  // Guard against a vacuous pass: `wrong = 0` proves nothing if the join is empty.
  assertEqual(n.total, entries, 'every entry joins to its leader profile')
  assertEqual(n.wrong, 0, 'every entry carries its leader division')
  // ...and prove all three outcomes are actually present, so a function that
  // always returned one of them could not pass this check either.
  if (!(n.g1 > 0 && n.g2 > 0 && n.unknown > 0))
    throw new Error(`backfill is not exercising every branch: group1=${n.g1} group2=${n.g2} unknown=${n.unknown}`)
}))

CHECKS.push(() => check('division trigger', async () => {
  const cases = [['Class 10', 'group2'], ['Class 6', 'group1'], ['Class 3', null]]
  const inserted = []
  for (const [cls, want] of cases) {
    const { rows: [s] } = await db.query(
      `select id, school_id from user_profiles where school_class = $1 order by id limit 1`, [cls])
    if (!s) throw new Error(`no seeded student in ${cls}`)
    const { rows: [r] } = await db.query(
      `insert into isc_entries (track, school_id, created_by) values ('ai_for_impact', $1, $2)
       returning id, division`, [s.school_id, s.id])
    inserted.push(r.id)
    assertEqual(r.division, want, `trigger division for ${cls}`)
  }
  // An explicit division must survive the trigger untouched.
  const { rows: [s] } = await db.query(
    `select id, school_id from user_profiles where school_class = 'Class 3' order by id limit 1`)
  const { rows: [r] } = await db.query(
    `insert into isc_entries (track, school_id, created_by, division) values ('puzzle_master', $1, $2, 'group2')
     returning id, division`, [s.school_id, s.id])
  inserted.push(r.id)
  assertEqual(r.division, 'group2', 'an explicit division is not overwritten')
  // Leave the seeded data exactly as the later checks expect to find it.
  await db.query(`delete from isc_entries where id = any($1)`, [inserted])
}))

CHECKS.push(() => check('migration is safe to run twice', async () => {
  await db.exec(MIGRATION_SQL)
  const { rows: [n] } = await db.query(`select
      count(*) filter (where e.division is distinct from isc_division_for_class(p.school_class))::int wrong
    from isc_entries e join user_profiles p on p.id = e.created_by`)
  assertEqual(n.wrong, 0, 'divisions still correct after a second apply')
  const { rows } = await db.query(
    `select indexname from pg_indexes where schemaname = 'public' and indexname = any($1)`, [EXPECTED_INDEXES])
  assertEqual(rows.length, EXPECTED_INDEXES.length, 'indexes survive a second apply')
  const { rows: [t] } = await db.query(
    `select count(*)::int n from pg_trigger where tgname = 'isc_entries_division_trg' and not tgisinternal`)
  assertEqual(t.n, 1, 'exactly one division trigger after a second apply')
}))

// ============================================================================
// RUNNER — KEEP THIS BLOCK LAST IN THE FILE. Add new checks above, not below.
// ============================================================================
for (const c of CHECKS) await c()

console.table(timings.map(([name, ms]) => ({ name, ms })))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log('all admin-scale checks passed')
