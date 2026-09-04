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
  // ctid changes on any UPDATE, so comparing it across a re-apply proves the
  // backfill rewrote nothing. Entries whose leader is outside Classes 5-12 keep
  // division null forever and match `division is null` on every single run, so
  // without the extra predicate in the backfill these rows are rewritten every
  // time the founder re-pastes the script.
  const nulls = `select id, ctid::text ct from isc_entries where division is null order by id limit 100`
  const { rows: before } = await db.query(nulls)
  if (!before.length) throw new Error('no null-division entries, so this cannot detect a re-running backfill')
  await db.exec(MIGRATION_SQL)
  const { rows: after } = await db.query(nulls)
  assertEqual(after, before, 'the backfill rewrote rows it can never change')
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

// ---------------------------------------------------------------------------
// Task 3 — section C (admin_isc_summary, admin_isc_breakdown, admin_isc_timeline)
// ---------------------------------------------------------------------------

// p_days wide enough to actually cover the seeded entries. The brief's
// `admin_isc_timeline(null,null,null,7)` returns seven all-zero rows against this
// seed (entries are dated 2026-08-01..28), so asserting only `rows.length === 7`
// passes without the function ever having counted anything.
const timelineDays = async () => {
  const { rows: [r] } = await db.query(
    `select greatest((current_date - min(created_at)::date) + 1, 1)::int d from isc_entries`)
  return r.d
}

CHECKS.push(() => check('admin_isc_summary national', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_isc_summary() v`)
  // Reference written from the other direction: no CTEs, no shared subexpressions.
  const { rows: [ref] } = await db.query(`select
    (select count(*)::int from user_profiles where role='student' and isc_division_for_class(school_class) is not null) eligible,
    (select count(distinct user_id)::int from isc_entry_members where user_id is not null and (is_leader or accepted_at is not null)) started,
    (select count(distinct m.user_id)::int from isc_entry_members m join isc_entries e on e.id = m.entry_id
      where m.user_id is not null and (m.is_leader or m.accepted_at is not null) and e.status = 'submitted') submitted,
    (select count(distinct school_id)::int from isc_entries) schools_with_entries,
    (select count(*)::int from isc_entries) entries`)
  assertEqual(v.eligible, ref.eligible, 'eligible')
  assertEqual(v.started, ref.started, 'started')
  assertEqual(v.submitted, ref.submitted, 'submitted')
  assertEqual(v.schools_with_entries, ref.schools_with_entries, 'schools_with_entries')
  if (!Array.isArray(v.by_track) || v.by_track.length !== 4) throw new Error('by_track should list four tracks')
  // by_division / by_status / by_language count ENTRIES, so each must total the
  // entry count exactly. by_track counts STUDENTS and deliberately does not.
  for (const k of ['by_division', 'by_status', 'by_language']) {
    const sum = v[k].reduce((a, r) => a + r.count, 0)
    assertEqual(sum, ref.entries, `${k} totals every entry exactly once`)
  }
  const trackSum = v.by_track.reduce((a, r) => a + r.count, 0)
  if (!(trackSum >= v.started)) throw new Error(`by_track (students per track, ${trackSum}) cannot be below started (${v.started})`)
  // by_track must be DISTINCT students per track, keyed on the ENTRY's track (the
  // denormalised isc_entry_members.track is not authoritative). Without this a
  // per_track CTE that forgot to deduplicate counts a student once per entry.
  const { rows: refTrack } = await db.query(`select e.track, count(distinct m.user_id)::int c
    from isc_entry_members m join isc_entries e on e.id = m.entry_id
    where m.user_id is not null and (m.is_leader or m.accepted_at is not null)
    group by e.track order by c desc, e.track`)
  assertEqual(v.by_track, refTrack.map((r) => ({ key: r.track, count: r.c })), 'by_track')
  for (const k of ['by_track', 'by_division', 'by_status', 'by_language'])
    for (const r of v[k]) {
      if (typeof r.key !== 'string' || typeof r.count !== 'number')
        throw new Error(`${k} items must be {key: string, count: number}, got ${JSON.stringify(r)}`)
    }
}))

CHECKS.push(() => check('admin_isc_summary school scope', async () => {
  const { rows: [s] } = await db.query(`select id from schools order by id limit 1`)
  const { rows: [{ v }] } = await db.query(`select admin_isc_summary(null, null, $1) v`, [s.id])
  const { rows: [ref] } = await db.query(`select
    (select count(*)::int from user_profiles where role='student' and school_id=$1 and isc_division_for_class(school_class) is not null) eligible,
    (select count(distinct m.user_id)::int from isc_entry_members m join isc_entries e on e.id = m.entry_id
      where e.school_id=$1 and m.user_id is not null and (m.is_leader or m.accepted_at is not null)) started,
    (select count(distinct m.user_id)::int from isc_entry_members m join isc_entries e on e.id = m.entry_id
      where e.school_id=$1 and m.user_id is not null and (m.is_leader or m.accepted_at is not null) and e.status='submitted') submitted,
    (select count(*)::int from isc_entries where school_id=$1) entries`, [s.id])
  assertEqual(v.eligible, ref.eligible, 'eligible in one school')
  assertEqual(v.started, ref.started, 'started in one school')
  assertEqual(v.submitted, ref.submitted, 'submitted in one school')
  assertEqual(v.schools_with_entries, 1, 'one school in scope')
  assertEqual(v.by_status.reduce((a, r) => a + r.count, 0), ref.entries, 'by_status totals the school entries')
  if (!(ref.eligible > 0 && ref.started > 0 && ref.entries > 0))
    throw new Error(`school scope is empty, so this check proves nothing: ${JSON.stringify(ref)}`)
}))

CHECKS.push(() => check('admin_isc_summary empty scope', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_isc_summary($1) v`, ['Nowhereland'])
  assertEqual([v.eligible, v.started, v.submitted, v.schools_with_entries], [0, 0, 0, 0], 'zeros for an unknown state')
  assertEqual([v.by_track, v.by_division, v.by_status, v.by_language], [[], [], [], []], 'empty lists, never null')
}))

CHECKS.push(() => check('admin_isc_breakdown levels', async () => {
  const nat = await db.query(`select * from admin_isc_breakdown()`)
  if (nat.rows.length < 2) throw new Error('national breakdown should list states')
  const st = await db.query(`select * from admin_isc_breakdown($1)`, [nat.rows[0].key])
  if (!st.rows.length) throw new Error(`no districts under the top state ${nat.rows[0].key}`)
  const di = await db.query(`select * from admin_isc_breakdown($1, $2)`, [nat.rows[0].key, st.rows[0].key])
  if (!di.rows.length || !di.rows[0].label) throw new Error('district breakdown should list schools by name')
  const sumEligible = nat.rows.reduce((a, r) => a + Number(r.eligible), 0)
  const { rows: [ref] } = await db.query(`select count(*)::int n from user_profiles where role='student' and isc_division_for_class(school_class) is not null and school_state is not null`)
  assertEqual(sumEligible, ref.n, 'state eligible sums to national')
  // The state list must be exactly the states that have eligible students or entries.
  const { rows: refStates } = await db.query(`select k from (
      select distinct school_state k from user_profiles where role='student' and isc_division_for_class(school_class) is not null and school_state is not null
      union select distinct s.state from isc_entries e join schools s on s.id = e.school_id) t order by 1`)
  assertEqual(nat.rows.map((r) => r.key).sort(), refStates.map((r) => r.k).sort(), 'the state list')
  // Every district row must sum back to its state row, and every school row to its district row.
  const stateRow = nat.rows[0]
  assertEqual(st.rows.reduce((a, r) => a + Number(r.eligible), 0), Number(stateRow.eligible), 'district eligible sums to the state')
  assertEqual(st.rows.reduce((a, r) => a + Number(r.schools), 0), Number(stateRow.schools), 'district schools sum to the state')
  const distRow = st.rows[0]
  assertEqual(di.rows.reduce((a, r) => a + Number(r.eligible), 0), Number(distRow.eligible), 'school eligible sums to the district')
  // `started` is scoped by the ENTRY's school but `eligible` by the STUDENT's own
  // school, so a team-mate from a neighbouring state is counted in the entry's
  // state. Summing started across states can therefore only ever be >= national.
  const { rows: [{ v }] } = await db.query(`select admin_isc_summary() v`)
  const sumStarted = nat.rows.reduce((a, r) => a + Number(r.started), 0)
  if (sumStarted < v.started) throw new Error(`state started (${sumStarted}) fell below national started (${v.started})`)
}))

CHECKS.push(() => check('admin_isc_breakdown agrees with admin_isc_summary', async () => {
  // Two independently written implementations of the same numbers must agree at
  // every level. This is the strongest check in the file: breakdown groups in one
  // pass with FILTER, summary re-scopes and recounts per call.
  const nat = await db.query(`select * from admin_isc_breakdown()`)
  for (const r of nat.rows) {
    const { rows: [{ v }] } = await db.query(`select admin_isc_summary($1) v`, [r.key])
    assertEqual([v.eligible, v.started, v.submitted, v.schools_with_entries],
      [Number(r.eligible), Number(r.started), Number(r.submitted), Number(r.schools)], `state ${r.key}`)
  }
  const st = await db.query(`select * from admin_isc_breakdown($1)`, [nat.rows[0].key])
  for (const r of st.rows) {
    const { rows: [{ v }] } = await db.query(`select admin_isc_summary($1, $2) v`, [nat.rows[0].key, r.key])
    assertEqual([v.eligible, v.started, v.submitted, v.schools_with_entries],
      [Number(r.eligible), Number(r.started), Number(r.submitted), Number(r.schools)], `district ${r.key}`)
  }
  const di = await db.query(`select * from admin_isc_breakdown($1, $2)`, [nat.rows[0].key, st.rows[0].key])
  for (const r of di.rows) {
    const { rows: [{ v }] } = await db.query(`select admin_isc_summary(null, null, $1::uuid) v`, [r.key])
    assertEqual([v.eligible, v.started, v.submitted],
      [Number(r.eligible), Number(r.started), Number(r.submitted)], `school ${r.label}`)
  }
}))

CHECKS.push(() => check('admin_isc_timeline', async () => {
  const days = await timelineDays()
  const { rows } = await db.query(`select * from admin_isc_timeline(null, null, null, $1)`, [days])
  assertEqual(rows.length, days, 'one row per day')
  const { rows: ref } = await db.query(`select g.d as day, coalesce(c.n, 0)::int as started, coalesce(s.n, 0)::int as submitted
    from (select (current_date - i)::date d from generate_series(0, $1::int - 1) i) g
    left join (select created_at::date d, count(*) n from isc_entries group by 1) c on c.d = g.d
    left join (select submitted_at::date d, count(*) n from isc_entries where submitted_at is not null group by 1) s on s.d = g.d
    order by 1`, [days])
  assertEqual(rows.map((r) => [String(r.day), Number(r.started), Number(r.submitted)]),
    ref.map((r) => [String(r.day), Number(r.started), Number(r.submitted)]), 'every day matches an independent reference')
  const total = rows.reduce((a, r) => a + Number(r.started), 0)
  if (total === 0) throw new Error('the timeline window covered no entries at all, so this check proves nothing')
  const { rows: [e] } = await db.query(`select count(*)::int n from isc_entries where created_at >= current_date - ($1::int - 1)`, [days])
  assertEqual(total, e.n, 'the timeline accounts for every entry in the window')
  // Scoping must narrow it, and must agree with a plain join to schools.
  const { rows: [st] } = await db.query(`select state from schools order by id limit 1`)
  const { rows: scoped } = await db.query(`select * from admin_isc_timeline($1, null, null, $2)`, [st.state, days])
  const { rows: [sref] } = await db.query(
    `select count(*)::int n from isc_entries e join schools s on s.id = e.school_id
     where s.state = $1 and e.created_at >= current_date - ($2::int - 1)`, [st.state, days])
  assertEqual(scoped.reduce((a, r) => a + Number(r.started), 0), sref.n, `timeline scoped to ${st.state}`)
  if (!(sref.n > 0 && sref.n < e.n)) throw new Error(`state scope did not narrow the timeline: ${sref.n} of ${e.n}`)
}))

CHECKS.push(() => check('ISC summaries on a hand-computed fixture', async () => {
  // A tiny world whose every number was worked out by hand, inserted inside a
  // transaction and rolled back. The seeded data cannot exercise these cases: at
  // the default scale every student already leads four entries, so `started`
  // saturates and dropping the accepted_at filter entirely would not change it.
  const U = (n) => `f0f00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const ZS = U(1), YS = U(2), WS = U(3), VS = U(4), ZS2 = U(5)  // schools
  const L1 = U(11), A1 = U(12), P1 = U(13), N1 = U(14), X1 = U(15), O1 = U(16)  // students
  const E1 = U(21), E2 = U(22), E3 = U(23), E4 = U(24), E5 = U(25), E6 = U(26)  // entries
  await db.exec('begin')
  try {
    await db.query(`insert into schools (id, name, state, district) values
      ($1,'Zed School','Zedland','Zedland District 1'),
      ($2,'Yed School','Yedland','Yedland District 1'),
      ($3,'Wed School','Wedland','Wedland District 1'),
      ($4,'Ved School','Vedland','Vedland District 1'),
      ($5,'Zed School Two','Zedland','Zedland District 1')`, [ZS, YS, WS, VS, ZS2])
    await db.query(`insert into user_profiles (id, role, full_name, school_class, school_state, school_district, school_id) values
      ($1,'student','Leader',      'Class 10','Zedland','Zedland District 1',$7),
      ($2,'student','Accepted',    'Class 6', 'Zedland','Zedland District 1',$7),
      ($3,'student','Pending',     'Class 7', 'Zedland','Zedland District 1',$7),
      ($4,'student','Never played','Class 9', 'Zedland','Zedland District 1',$7),
      ($5,'student','Too young',   'Class 3', 'Zedland','Zedland District 1',$7),
      ($6,'student','Outsider',    'Class 11','Yedland','Yedland District 1',$8)`,
      [L1, A1, P1, N1, X1, O1, ZS, YS])
    await db.query(`insert into isc_entries (id, track, school_id, created_by, status, submission, submitted_at, created_at) values
      ($1,'ai_for_impact',  $5,$7,'submitted','{"language":"Hindi"}',   current_date - 2, current_date - 2),
      ($2,'entrepreneurship',$5,$7,'draft',    '{}',                     null,             current_date - 1),
      ($3,'ai_for_impact',  $5,$8,'draft',    '{"language":"English"}', null,             current_date - 1),
      ($4,'content_creator',$6,$7,'draft',    '{"language":"English"}', null,             current_date - 1),
      ($9,'ai_for_impact',  $5,$7,'draft',    '{"language":"Hindi"}',   null,             current_date - 1),
      ($10,'puzzle_master', $11,$7,'draft',   '{"language":"English"}', null,             current_date - 1)`,
      [E1, E2, E3, E4, ZS, WS, L1, X1, E5, E6, VS])
    // E3's member row carries track 'puzzle_master' while E3 itself is
    // 'ai_for_impact'. isc_entry_members.track is a denormalised copy that can
    // drift; the entry's own track is the authoritative one, and by_track must
    // read that. Everywhere else the two agree, so nothing else can catch this.
    await db.query(`insert into isc_entry_members (entry_id, track, user_id, is_leader, accepted_at) values
      ($1,'ai_for_impact',  $5,true, current_date - 2),
      ($1,'ai_for_impact',  $6,false,current_date - 2),
      ($1,'ai_for_impact',  $7,false,null),
      ($2,'entrepreneurship',$5,true, current_date - 1),
      ($2,'entrepreneurship',$8,false,current_date - 1),
      ($3,'puzzle_master',  $9,true, current_date - 1),
      ($4,'content_creator',$5,true, current_date - 1),
      ($10,'ai_for_impact', $5,true, current_date - 1)`,
      [E1, E2, E3, E4, L1, A1, P1, O1, X1, E5])

    // The trigger must have derived a division from each leader's class.
    const { rows: div } = await db.query(`select id, division from isc_entries where id = any($1) order by id`, [[E1, E2, E3, E4, E5, E6]])
    assertEqual(div.map((r) => r.division), ['group2', 'group2', null, 'group2', 'group2', 'group2'], 'fixture divisions from the trigger')

    const zed = (await db.query(`select admin_isc_summary($1) v`, ['Zedland'])).rows[0].v
    // eligible: L1, A1, P1, N1 are Classes 10/6/7/9 in Zedland. X1 is Class 3 (no
    //   division). O1 is eligible but lives in Yedland.
    // started: L1 (leader), A1 (accepted), O1 (accepted, from Yedland, on a Zedland
    //   entry), X1 (leader of E3). NOT P1 — invited, never accepted. L1 leads two
    //   Zedland entries and is still counted once.
    // submitted: only E1 is submitted, so L1 and A1. Not P1.
    assertEqual([zed.eligible, zed.started, zed.submitted, zed.schools_with_entries], [4, 4, 2, 1], 'Zedland headline')
    // ai_for_impact has FOUR accepted member rows in Zedland (L1 on E1 and on E5,
    // A1 on E1, X1 on E3) but only THREE distinct students. by_track counts people.
    assertEqual(zed.by_track, [{ key: 'ai_for_impact', count: 3 }, { key: 'entrepreneurship', count: 2 }], 'Zedland by_track (students)')
    assertEqual(zed.by_division, [{ key: 'group2', count: 3 }, { key: 'unknown', count: 1 }], 'Zedland by_division (entries)')
    assertEqual(zed.by_status, [{ key: 'draft', count: 3 }, { key: 'submitted', count: 1 }], 'Zedland by_status (entries)')
    assertEqual(zed.by_language, [{ key: 'Hindi', count: 2 }, { key: 'English', count: 1 }, { key: 'unknown', count: 1 }], 'Zedland by_language (entries)')

    const byDistrict = (await db.query(`select admin_isc_summary($1, $2) v`, ['Zedland', 'Zedland District 1'])).rows[0].v
    assertEqual([byDistrict.eligible, byDistrict.started, byDistrict.submitted], [4, 4, 2], 'Zedland district scope')
    const bySchool = (await db.query(`select admin_isc_summary(null, null, $1) v`, [ZS])).rows[0].v
    assertEqual([bySchool.eligible, bySchool.started, bySchool.submitted], [4, 4, 2], 'Zed School scope')

    const nat = (await db.query(`select * from admin_isc_breakdown()`)).rows
    const row = (k) => nat.find((r) => r.key === k)
    assertEqual(row('Zedland') && [Number(row('Zedland').eligible), Number(row('Zedland').started), Number(row('Zedland').submitted), Number(row('Zedland').schools)],
      [4, 4, 2, 1], 'Zedland breakdown row')
    // Yedland has an eligible student but no entries -> the eligible-only side of the full join.
    assertEqual(row('Yedland') && [Number(row('Yedland').eligible), Number(row('Yedland').started), Number(row('Yedland').schools)],
      [1, 0, 0], 'Yedland: eligible students, no entries')
    // Wedland has an entry but nobody living there -> the entries-only side of the full join.
    assertEqual(row('Wedland') && [Number(row('Wedland').eligible), Number(row('Wedland').started), Number(row('Wedland').schools)],
      [0, 1, 1], 'Wedland: an entry, no resident students')
    // Vedland's only entry has no member rows at all. The school still counts as
    // a school with an entry, and nobody has started -- the counts come from two
    // different aggregates, so this is the one case that can drift apart.
    assertEqual(row('Vedland') && [Number(row('Vedland').eligible), Number(row('Vedland').started), Number(row('Vedland').submitted), Number(row('Vedland').schools)],
      [0, 0, 0, 1], 'Vedland: an entry with no members')
    const vedDistricts = (await db.query(`select * from admin_isc_breakdown($1)`, ['Vedland'])).rows
    assertEqual(vedDistricts.map((r) => [r.key, Number(r.eligible), Number(r.started), Number(r.schools)]),
      [['Vedland District 1', 0, 0, 1]], 'Vedland districts')
    const vedSchools = (await db.query(`select * from admin_isc_breakdown($1, $2)`, ['Vedland', 'Vedland District 1'])).rows
    assertEqual(vedSchools.map((r) => [r.key, r.label, Number(r.eligible), Number(r.started), Number(r.schools)]),
      [[VS, 'Ved School', 0, 0, 1]], 'Vedland schools')
    const ved = (await db.query(`select admin_isc_summary($1) v`, ['Vedland'])).rows[0].v
    assertEqual([ved.eligible, ved.started, ved.submitted, ved.schools_with_entries], [0, 0, 0, 1], 'Vedland summary')
    assertEqual(ved.by_track, [], 'Vedland by_track is empty: an entry with nobody on it')
    assertEqual(ved.by_status, [{ key: 'draft', count: 1 }], 'Vedland by_status still sees the entry')

    const zedDistricts = (await db.query(`select * from admin_isc_breakdown($1)`, ['Zedland'])).rows
    assertEqual(zedDistricts.map((r) => [r.key, Number(r.eligible), Number(r.started), Number(r.submitted), Number(r.schools)]),
      [['Zedland District 1', 4, 4, 2, 1]], 'Zedland districts')
    // Zed School Two has no students and no entries. It must still be listed --
    // an admin needs to see the schools that have not started -- with schools = 0,
    // because `schools` means "does this row have an entry", not "is this a row".
    const zedSchools = (await db.query(`select * from admin_isc_breakdown($1, $2)`, ['Zedland', 'Zedland District 1'])).rows
    assertEqual(zedSchools.map((r) => [r.key, r.label, Number(r.eligible), Number(r.started), Number(r.submitted), Number(r.schools)]),
      [[ZS, 'Zed School', 4, 4, 2, 1], [ZS2, 'Zed School Two', 0, 0, 0, 0]], 'Zedland schools')

    const tl = (await db.query(`select * from admin_isc_timeline($1, null, null, 5)`, ['Zedland'])).rows
    assertEqual(tl.map((r) => [Number(r.started), Number(r.submitted)]), [[0, 0], [0, 0], [1, 1], [3, 0], [0, 0]], 'Zedland timeline, oldest day first')
    const tlSchool = (await db.query(`select * from admin_isc_timeline(null, null, $1, 5)`, [ZS])).rows
    assertEqual(tlSchool.map((r) => Number(r.started)), [0, 0, 1, 3, 0], 'Zed School timeline')
  } finally {
    await db.exec('rollback')
  }
  const { rows: [left] } = await db.query(`select count(*)::int n from schools where state in ('Zedland','Yedland','Wedland','Vedland')`)
  assertEqual(left.n, 0, 'the fixture was rolled back')
}))

CHECKS.push(() => check('a district without a state is refused', async () => {
  // admin_isc_breakdown used to IGNORE p_district when p_state was null and
  // return the national state rows, while admin_isc_summary honoured it. One
  // scope object passed to both rendered a district headline over a national
  // table with nothing erroring. District names also repeat across states, so
  // the district-only answer was itself a merge of two states.
  const { rows: [d] } = await db.query(`select school_district d from user_profiles where school_district is not null order by id limit 1`)
  for (const sql of ['select admin_isc_summary(null, $1)', 'select * from admin_isc_breakdown(null, $1)',
                     'select * from admin_isc_timeline(null, $1)']) {
    let raised = null
    try { await db.query(sql, [d.d]) } catch (e) { raised = e.message }
    if (!raised || !/p_district was given without p_state/.test(raised))
      throw new Error(`${sql} must refuse a district with no state, got: ${raised}`)
  }
  // The same district WITH its state still works, so the guard is not just a wall.
  const { rows: [st] } = await db.query(`select school_state s from user_profiles where school_district = $1 order by id limit 1`, [d.d])
  const { rows: [{ v }] } = await db.query(`select admin_isc_summary($1, $2) v`, [st.s, d.d])
  if (!(v.eligible > 0)) throw new Error(`state + district should still answer, got ${JSON.stringify(v)}`)
  assertEqual((await db.query(`select * from admin_isc_breakdown($1, $2)`, [st.s, d.d])).rows.length > 0, true, 'state + district breakdown still answers')
  assertEqual((await db.query(`select * from admin_isc_timeline($1, $2, null, 7)`, [st.s, d.d])).rows.length, 7, 'state + district timeline still answers')
}))

CHECKS.push(() => check('section C functions are admin only', async () => {
  await db.exec(`create or replace function is_admin() returns boolean language sql as $x$ select false $x$`)
  try {
    for (const sql of ['select admin_isc_summary()', 'select * from admin_isc_breakdown()', 'select * from admin_isc_timeline()']) {
      let raised = null
      try { await db.query(sql) } catch (e) { raised = e.message }
      assertEqual(raised, 'admin only', `${sql} must refuse a non-admin`)
    }
  } finally {
    await db.exec(`create or replace function is_admin() returns boolean language sql as $x$ select true $x$`)
  }
}))

// Bare function calls, nothing else in the timing, so the numbers below are the
// numbers the founder's admin page will wait for.
CHECKS.push(() => check('TIMING admin_isc_summary() national', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_isc_summary() v`)
  if (!v || v.eligible === undefined) throw new Error('no summary')
}))
CHECKS.push(() => check('TIMING admin_isc_breakdown() national', async () => {
  const { rows } = await db.query(`select * from admin_isc_breakdown()`)
  if (!rows.length) throw new Error('no breakdown rows')
}))
CHECKS.push(() => check('TIMING admin_isc_timeline() 30 days', async () => {
  const { rows } = await db.query(`select * from admin_isc_timeline()`)
  assertEqual(rows.length, 30, 'default window is 30 days')
}))

// ============================================================================
// RUNNER — KEEP THIS BLOCK LAST IN THE FILE. Add new checks above, not below.
// ============================================================================
for (const c of CHECKS) await c()

console.table(timings.map(([name, ms]) => ({ name, ms })))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log('all admin-scale checks passed')
