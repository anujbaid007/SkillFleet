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

// ---------------------------------------------------------------------------
// Task 4 — section D (admin_isc_roster, admin_isc_export_chunk, admin_isc_cold_schools)
// ---------------------------------------------------------------------------

// The ordering key of both the roster and the export is (created_at desc, id desc).
// Rendered as a comparable tuple so a walk can be asserted strictly descending:
// that, and not "the pages did not overlap this time", is what proves the sort is
// a TOTAL order. isc_entries.created_at has ~285 rows per distinct value at the
// default scale, so without the `id` tie-break the rows inside a tie group come
// back in whatever order the sort happened to produce and a page boundary landing
// inside one drops rows from the walk.
const rosterKey = (r) => [new Date(r.created_at).getTime(), r.id]
const keyBefore = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])  // a sorts strictly before b
// The smallest school that still holds enough entries to page through: small
// enough to walk end to end at 200k/1000/800k, big enough that a walk crosses
// several page boundaries. Not "school 0" -- the seeder gives school 0 the
// fewest students, which at `--schools 200` is only 12 entries. Memoised: the
// group-by scans every entry.
let _smallSchool = null
const smallSchool = async () => {
  if (_smallSchool) return _smallSchool
  const { rows } = await db.query(`with c as (
      select e.school_id id, count(*)::int n from isc_entries e
      join schools s on s.id = e.school_id group by 1)
    (select id, n from c where n >= 30 order by n, id limit 1)
    union all (select id, n from c order by n desc, id limit 1)`)
  if (!rows.length) throw new Error('no school has any entries')
  const pick = rows[0]
  if (pick.n < 8) throw new Error(`the biggest school has only ${pick.n} entries, too few to page through`)
  _smallSchool = { id: pick.id, n: pick.n }
  return _smallSchool
}

CHECKS.push(() => check('admin_isc_roster pages are lossless and totally ordered', async () => {
  const school = await smallSchool()
  const size = Math.max(2, Math.ceil(school.n / 9))
  const seen = [], keys = []
  let page = 1
  for (; page <= 40; page++) {
    const { rows } = await db.query(
      `select * from admin_isc_roster(p_school_id => $1, p_page => $2, p_size => $3)`, [school.id, page, size])
    if (!rows.length) break
    if (page * size <= school.n && rows.length !== size)
      throw new Error(`page ${page} of ${size} came back with ${rows.length} rows`)
    for (const r of rows) { seen.push(r.id); keys.push(rosterKey(r)) }
    for (const r of rows) assertEqual(Number(r.total), school.n, `total on page ${page}`)
  }
  if (page > 40) throw new Error('paging did not terminate')
  // Nothing repeated, nothing skipped: the walk is exactly the reference set.
  assertEqual(new Set(seen).size, seen.length, 'no entry appeared on two pages')
  assertEqual(seen.length, school.n, 'the walk covered every entry')
  const { rows: ref } = await db.query(`select id from isc_entries where school_id = $1 order by id`, [school.id])
  assertEqual([...seen].sort(), ref.map((r) => r.id).sort(), 'the walk is exactly the entries of that school')
  // Strictly descending on (created_at, id) across page boundaries.
  for (let i = 1; i < keys.length; i++)
    if (!keyBefore(keys[i - 1], keys[i]))
      throw new Error(`rows ${i - 1} and ${i} are not in strict (created_at desc, id desc) order: ${JSON.stringify(keys[i - 1])} then ${JSON.stringify(keys[i])}`)
  // ...and the check above only means something if the key actually ties.
  const distinctDays = new Set(keys.map((k) => k[0])).size
  if (!(distinctDays < keys.length))
    throw new Error(`no created_at ties in ${keys.length} rows, so the tie-break was never exercised`)
  // One page past the end is empty, not a repeat of the last page.
  const { rows: past } = await db.query(
    `select * from admin_isc_roster(p_school_id => $1, p_page => $2, p_size => $3)`, [school.id, page + 2, size])
  assertEqual(past.length, 0, 'a page past the end is empty')
}))

CHECKS.push(() => check('admin_isc_roster: every filter filters', async () => {
  const total = async (sql, params = []) => {
    const { rows } = await db.query(sql, params)
    return rows.length ? Number(rows[0].total) : 0
  }
  const ref = async (where, params = []) => {
    const { rows: [r] } = await db.query(`select count(*)::int n from isc_entries e
      join schools s on s.id = e.school_id
      left join user_profiles p on p.id = e.created_by where ${where}`, params)
    return r.n
  }
  const all = await total(`select * from admin_isc_roster(p_size => 1)`)
  assertEqual(all, await ref('true'), 'unfiltered total')
  const cases = [
    ['p_track => $1', ['ai_for_impact'], `e.track = $1`],
    ['p_status => $1', ['submitted'], `e.status = $1`],
    ['p_division => $1', ['group1'], `e.division = $1`],
    // The language filter reads a JSON key, not a column.
    ['p_language => $1', ['Hindi'], `e.submission->>'language' = $1`],
    ['p_q => $1', ['school 1'], `(lower(coalesce(p.full_name, '')) like '%' || lower($1) || '%' or lower(s.name) like '%' || lower($1) || '%')`],
    ['p_state => $1', ['Haryana'], `s.state = $1`],
  ]
  for (const [arg, params, where] of cases) {
    const got = await total(`select * from admin_isc_roster(${arg}, p_size => 1)`, params)
    const want = await ref(where, params)
    assertEqual(got, want, `filter ${arg} = ${params[0]}`)
    if (!(want > 0 && want < all)) throw new Error(`filter ${arg} = ${params[0]} matched ${want} of ${all}, so it proves nothing`)
  }
  // Filters AND together rather than replacing one another.
  const both = await total(`select * from admin_isc_roster(p_track => $1, p_status => $2, p_size => 1)`, ['ai_for_impact', 'submitted'])
  assertEqual(both, await ref(`e.track = $1 and e.status = $2`, ['ai_for_impact', 'submitted']), 'track AND status')
  if (!(both < await ref(`e.track = $1`, ['ai_for_impact']))) throw new Error('adding a status filter did not narrow the track filter')
  // A page really only contains rows that match.
  const { rows } = await db.query(`select * from admin_isc_roster(p_track => 'puzzle_master', p_status => 'draft', p_language => 'Hindi', p_size => 50)`)
  if (!rows.length) throw new Error('nothing matched, so the page contents prove nothing')
  for (const r of rows)
    if (r.track !== 'puzzle_master' || r.status !== 'draft' || r.language !== 'Hindi')
      throw new Error(`a filtered page returned ${JSON.stringify({ t: r.track, s: r.status, l: r.language })}`)
  // A filter that matches nothing returns nothing (and therefore no total at all).
  assertEqual((await db.query(`select * from admin_isc_roster(p_track => 'no_such_track')`)).rows.length, 0, 'an impossible filter returns no rows')
  // p_school_id overrides p_state, matching sections C and D everywhere else.
  const { rows: [sc] } = await db.query(`select id, state from schools order by id limit 1`)
  const scoped = await total(`select * from admin_isc_roster(p_state => 'Nowhereland', p_school_id => $1, p_size => 1)`, [sc.id])
  assertEqual(scoped, await ref(`e.school_id = $1`, [sc.id]), 'p_school_id wins over p_state')
}))

CHECKS.push(() => check('admin_isc_roster: caps, edges and row contents', async () => {
  const n = async (sql, params = []) => (await db.query(sql, params)).rows.length
  assertEqual(await n(`select * from admin_isc_roster(p_size => 5000)`), 200, 'p_size is capped at 200')
  assertEqual(await n(`select * from admin_isc_roster(p_size => 0)`), 1, 'p_size 0 becomes 1')
  assertEqual(await n(`select * from admin_isc_roster(p_size => -7)`), 1, 'a negative p_size becomes 1')
  const first = await db.query(`select * from admin_isc_roster(p_page => 1, p_size => 3)`)
  for (const p of [0, -5, null]) {
    const { rows } = await db.query(`select * from admin_isc_roster(p_page => $1::int, p_size => 3)`, [p])
    assertEqual(rows.map((r) => r.id), first.rows.map((r) => r.id), `page ${p} is page 1`)
  }
  // (p_page - 1) * p_size overflows a 32-bit int well before this; it must be an
  // empty page, not "integer out of range".
  assertEqual(await n(`select * from admin_isc_roster(p_page => 2000000000, p_size => 200)`), 0, 'an absurd page number is empty, not an error')
  // A district with no state is refused, as everywhere else that takes a scope.
  let raised = null
  try { await db.query(`select * from admin_isc_roster(p_district => 'Haryana District 0')`) } catch (e) { raised = e.message }
  if (!raised || !/p_district was given without p_state/.test(raised)) throw new Error(`district without state: ${raised}`)
  // Row contents against the tables they came from. Sampled from ONE SCHOOL, not
  // from the national first page: the newest seeded day holds only odd-numbered
  // entries, which the seeder never gives a second member, so a national page 1
  // is all member_count = 1 and would never exercise the subquery.
  const school = await smallSchool()
  const { rows } = await db.query(`select * from admin_isc_roster(p_school_id => $1, p_size => 200)`, [school.id])
  for (const r of rows) {
    const { rows: [ref] } = await db.query(`select e.track, e.status, e.division, e.submission->>'language' lang,
        e.school_id, s.name school_name, e.created_by, p.full_name, e.created_at, e.submitted_at,
        (select count(*)::int from isc_entry_members m where m.entry_id = e.id and (m.is_leader or m.accepted_at is not null)) mc
      from isc_entries e join schools s on s.id = e.school_id
      left join user_profiles p on p.id = e.created_by where e.id = $1`, [r.id])
    assertEqual([r.track, r.status, r.division, r.language, r.school_id, r.school_name, r.leader_id, r.leader_name,
                 Number(r.member_count), String(r.created_at), String(r.submitted_at)],
      [ref.track, ref.status, ref.division, ref.lang, ref.school_id, ref.school_name, ref.created_by, ref.full_name,
       ref.mc, String(ref.created_at), String(ref.submitted_at)], `row ${r.id}`)
  }
  if (!rows.some((r) => Number(r.member_count) > 1)) throw new Error('no team entries in the sample, so member_count proves nothing')
  if (!rows.some((r) => Number(r.member_count) === 1)) throw new Error('every sampled entry is a team, so member_count proves nothing')
  if (!rows.some((r) => r.submitted_at === null) || !rows.some((r) => r.submitted_at !== null))
    throw new Error('the sample has no mix of submitted and draft entries')
}))

CHECKS.push(() => check('admin_isc_export_chunk walks the whole set exactly once', async () => {
  const school = await smallSchool()
  const size = Math.max(2, Math.ceil(school.n / 7))
  const seen = [], keys = []
  let after = [null, null], chunks = 0
  for (; chunks <= 40; chunks++) {
    const { rows } = await db.query(
      `select * from admin_isc_export_chunk(p_school_id => $1, p_after_created => $2::timestamptz, p_after_id => $3::uuid, p_size => $4)`,
      [school.id, after[0], after[1], size])
    if (!rows.length) break
    for (const r of rows) { seen.push(r.id); keys.push(rosterKey(r)) }
    const last = rows[rows.length - 1]
    after = [last.created_at, last.id]
    if (rows.length < size) { chunks++; break }
  }
  if (chunks > 40) throw new Error('the keyset walk did not terminate')
  assertEqual(new Set(seen).size, seen.length, 'no entry came back in two chunks')
  assertEqual(seen.length, school.n, 'the walk covered every entry exactly once')
  const { rows: ref } = await db.query(`select id from isc_entries where school_id = $1 order by id`, [school.id])
  assertEqual([...seen].sort(), ref.map((r) => r.id).sort(), 'the walk is exactly the entries of that school')
  for (let i = 1; i < keys.length; i++)
    if (!keyBefore(keys[i - 1], keys[i]))
      throw new Error(`chunk rows ${i - 1} and ${i} are out of order: ${JSON.stringify(keys[i - 1])} then ${JSON.stringify(keys[i])}`)
  if (!(new Set(keys.map((k) => k[0])).size < keys.length))
    throw new Error('no created_at ties in the walk, so the cursor tie-break was never exercised')
  // The export and the roster are the same rows in the same order.
  const { rows: rosterRows } = await db.query(
    `select * from admin_isc_roster(p_school_id => $1, p_page => 1, p_size => 200)`, [school.id])
  assertEqual(seen.slice(0, rosterRows.length), rosterRows.map((r) => r.id), 'the export order matches the roster order')
}))

CHECKS.push(() => check('admin_isc_export_chunk: refusals and caps', async () => {
  const raises = async (label, sql, params, re) => {
    let msg = null
    try { await db.query(sql, params) } catch (e) { msg = e.message }
    if (!msg || !re.test(msg)) throw new Error(`${label}: expected ${re}, got ${msg}`)
  }
  // 800,000 rows in one request is exactly what this must not allow.
  await raises('no scope', `select * from admin_isc_export_chunk()`, [], /needs a state or a school/)
  await raises('track but no scope', `select * from admin_isc_export_chunk(p_track => 'ai_for_impact')`, [], /needs a state or a school/)
  await raises('district alone', `select * from admin_isc_export_chunk(p_district => 'Haryana District 0')`, [], /p_district was given without p_state/)
  // Half a cursor: (created_at, id) < (ts, null) is NULL for every row, so this
  // would silently return an empty chunk and the export would look finished.
  await raises('timestamp with no id', `select * from admin_isc_export_chunk(p_state => 'Haryana', p_after_created => now())`, [], /both halves or neither/)
  // ...and an id with no timestamp would restart at the top and never terminate.
  await raises('id with no timestamp', `select * from admin_isc_export_chunk(p_state => 'Haryana', p_after_id => (select id from isc_entries limit 1))`, [], /both halves or neither/)
  // min(1000, n): no single state holds 1000 entries at the default scale, so the
  // upper clamp only bites from the target scale up. Both halves are asserted.
  const { rows: [big] } = await db.query(`select s.state, count(*)::int n from isc_entries e
    join schools s on s.id = e.school_id group by 1 order by 2 desc, 1 limit 1`)
  const st = await db.query(`select * from admin_isc_export_chunk(p_state => $1, p_size => 99999)`, [big.state])
  assertEqual(st.rows.length, Math.min(1000, big.n), `p_size is capped at 1000 (${big.state} holds ${big.n} entries)`)
  const st1000 = await db.query(`select id from admin_isc_export_chunk(p_state => $1, p_size => 1000)`, [big.state])
  assertEqual(st.rows.map((r) => r.id), st1000.rows.map((r) => r.id), 'an over-large p_size behaves exactly like 1000')
  assertEqual((await db.query(`select * from admin_isc_export_chunk(p_state => 'Haryana', p_size => 0)`)).rows.length, 1, 'p_size 0 becomes 1')
  // A state scope IS allowed; so is a state + district.
  const { rows } = await db.query(`select * from admin_isc_export_chunk(p_state => 'Haryana', p_district => 'Haryana District 0', p_size => 5)`)
  if (!rows.length) throw new Error('a state + district export returned nothing')
  const { rows: [ref] } = await db.query(`select count(*)::int n from isc_entries e join schools s on s.id = e.school_id
    where s.state = 'Haryana' and s.district = 'Haryana District 0'`)
  if (!(ref.n > 0)) throw new Error('that district has no entries, so the scope proves nothing')
  // The export carries no `total` on purpose: counting 40,000 rows on every chunk
  // is the cost the keyset exists to avoid.
  if ('total' in rows[0]) throw new Error('export chunks must not carry a total')
}))

CHECKS.push(() => check('admin_isc_cold_schools', async () => {
  // Every seeded school has entries, so the cold list is EMPTY at every scale and
  // any assertion over it passes for free. Hand-built fixture, rolled back.
  const S = (n) => `e0e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const U = (n) => `e1e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const E = (n) => `e2e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  await db.exec('begin')
  try {
    // C1 five eligible, C2 three eligible plus two too young, C3 two eligible but
    // it has an entry, C4 nobody at all, C5/C6 share a name and a count.
    await db.query(`insert into schools (id, name, state, district, coordinator_status) values
      ($1,'Coldland One','Coldland','Coldland District 1','pending'),
      ($2,'Coldland Two','Coldland','Coldland District 1','approved'),
      ($3,'Coldland Warm','Coldland','Coldland District 1','none'),
      ($4,'Coldland Empty','Coldland','Coldland District 1','none'),
      ($5,'Coldland Twin','Coldland','Coldland District 1','none'),
      ($6,'Coldland Twin','Coldland','Coldland District 1','none')`,
      // The twins go in with the HIGHER id first, so heap order disagrees with id
      // order. Without `s.id` in the ORDER BY the natural order survives and the
      // ascending-id assertion below fails; with it, the tie is broken properly.
      [S(1), S(2), S(3), S(4), S(6), S(5)])
    const students = []
    const add = (n, school, cls) => students.push([U(n), 'student', `Cold ${n}`, cls, 'Coldland', 'Coldland District 1', school])
    for (let i = 0; i < 5; i++) add(i, S(1), 'Class 8')
    for (let i = 5; i < 8; i++) add(i, S(2), 'Class 9')
    for (let i = 8; i < 10; i++) add(i, S(2), 'Class 3')       // too young: not eligible
    for (let i = 10; i < 12; i++) add(i, S(3), 'Class 10')
    add(12, S(5), 'Class 7'); add(13, S(6), 'Class 7')
    await db.query(`insert into user_profiles (id, role, full_name, school_class, school_state, school_district, school_id)
      values ${students.map((_, j) => `($${j * 7 + 1},$${j * 7 + 2},$${j * 7 + 3},$${j * 7 + 4},$${j * 7 + 5},$${j * 7 + 6},$${j * 7 + 7})`).join(',')}`,
      students.flat())
    await db.query(`insert into isc_entries (id, track, school_id, created_by) values ($1,'ai_for_impact',$2,$3)`, [E(1), S(3), U(10)])

    const { rows } = await db.query(`select * from admin_isc_cold_schools(p_state => 'Coldland', p_district => 'Coldland District 1', p_size => 20)`)
    assertEqual(rows.map((r) => [r.name, Number(r.eligible), r.coordinator_status, Number(r.total)]),
      [['Coldland One', 5, 'pending', 4], ['Coldland Two', 3, 'approved', 4],
       ['Coldland Twin', 1, 'none', 4], ['Coldland Twin', 1, 'none', 4]],
      'cold schools, most eligible students first')
    assertEqual(rows.map((r) => r.state + '/' + r.district), Array(4).fill('Coldland/Coldland District 1'), 'state and district come back')
    const twins = rows.filter((r) => r.name === 'Coldland Twin').map((r) => r.id)
    assertEqual(twins, [...twins].sort(), 'schools tied on count AND name come back in id order')
    // Coldland Warm has an entry; Coldland Empty has no eligible student.
    if (rows.some((r) => r.name === 'Coldland Warm')) throw new Error('a school with an entry was listed as cold')
    if (rows.some((r) => r.name === 'Coldland Empty')) throw new Error('a school with no eligible students was listed (the join is inner on purpose)')
    // Two schools share a name AND a count: without the s.id tie-break one of them
    // appears on two pages and the other on none.
    const walk = []
    for (let page = 1; page <= 6; page++) {
      const { rows: p } = await db.query(`select * from admin_isc_cold_schools(p_state => 'Coldland', p_district => 'Coldland District 1', p_page => $1, p_size => 1)`, [page])
      if (!p.length) break
      walk.push(p[0].id)
    }
    assertEqual(walk, rows.map((r) => r.id), 'paging one row at a time visits every school exactly once, in the same order')
    // The unscoped call must find them too, and the state scope must narrow.
    const { rows: nat } = await db.query(`select * from admin_isc_cold_schools(p_size => 200)`)
    assertEqual(nat.filter((r) => r.state === 'Coldland').map((r) => r.id).sort(), rows.map((r) => r.id).sort(), 'the national cold list contains the Coldland schools')
    assertEqual((await db.query(`select * from admin_isc_cold_schools(p_state => 'Nowhereland')`)).rows.length, 0, 'an unknown state is cold-free')
  } finally { await db.exec('rollback') }
  assertEqual((await db.query(`select count(*)::int n from schools where state = 'Coldland'`)).rows[0].n, 0, 'the fixture was rolled back')
  // Outside the fixture: a raise inside a transaction block aborts it, and every
  // statement after it fails with "current transaction is aborted" instead of
  // whatever it was actually asserting.
  let raised = null
  try { await db.query(`select * from admin_isc_cold_schools(p_district => 'Haryana District 0')`) } catch (e) { raised = e.message }
  if (!raised || !/p_district was given without p_state/.test(raised)) throw new Error(`district without state: ${raised}`)
  assertEqual((await db.query(`select * from admin_isc_cold_schools(p_size => 9999)`)).rows.length <= 200, true, 'p_size capped at 200')
}))

CHECKS.push(() => check('section D reads through the indexes', async () => {
  // Raw table queries: EXPLAIN of an admin function only ever prints "Function Scan".
  const { rows: [s] } = await db.query(`select id from schools order by id limit 1`)
  await assertIndexScan(`select e.id from isc_entries e join schools s on s.id = e.school_id
    where e.school_id = $1 order by e.created_at desc, e.id desc limit 50`, [s.id], 'isc_entries')
  const { rows: [c] } = await db.query(`select created_at, id from isc_entries where school_id = $1 order by created_at desc, id desc limit 1`, [s.id])
  await assertIndexScan(`select e.id from isc_entries e join schools s on s.id = e.school_id
    where e.school_id = $1 and (e.created_at, e.id) < ($2::timestamptz, $3::uuid)
    order by e.created_at desc, e.id desc limit 1000`, [s.id, c.created_at, c.id], 'isc_entries')
  // member_count, once per row of the page.
  const { rows: [e] } = await db.query(`select id from isc_entries order by id limit 1`)
  await assertIndexScan(`select count(*) from isc_entry_members m where m.entry_id = $1 and (m.is_leader or m.accepted_at is not null)`, [e.id], 'isc_entry_members')
  // The cold-schools anti-join probes isc_entries once per school.
  await assertIndexScan(`select s.id from schools s where not exists (select 1 from isc_entries e where e.school_id = s.id)`, [], 'isc_entries')
}))

// Bare calls, nothing else in the timing: this is what the admin page waits for.
CHECKS.push(() => check('TIMING admin_isc_roster() national page 1', async () => {
  const { rows } = await db.query(`select * from admin_isc_roster(p_size => 50)`)
  if (rows.length !== 50) throw new Error(`${rows.length} rows`)
}))
CHECKS.push(() => check('TIMING admin_isc_roster() one school', async () => {
  const school = await smallSchool()
  const { rows } = await db.query(`select * from admin_isc_roster(p_school_id => $1, p_size => 50)`, [school.id])
  if (!rows.length) throw new Error('no rows')
}))
CHECKS.push(() => check('TIMING admin_isc_roster() state + status', async () => {
  const { rows } = await db.query(`select * from admin_isc_roster(p_state => 'Haryana', p_status => 'submitted', p_size => 50)`)
  if (!rows.length) throw new Error('no rows')
}))
CHECKS.push(() => check('TIMING admin_isc_export_chunk() 1000 rows', async () => {
  const { rows } = await db.query(`select * from admin_isc_export_chunk(p_state => 'Haryana', p_size => 1000)`)
  if (!rows.length) throw new Error('no rows')
}))
CHECKS.push(() => check('TIMING admin_isc_cold_schools() national', async () => {
  await db.query(`select * from admin_isc_cold_schools(p_size => 20)`)
}))

// ---------------------------------------------------------------------------
// Task 5 — section E (admin_users_page, admin_search, admin_dashboard,
//                     admin_similar_schools_batch)
// ---------------------------------------------------------------------------

// user_profiles.created_at is far from unique -- the seeder gives 200k profiles
// ~9600 distinct values, and production will have whole batches signed up in the
// same second -- so the fixture below makes EVERY row share one created_at. That
// turns `order by created_at desc` into a pure tie and the paging is lossless
// only because of the `p.id` tie-break.
const USERS_FIXTURE = { n: 12, at: '2026-06-01T12:00:00Z' }
const uf = (n) => `e3e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
async function withUsersFixture(fn) {
  await db.exec('begin')
  try {
    const rows = []
    for (let i = 0; i < USERS_FIXTURE.n; i++) {
      // The name order is the REVERSE of the id order, so name_asc and
      // created_desc cannot accidentally agree.
      rows.push([uf(i), 'student', `Zzfixture ${String(USERS_FIXTURE.n - 1 - i).padStart(2, '0')}`,
        `55500${String(i).padStart(5, '0')}`, 'Class 9', 'Fixtureland', 'Fixtureland District 1',
        `Zzfixture School ${i % 2}`, i % 3 === 0, USERS_FIXTURE.at])
    }
    // Profile 7 has NO auth.users row: a deleted account, or a half-finished
    // signup. It must still be listed, with a null email.
    const auth = rows.filter((r) => r[0] !== uf(7)).map((r) => [r[0], `${r[0].slice(0, 8)}.${r[2].replace(' ', '')}@fixture.test`.toLowerCase()])
    await db.query(`insert into auth.users (id, email) values ${auth.map((_, j) => `($${j * 2 + 1},$${j * 2 + 2})`).join(',')}`, auth.flat())
    await db.query(`insert into user_profiles (id, role, full_name, phone, school_class, school_state, school_district, school_name, onboarding_completed, created_at)
      values ${rows.map((_, j) => `(${Array.from({ length: 10 }, (_, k) => `$${j * 10 + k + 1}`).join(',')})`).join(',')}`, rows.flat())
    await fn(rows)
  } finally { await db.exec('rollback') }
}

CHECKS.push(() => check('admin_users_page pages are lossless and totally ordered', async () => {
  await withUsersFixture(async () => {
    const ids = Array.from({ length: USERS_FIXTURE.n }, (_, i) => uf(i))
    const walk = async (sort, size) => {
      const seen = [], totals = []
      for (let page = 1; page <= 20; page++) {
        const { rows } = await db.query(
          `select * from admin_users_page(p_q => 'zzfixture', p_sort => $1, p_page => $2, p_size => $3)`, [sort, page, size])
        if (!rows.length) return { seen, totals }
        for (const r of rows) { seen.push(r.id); totals.push(Number(r.total)) }
      }
      throw new Error('paging did not terminate')
    }
    for (const sort of ['created_desc', 'created_asc', 'name_asc']) {
      const { seen, totals } = await walk(sort, 5)
      assertEqual(new Set(seen).size, seen.length, `${sort}: no profile appeared on two pages`)
      assertEqual([...seen].sort(), [...ids].sort(), `${sort}: the walk covered every profile exactly once`)
      assertEqual(totals, Array(USERS_FIXTURE.n).fill(USERS_FIXTURE.n), `${sort}: total is the whole match set on every page`)
    }
    // Every row shares one created_at, so created_desc and created_asc both fall
    // through to the id tie-break and name_asc must be the reverse of it.
    assertEqual((await walk('created_desc', 5)).seen, ids, 'created_desc order')
    assertEqual((await walk('created_asc', 5)).seen, ids, 'created_asc order (same timestamp everywhere)')
    assertEqual((await walk('name_asc', 5)).seen, [...ids].reverse(), 'name_asc order')
    // An unrecognised sort falls back to created_desc rather than erroring.
    assertEqual((await walk('nonsense', 5)).seen, ids, 'an unknown p_sort behaves like created_desc')
  })
}))

CHECKS.push(() => check('admin_users_page: filters, caps and the auth.users join', async () => {
  await withUsersFixture(async (rows) => {
    const q = async (args, params = []) => (await db.query(`select * from admin_users_page(${args})`, params)).rows
    // The email comes from auth.users...
    const all = await q(`p_q => 'zzfixture', p_size => 50`)
    assertEqual(all.length, USERS_FIXTURE.n, 'every fixture profile is listed')
    // ...and a profile whose auth row is missing is STILL LISTED, with a null
    // email, rather than being silently dropped by an inner join.
    const orphan = all.find((r) => r.id === uf(7))
    if (!orphan) throw new Error('a profile with no auth.users row vanished from the users page')
    assertEqual(orphan.email, null, 'a profile with no auth row has a null email')
    if (all.filter((r) => r.email === null).length !== 1) throw new Error('exactly one fixture profile should lack an email')
    for (const r of all.filter((r) => r.id !== uf(7)))
      if (!/@fixture\.test$/.test(r.email)) throw new Error(`bad email ${r.email} for ${r.id}`)
    // Searching by email finds a profile that HAS one; the orphan is unreachable
    // that way, which is why the name and phone branches matter.
    assertEqual((await q(`p_q => $1, p_size => 50`, [all[0].email])).map((r) => r.id), [all[0].id], 'search by email')
    assertEqual((await q(`p_q => '5550000007', p_size => 50`)).map((r) => r.id), [uf(7)], 'search by phone reaches the orphan')
    assertEqual((await q(`p_q => 'zzfixture school 1', p_size => 50`)).map((r) => r.id).sort(),
      rows.filter((r) => r[7] === 'Zzfixture School 1').map((r) => r[0]).sort(), 'search by school_name')
    // Case and surrounding whitespace do not matter; an empty query is not a filter.
    assertEqual((await q(`p_q => '  ZZFIXTURE  ', p_size => 50`)).length, USERS_FIXTURE.n, 'the query is trimmed and case-folded')
    const blank = await q(`p_q => '   ', p_size => 1`)
    assertEqual(Number(blank[0].total), (await q(`p_size => 1`)).map((r) => Number(r.total))[0], 'a blank query filters nothing')
    // onboarding filter, both ways.
    const onb = rows.filter((r) => r[8]).map((r) => r[0]).sort()
    assertEqual((await q(`p_q => 'zzfixture', p_onboarded => true, p_size => 50`)).map((r) => r.id).sort(), onb, 'p_onboarded true')
    assertEqual((await q(`p_q => 'zzfixture', p_onboarded => false, p_size => 50`)).map((r) => r.id).sort(),
      rows.filter((r) => !r[8]).map((r) => r[0]).sort(), 'p_onboarded false')
    if (!(onb.length > 0 && onb.length < USERS_FIXTURE.n)) throw new Error('the onboarding filter is not discriminating anything')
    // role filter
    assertEqual((await q(`p_q => 'zzfixture', p_role => 'coordinator', p_size => 50`)).length, 0, 'no fixture coordinators')
    assertEqual((await q(`p_q => 'zzfixture', p_role => 'student', p_size => 50`)).length, USERS_FIXTURE.n, 'p_role student')
    // The other columns are the profile's own.
    const one = all.find((r) => r.id === uf(3))
    assertEqual([one.full_name, one.role, one.school_name, one.school_state, one.school_class, one.onboarding_completed, String(one.created_at)],
      ['Zzfixture 08', 'student', 'Zzfixture School 1', 'Fixtureland', 'Class 9', true, String(new Date(USERS_FIXTURE.at))], 'row contents')
  })
  // Against the seeded data, at whatever scale: the total must equal an
  // independently written count with the same predicates.
  const total = async (args, params = []) => {
    const { rows } = await db.query(`select * from admin_users_page(${args})`, params)
    return rows.length ? Number(rows[0].total) : 0
  }
  const { rows: [ref] } = await db.query(`select
      count(*)::int all_rows,
      count(*) filter (where p.role = 'student')::int students,
      count(*) filter (where p.role = 'student' and not p.onboarding_completed)::int not_onboarded,
      count(*) filter (where lower(coalesce(p.full_name,'')) like '%student 12%'
                          or lower(coalesce(u.email,'')) like '%student 12%'
                          or coalesce(p.phone,'') like '%student 12%'
                          or lower(coalesce(p.school_name,'')) like '%student 12%')::int q12
    from user_profiles p left join auth.users u on u.id = p.id`)
  assertEqual(await total(`p_size => 1`), ref.all_rows, 'unfiltered total')
  assertEqual(await total(`p_role => 'student', p_size => 1`), ref.students, 'role total')
  assertEqual(await total(`p_role => 'student', p_onboarded => false, p_size => 1`), ref.not_onboarded, 'role + onboarded total')
  assertEqual(await total(`p_q => 'student 12', p_size => 1`), ref.q12, 'q total across name, email, phone and school_name')
  if (!(ref.not_onboarded > 0 && ref.not_onboarded < ref.students)) throw new Error('the onboarding filter is vacuous on this seed')
  // Caps and page edges.
  const n = async (args, params = []) => (await db.query(`select * from admin_users_page(${args})`, params)).rows.length
  assertEqual(await n(`p_size => 5000`), 200, 'p_size is capped at 200')
  assertEqual(await n(`p_size => 0`), 1, 'p_size 0 becomes 1')
  const p1 = await db.query(`select id from admin_users_page(p_page => 1, p_size => 3)`)
  for (const page of [0, -3, null])
    assertEqual((await db.query(`select id from admin_users_page(p_page => $1::int, p_size => 3)`, [page])).rows.map((r) => r.id),
      p1.rows.map((r) => r.id), `page ${page} is page 1`)
  assertEqual(await n(`p_page => 2000000000, p_size => 200`), 0, 'an absurd page number is empty, not an error')
}))

CHECKS.push(() => check('the trigram indexes fit the expressions the functions search with', async () => {
  // A gin_trgm_ops index only helps a `like '%x%'` when the indexed expression is
  // written EXACTLY as the query writes it: change `lower(coalesce(full_name,''))`
  // to `lower(full_name)` in either place and the index silently stops being
  // usable, with no error and no failing test anywhere else.
  //
  // enable_seqscan is turned off for the plan, on purpose. Whether the planner
  // PICKS the index is a costing question -- on 2,000 rows a sequential scan
  // really is cheaper -- but whether it CAN is the thing that must not rot.
  const plan = async (sql) => {
    const { rows } = await db.query(`explain ${sql}`)
    return rows.map((r) => Object.values(r)[0]).join('\n')
  }
  await db.exec('set enable_seqscan = off')
  try {
    const users = await plan(`select p.id from user_profiles p where lower(coalesce(p.full_name, '')) like '%student 12%'`)
    if (!/user_profiles_name_trgm/.test(users)) throw new Error(`admin_users_page's name search cannot use user_profiles_name_trgm:\n${users}`)
    const schools = await plan(`select s.id from schools s where lower(s.name) like '%school 12%'`)
    if (!/schools_name_trgm/.test(schools)) throw new Error(`admin_search's school search cannot use schools_name_trgm:\n${schools}`)
  } finally { await db.exec('set enable_seqscan = on') }
  // Honest counterpart, asserted so nobody reads the two lines above as a promise
  // the users page is index-backed: it is not. p_q ORs four columns together and
  // one of them lives on auth.users, so a BitmapOr cannot span the predicate and
  // it stays a filter over two sequential scans at every scale. Per-column
  // trigram indexes do NOT change that (measured: 68 ms to 67 ms). The caveat
  // and the remedy that does work are written where the founder will actually
  // read them -- the note above admin_users_page in section E of
  // docs/admin-scale-migration.sql, and section F item 6.
  const real = await plan(`select p.id, count(*) over () from user_profiles p left join auth.users u on u.id = p.id
    where p.role = 'student' and (lower(coalesce(p.full_name,'')) like '%student 12%' or lower(coalesce(u.email,'')) like '%student 12%'
      or coalesce(p.phone,'') like '%student 12%' or lower(coalesce(p.school_name,'')) like '%student 12%')
    order by p.created_at desc, p.id limit 50`)
  if (!/Seq Scan on user_profiles/.test(real))
    throw new Error(`the four-column OR is no longer a sequential scan -- good news, but update this check, the PERFORMANCE note above admin_users_page in section E, and section F item 6:\n${real}`)
}))

CHECKS.push(() => check('admin_search', async () => {
  const S = (n) => `e4e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const U = (n) => `e5e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  await db.exec('begin')
  try {
    await db.query(`insert into auth.users (id, email) values ($1,'zzsearch.coord@fixture.test'), ($2,'zzsearch.two@fixture.test'), ($3,'zzsearch.pupil@fixture.test')`,
      [U(1), U(2), U(3)])
    await db.query(`insert into user_profiles (id, role, full_name, phone, school_name, school_class) values
      ($1,'coordinator','Zzsearch Coordinator One','5550100001',null,null),
      ($2,'coordinator','Zzsearch Coordinator Two','5550100002',null,null),
      ($3,'student','Zzsearch Pupil','5550100003','Zzsearch Public School','Class 11'),
      ($4,'student',null,'5550100004',null,null)`, [U(1), U(2), U(3), U(4)])
    await db.query(`insert into schools (id, name, state, district, affiliation_no, coordinator_id) values
      ($1,'Zzsearch Public School','Searchland','Searchland District 1','AFF-99001',$3),
      ($2,'Zzsearch Second School','Searchland','Searchland District 1',null,$3)`, [S(1), S(2), U(1)])

    const rows = (await db.query(`select * from admin_search('zzsearch', 10)`)).rows
    const kinds = (k) => rows.filter((r) => r.kind === k)
    assertEqual(kinds('student').map((r) => [r.id, r.title, r.subtitle]),
      [[U(3), 'Zzsearch Pupil', 'Zzsearch Public School - Class 11']], 'student hit')
    assertEqual(kinds('school').map((r) => [r.id, r.title, r.subtitle]),
      [[S(1), 'Zzsearch Public School', 'Searchland District 1, Searchland'],
       [S(2), 'Zzsearch Second School', 'Searchland District 1, Searchland']], 'school hits')
    // The coordinator who claimed TWO schools appears ONCE, not twice.
    assertEqual(kinds('coordinator').map((r) => [r.id, r.title, r.subtitle]),
      [[U(1), 'Zzsearch Coordinator One', 'Zzsearch Public School'],
       [U(2), 'Zzsearch Coordinator Two', 'No school claimed']], 'coordinator hits, one row each')
    // Search by email, by phone, and by affiliation number.
    assertEqual((await db.query(`select kind, id from admin_search('zzsearch.two@fixture.test', 5)`)).rows,
      [{ kind: 'coordinator', id: U(2) }], 'search by email')
    assertEqual((await db.query(`select kind, id from admin_search('AFF-99001', 5)`)).rows,
      [{ kind: 'school', id: S(1) }], 'search by affiliation number, case-insensitively')
    // A profile with no name and no email is still returned with a usable title.
    assertEqual((await db.query(`select kind, id, title from admin_search('5550100004', 5)`)).rows,
      [{ kind: 'student', id: U(4), title: U(4) }], 'title falls back to the id, never null')
    // Every row of every kind has a non-null title and subtitle.
    for (const r of rows)
      if (r.title === null || r.subtitle === null) throw new Error(`null title/subtitle: ${JSON.stringify(r)}`)
  } finally { await db.exec('rollback') }

  // The two-character floor, on the live data.
  for (const q of ['', ' ', 'a', ' s ', null])
    assertEqual((await db.query(`select * from admin_search($1)`, [q])).rows.length, 0, `search ${JSON.stringify(q)} returns nothing`)
  const two = (await db.query(`select * from admin_search('sc', 5)`)).rows
  if (!two.length) throw new Error('a two-character search must be allowed to answer')
  // p_limit is per kind and capped at 25.
  const wide = (await db.query(`select kind, count(*)::int n from admin_search('school', 100000) group by 1`)).rows
  if (!wide.length) throw new Error("'school' matched nothing")
  for (const r of wide) if (r.n > 25) throw new Error(`p_limit is not capped: ${r.kind} returned ${r.n}`)
  if (!wide.some((r) => r.n === 25)) throw new Error('nothing reached the cap, so the cap is untested')
  for (const r of (await db.query(`select kind, count(*)::int n from admin_search('school', 0) group by 1`)).rows)
    if (r.n > 1) throw new Error(`p_limit 0 should clamp to 1, ${r.kind} returned ${r.n}`)
  // Kinds are what the caller groups on, so they must be exactly these three.
  const seenKinds = (await db.query(`select distinct kind from admin_search('s', 5) union select distinct kind from admin_search('school', 5)
    union select distinct kind from admin_search('student', 5)`)).rows.map((r) => r.kind).sort()
  for (const k of seenKinds) if (!['student', 'school', 'coordinator'].includes(k)) throw new Error(`unexpected kind ${k}`)
}))

CHECKS.push(() => check('admin_dashboard', async () => {
  await db.exec('begin')
  try {
    // support_conversations is never seeded and admin_dashboard reads it, so
    // active_support would be 0 == 0 and prove nothing. Three inside the window,
    // two outside it.
    await db.query(`insert into support_conversations (coordinator_id, last_message_at) values
      (null, now() - interval '1 hour'), (null, now() - interval '2 days'), (null, now() - interval '6 days'),
      (null, now() - interval '8 days'), (null, now() - interval '90 days')`)
    // Nothing in the seed is pending review or has the coordinator role either.
    await db.query(`insert into schools (id, name, state, district, review_status, coordinator_status) values
      ('e6e00000-0000-4000-8000-000000000001','Dashboard Pending','Searchland','Searchland District 1','pending','pending')`)
    await db.query(`insert into user_profiles (id, role, full_name) values ('e6e00000-0000-4000-8000-000000000002','coordinator','Dashboard Coordinator')`)

    const { rows: [{ v }] } = await db.query(`select admin_dashboard() v`)
    for (const k of ['pending_schools', 'pending_coordinators', 'pending_certificates', 'active_support', 'students',
      'students_onboarded', 'coordinators', 'schools_approved', 'isc', 'top_states', 'stalled_states', 'timeline'])
      if (!(k in v)) throw new Error(`admin_dashboard is missing ${k}`)
    const { rows: [ref] } = await db.query(`select
        (select count(*)::int from schools where review_status = 'pending') pending_schools,
        (select count(*)::int from schools where coordinator_status = 'pending') pending_coordinators,
        (select count(*)::int from certificate_uploads where status = 'pending') pending_certificates,
        (select count(*)::int from support_conversations where last_message_at > now() - interval '7 days') active_support,
        (select count(*)::int from user_profiles where role = 'student') students,
        (select count(*)::int from user_profiles where role = 'student' and onboarding_completed) students_onboarded,
        (select count(*)::int from user_profiles where role = 'coordinator') coordinators,
        (select count(*)::int from schools where review_status = 'approved') schools_approved`)
    for (const k of Object.keys(ref)) {
      assertEqual(v[k], ref[k], `dashboard ${k}`)
      if (typeof v[k] !== 'number') throw new Error(`${k} should be a JSON number, got ${typeof v[k]}`)
    }
    // Every counter must be discriminating something, or it is not being tested.
    assertEqual(v.active_support, 3, 'active_support counts only the last seven days')
    for (const k of ['pending_schools', 'pending_coordinators', 'pending_certificates', 'students', 'coordinators', 'schools_approved'])
      if (!(v[k] > 0)) throw new Error(`${k} is 0, so comparing it to a reference proves nothing`)
    if (!(v.students_onboarded > 0 && v.students_onboarded < v.students)) throw new Error('students_onboarded is not a strict subset')
    assertEqual(v.isc, (await db.query(`select admin_isc_summary() v`)).rows[0].v, 'isc is the national summary verbatim')

    // top_states / stalled_states are the same breakdown ordered two ways. The
    // expected order is computed in SQL, not JS: `submitted::numeric / eligible`
    // is exact numeric in Postgres and a float64 in JS, and the two can disagree
    // about a tie.
    await db.exec(`create temp table bd_ref on commit drop as select * from admin_isc_breakdown()`)
    const order = async (where, dir) => (await db.query(
      `select key from bd_ref where ${where} order by submitted::numeric / eligible ${dir}, eligible desc, key limit 5`)).rows.map((r) => r.key)
    assertEqual(v.top_states.map((r) => r.key), await order('eligible > 0', 'desc'), 'top_states order')
    assertEqual(v.stalled_states.map((r) => r.key), await order('eligible >= 50', 'asc'), 'stalled_states order')
    if (!(v.top_states.length > 0)) throw new Error('top_states is empty, so its ordering proves nothing')
    if (v.top_states.length > 5 || v.stalled_states.length > 5) throw new Error('at most five states in each list')
    // ...and each element carries the whole breakdown row.
    for (const list of [v.top_states, v.stalled_states])
      for (const r of list) {
        assertEqual(Object.keys(r).sort(), ['eligible', 'key', 'label', 'schools', 'started', 'submitted'], 'state row shape')
        const { rows: [b] } = await db.query(`select * from bd_ref where key = $1`, [r.key])
        assertEqual([r.label, r.eligible, r.started, r.submitted, r.schools],
          [b.label, Number(b.eligible), Number(b.started), Number(b.submitted), Number(b.schools)], `state row ${r.key}`)
      }
    // timeline is admin_isc_timeline(7) verbatim, oldest day first.
    // `day` is not a safe bare alias in Postgres -- `select x as day` or nothing.
    const { rows: tl } = await db.query(`select to_char(t.day, 'YYYY-MM-DD') as day,
        t.started::int as started, t.submitted::int as submitted
      from admin_isc_timeline(null, null, null, 7) t`)
    assertEqual(v.timeline.length, 7, 'seven-day timeline')
    assertEqual(v.timeline, tl, 'the timeline is admin_isc_timeline(7), oldest day first')
  } finally { await db.exec('rollback') }
  assertEqual((await db.query(`select count(*)::int n from support_conversations`)).rows[0].n, 0, 'the fixture was rolled back')
}))

CHECKS.push(() => check('admin_similar_schools_batch', async () => {
  const S = (n) => `e7e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  await db.exec('begin')
  try {
    // find_similar_schools only pairs schools in the SAME district with a trigram
    // similarity over 0.3, which the seeder never produces below --schools 200.
    // A deliberate near-duplicate pair makes this check mean something at every scale.
    await db.query(`insert into schools (id, name, state, district, address, review_status) values
      ($1,'Batchland Model School','Batchland','Batchland District 1','12 Batch Road','approved'),
      ($2,'Batchland Model School Annexe','Batchland','Batchland District 1','12 Batch Road','pending'),
      ($3,'Completely Different Place','Batchland','Batchland District 1','9 Elsewhere','approved')`,
      [S(1), S(2), S(3)])
    const ids = [S(1), S(2), S(3)]
    const { rows } = await db.query(`select * from admin_similar_schools_batch($1)`, [ids])
    if (!rows.length) throw new Error('the near-duplicate pair produced no matches at all')
    for (const r of rows) if (!ids.includes(r.school_id)) throw new Error(`row for an unrequested school ${r.school_id}`)
    // Batch == the per-school calls it replaces.
    for (const id of ids) {
      const { rows: one } = await db.query(`select id, name, address, review_status, score from find_similar_schools($1) order by score desc, id`, [id])
      assertEqual(rows.filter((r) => r.school_id === id).map((r) => [r.similar_id, r.similar_name, r.similar_address, r.similar_review_status, r.score]),
        one.map((r) => [r.id, r.name, r.address, r.review_status, r.score]), `batch matches find_similar_schools(${id})`)
    }
    assertEqual(rows.filter((r) => r.school_id === S(1)).map((r) => [r.similar_id, r.similar_review_status]),
      [[S(2), 'pending']], 'the near-duplicate is found, with its review status')
    assertEqual(rows.filter((r) => r.school_id === S(3)).length, 0, 'a school with no near-duplicate contributes no rows')
    // Asking for one school returns rows for that school only.
    const solo = (await db.query(`select * from admin_similar_schools_batch($1)`, [[S(1)]])).rows
    assertEqual(solo.map((r) => r.school_id), [S(1)], 'a one-id batch stays on that id')
    // Duplicated ids must not duplicate the matches.
    assertEqual((await db.query(`select * from admin_similar_schools_batch($1)`, [[S(1), S(1), S(1)]])).rows.length, solo.length,
      'a repeated id is not answered three times')
  } finally { await db.exec('rollback') }
  // Empty, null and unknown inputs, and the size cap.
  for (const [label, arr] of [['empty', []], ['null', null], ['unknown id', ['e7e00000-0000-4000-8000-000000009999']], ['null element', [null]]])
    assertEqual((await db.query(`select * from admin_similar_schools_batch($1::uuid[])`, [arr])).rows.length, 0, `${label} array returns no rows`)
  const many = Array.from({ length: 201 }, (_, i) => `e7e00000-0000-4000-8000-${String(i).padStart(12, '0')}`)
  let raised = null
  try { await db.query(`select * from admin_similar_schools_batch($1)`, [many]) } catch (e) { raised = e.message }
  if (!raised || !/at most 200 per call/.test(raised)) throw new Error(`201 ids should be refused, got: ${raised}`)
  assertEqual((await db.query(`select count(*)::int n from admin_similar_schools_batch($1)`, [many.slice(0, 200)])).rows.length, 1, '200 ids are allowed')
}))

CHECKS.push(() => check('sections D and E are admin only', async () => {
  // Every one of these reads children's records. A non-admin must get an
  // exception, never an empty result that a caller could mistake for "no rows".
  await db.exec(`create or replace function is_admin() returns boolean language sql as $x$ select false $x$`)
  try {
    const calls = [
      `select * from admin_isc_roster()`,
      `select * from admin_isc_export_chunk(p_state => 'Haryana')`,
      `select * from admin_isc_cold_schools()`,
      `select * from admin_users_page()`,
      `select * from admin_search('sharma')`,
      // ...including a query too short to answer: the gate must come FIRST, or a
      // non-admin gets a silent empty set back and learns the function exists.
      `select * from admin_search('a')`,
      `select admin_dashboard()`,
      `select * from admin_similar_schools_batch(null)`,
      `select * from admin_similar_schools_batch(array(select id from schools limit 2))`,
    ]
    for (const sql of calls) {
      let raised = null
      try { await db.query(sql) } catch (e) { raised = e.message }
      assertEqual(raised, 'admin only', `${sql} must refuse a non-admin`)
    }
  } finally {
    await db.exec(`create or replace function is_admin() returns boolean language sql as $x$ select true $x$`)
  }
}))

CHECKS.push(() => check('sections D and E survive a second apply', async () => {
  // `create or replace function` only REPLACES when the signature matches to the
  // argument type. Change one parameter and the second apply leaves TWO
  // functions of the same name, and every call becomes "function is not unique".
  // Everything above this line already ran against a twice-applied migration
  // (the section B idempotency check re-execs the file); this pins the function
  // definitions specifically.
  await db.exec(MIGRATION_SQL)
  const names = ['admin_isc_cold_schools', 'admin_isc_export_chunk', 'admin_isc_roster',
    'admin_search', 'admin_similar_schools_batch', 'admin_users_page', 'admin_dashboard'].sort()
  const { rows } = await db.query(
    `select proname, count(*)::int n from pg_proc where proname = any($1) group by 1 order by 1`, [names])
  assertEqual(rows.map((r) => [r.proname, r.n]), names.map((n) => [n, 1]), 'exactly one function of each name after a second apply')
  for (const sql of [`select * from admin_isc_roster(p_size => 1)`, `select * from admin_isc_export_chunk(p_state => 'Haryana', p_size => 1)`,
    `select * from admin_isc_cold_schools(p_size => 1)`, `select * from admin_users_page(p_size => 1)`,
    `select * from admin_search('school', 1)`, `select admin_dashboard()`,
    `select * from admin_similar_schools_batch(array(select id from schools order by id limit 2))`])
    await db.query(sql)
}))

CHECKS.push(() => check('TIMING admin_users_page() page 1', async () => {
  const { rows } = await db.query(`select * from admin_users_page(p_size => 50)`)
  if (rows.length !== 50) throw new Error(`${rows.length} rows`)
}))
CHECKS.push(() => check('TIMING admin_users_page() search', async () => {
  const { rows } = await db.query(`select * from admin_users_page(p_q => 'student 12', p_role => 'student', p_size => 50)`)
  if (!rows.length) throw new Error('no rows')
}))
CHECKS.push(() => check('TIMING admin_search()', async () => {
  const { rows } = await db.query(`select * from admin_search('school 12', 10)`)
  if (!rows.length) throw new Error('no rows')
}))
CHECKS.push(() => check('TIMING admin_dashboard()', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_dashboard() v`)
  if (!v || v.students === undefined) throw new Error('no dashboard')
}))
CHECKS.push(() => check('TIMING admin_similar_schools_batch() 20 schools', async () => {
  await db.query(`select * from admin_similar_schools_batch(array(select id from schools order by id limit 20))`)
}))
// ---------------------------------------------------------------------------
// Task G1 — section G (admin_coordinator_summary, admin_coordinator_breakdown,
//                      admin_coordinator_trend, admin_coordinators_page,
//                      admin_coordinator_detail)
// ---------------------------------------------------------------------------

// WHAT THE SEEDED DATA CAN AND CANNOT PROVE, since it decides where each
// assertion below lives:
//   * It can prove the sums. Every school has a claim status from a 13-long
//     pattern, one coordinator per claimed school, a sixth again as many
//     coordinators with no claim at all, and a twentieth extra students who
//     compete in nothing — so students_entered is strictly below students at
//     nearly every school and entered_pct is not 100.
//   * It cannot prove anything about a coordinator holding TWO claims, a
//     coordinator with no auth.users row, a pending invitee at a covered school,
//     or a student competing at somebody else's school in a way whose expected
//     number is small enough to work out by hand. Those live in the
//     'coordinator analytics on a hand-computed fixture' check, which is rolled
//     back and then asserted to have been rolled back.

// The claim-status precedence section G uses everywhere: approved beats pending
// beats rejected, so a person is counted under exactly one of them.
const CLAIM_RANK = `case s.coordinator_status when 'approved' then 3 when 'pending' then 2 when 'rejected' then 1 else 0 end`

// Reference figures for one scope, written from the other direction: no CTEs, no
// shared subexpressions, `exists` where section G uses joins and aggregates, and
// the claim precedence spelled out as three separate NOT EXISTS clauses rather
// than as a max() over a rank.
const coordRef = async (state = null, district = null) => {
  const inScope = `(($1::text is null or s.state = $1) and ($2::text is null or s.district = $2))`
  const covered = `exists (select 1 from schools s where s.id = p.school_id and ${inScope}
                            and s.coordinator_id is not null and s.coordinator_status = 'approved')`
  const anySchool = `exists (select 1 from schools s where s.id = p.school_id and ${inScope})`
  const onATeam = `exists (select 1 from isc_entry_members m
                            where m.user_id = p.id and (m.is_leader or m.accepted_at is not null))`
  const claims = (extra) => `exists (select 1 from schools s where s.coordinator_id = p.id and ${inScope} ${extra})`
  const { rows: [r] } = await db.query(`select
    (select count(*)::int from user_profiles p where p.role = 'coordinator'
       and ($1::text is null or ${claims('')})) coordinators,
    (select count(*)::int from user_profiles p where p.role = 'coordinator'
       and ${claims(`and s.coordinator_status = 'approved'`)}) approved,
    (select count(*)::int from user_profiles p where p.role = 'coordinator'
       and ${claims(`and s.coordinator_status = 'pending'`)}
       and not ${claims(`and s.coordinator_status = 'approved'`)}) pending,
    (select count(*)::int from user_profiles p where p.role = 'coordinator'
       and ${claims(`and s.coordinator_status = 'rejected'`)}
       and not ${claims(`and s.coordinator_status = 'approved'`)}
       and not ${claims(`and s.coordinator_status = 'pending'`)}) rejected,
    (select count(*)::int from schools s where ${inScope}) schools_total,
    (select count(*)::int from schools s where ${inScope} and s.coordinator_id is not null) schools_claimed,
    (select count(*)::int from schools s where ${inScope}
       and s.coordinator_id is not null and s.coordinator_status = 'approved') schools_approved,
    (select count(*)::int from user_profiles p where p.role = 'student' and ${covered}) students_covered,
    (select count(*)::int from user_profiles p where p.role = 'student'
       and ${anySchool} and not ${covered}) students_uncovered,
    (select count(*)::int from user_profiles p where p.role = 'student' and ${covered} and ${onATeam}) students_entered
  `, [state, district])
  // The per-coordinator student totals the median runs over, one row per person,
  // zeros included. Sorted and halved in JS so nothing about percentile_cont is
  // assumed.
  const { rows: pop } = await db.query(`
    select coalesce((select count(*) from user_profiles st
                      where st.role = 'student'
                        and st.school_id in (select s.id from schools s
                                              where s.coordinator_id = p.id and ${inScope})), 0)::int n
    from user_profiles p
    where p.role = 'coordinator' and ($1::text is null or ${claims('')})
    order by 1`, [state, district])
  const ns = pop.map((x) => x.n).sort((a, b) => a - b)
  const mid = ns.length === 0 ? 0
    : ns.length % 2 ? ns[(ns.length - 1) / 2] : (ns[ns.length / 2 - 1] + ns[ns.length / 2]) / 2
  return {
    ...r,
    schools_uncovered: r.schools_total - r.schools_approved,
    median: Math.round(mid * 10) / 10,
    entered_pct: r.students_covered === 0 ? 0
      : Math.round((1000 * r.students_entered) / r.students_covered) / 10,
  }
}

const assertSummaryMatches = (v, ref, label) => {
  assertEqual([v.coordinators, v.approved, v.pending, v.rejected],
    [ref.coordinators, ref.approved, ref.pending, ref.rejected], `${label}: people`)
  assertEqual([v.schools_total, v.schools_claimed, v.schools_approved, v.schools_uncovered],
    [ref.schools_total, ref.schools_claimed, ref.schools_approved, ref.schools_uncovered], `${label}: schools`)
  assertEqual([v.students_covered, v.students_uncovered, v.students_entered],
    [ref.students_covered, ref.students_uncovered, ref.students_entered], `${label}: students`)
  assertEqual(v.median_students_per_coordinator, ref.median, `${label}: median`)
  assertEqual(v.entered_pct, ref.entered_pct, `${label}: entered_pct`)
}

CHECKS.push(() => check('admin_coordinator_summary national', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_coordinator_summary() v`)
  const ref = await coordRef()
  assertSummaryMatches(v, ref, 'national')
  // Every key present, every value a JSON number, nothing null.
  for (const k of ['coordinators', 'approved', 'pending', 'rejected', 'schools_total', 'schools_claimed',
    'schools_approved', 'schools_uncovered', 'students_covered', 'students_uncovered', 'students_entered',
    'median_students_per_coordinator', 'entered_pct']) {
    if (!(k in v)) throw new Error(`admin_coordinator_summary is missing ${k}`)
    if (typeof v[k] !== 'number') throw new Error(`${k} should be a JSON number, got ${typeof v[k]} ${JSON.stringify(v[k])}`)
  }
  // ...and every one of them must be discriminating something on this seed, or
  // comparing it to a reference proves nothing.
  for (const k of ['coordinators', 'approved', 'pending', 'rejected', 'schools_claimed',
    'schools_approved', 'schools_uncovered', 'students_covered', 'students_uncovered', 'students_entered'])
    if (!(v[k] > 0)) throw new Error(`${k} is 0 on the seed, so this check cannot fail`)
  assertEqual(v.schools_claimed < v.schools_total, true, 'some schools have no coordinator at all')
  assertEqual(v.schools_approved < v.schools_claimed, true, 'some claims are not approved')
  assertEqual(v.approved + v.pending + v.rejected < v.coordinators, true,
    'some coordinators have no claim, so the three statuses must not add up to the total')
  // THE headline number. It cannot exceed 100 because students_entered counts a
  // subset of the same people as students_covered -- and it must not be 100
  // either, or a function returning the reach as the entered count would pass.
  if (!(v.entered_pct > 0 && v.entered_pct < 100))
    throw new Error(`entered_pct is ${v.entered_pct}: the seed has stopped discriminating entered from registered`)
  assertEqual(v.students_entered < v.students_covered, true, 'not every covered student has entered')
  // A pending or rejected claim is NOT coverage.
  const { rows: [u] } = await db.query(`select count(*)::int n from schools
    where coordinator_id is not null and coordinator_status in ('pending', 'rejected')`)
  if (!(u.n > 0)) throw new Error('no claimed-but-unapproved schools in the seed')
  assertEqual(v.schools_uncovered >= u.n, true, 'claimed-but-unapproved schools count as uncovered')
}))

CHECKS.push(() => check('admin_coordinator_summary scoped', async () => {
  const { rows: [st] } = await db.query(`select state, count(*)::int n from schools group by 1 order by 2 desc, 1 limit 1`)
  const v = (await db.query(`select admin_coordinator_summary($1) v`, [st.state])).rows[0].v
  assertSummaryMatches(v, await coordRef(st.state), `state ${st.state}`)
  const nat = (await db.query(`select admin_coordinator_summary() v`)).rows[0].v
  if (!(v.schools_total > 0 && v.schools_total < nat.schools_total))
    throw new Error(`the state scope did not narrow anything: ${v.schools_total} of ${nat.schools_total}`)
  // Scoped, `coordinators` is the people with a claim in that state, so unlike
  // the national call the three statuses DO account for all of them (probe 8).
  assertEqual(v.approved + v.pending + v.rejected, v.coordinators,
    'every scoped coordinator is counted under exactly one claim status')
  const { rows: [d] } = await db.query(`select district from schools where state = $1 order by district limit 1`, [st.state])
  const dv = (await db.query(`select admin_coordinator_summary($1, $2) v`, [st.state, d.district])).rows[0].v
  assertSummaryMatches(dv, await coordRef(st.state, d.district), `district ${d.district}`)
  if (!(dv.schools_total > 0 && dv.schools_total < v.schools_total))
    throw new Error(`the district scope did not narrow the state: ${dv.schools_total} of ${v.schools_total}`)
  // An unknown state is all zeros, never null.
  const empty = (await db.query(`select admin_coordinator_summary('Nowhereland') v`)).rows[0].v
  assertEqual([empty.coordinators, empty.schools_total, empty.students_covered, empty.students_uncovered,
    empty.students_entered, empty.median_students_per_coordinator, empty.entered_pct], [0, 0, 0, 0, 0, 0, 0],
    'zeros for an unknown state, and a median of 0 rather than null')
  // A district with no state is refused, exactly as in sections C and D.
  let raised = null
  try { await db.query(`select admin_coordinator_summary(null, $1)`, [d.district]) } catch (e) { raised = e.message }
  if (!raised || !/p_district was given without p_state/.test(raised))
    throw new Error(`a district without a state must be refused, got: ${raised}`)
}))

CHECKS.push(() => check('admin_coordinator_breakdown levels and sums', async () => {
  const nat = (await db.query(`select * from admin_coordinator_breakdown()`)).rows
  const num = (r) => [Number(r.coordinators), Number(r.approved), Number(r.schools_claimed),
    Number(r.schools_total), Number(r.students_covered), Number(r.students_entered)]
  if (nat.length < 2) throw new Error('the national breakdown should list several states')
  // Exactly the states that have at least one school -- including the ones with
  // no coordinator at all, which are the whole point of this table.
  const { rows: refStates } = await db.query(`select distinct state k from schools order by 1`)
  assertEqual(nat.map((r) => r.key).sort(), refStates.map((r) => r.k).sort(), 'the state list')
  assertEqual(nat.every((r) => r.label === r.key), true, 'label mirrors key at state level')
  // Every school is accounted for in its own state's row, whether or not anybody
  // has claimed it -- a state row that quietly dropped the unclaimed schools
  // would still sum correctly against a national figure computed the same way.
  const { rows: refCounts } = await db.query(`select state k, count(*)::int n,
    count(coordinator_id)::int claimed from schools group by 1 order by 1`)
  assertEqual(nat.map((r) => [r.key, Number(r.schools_total), Number(r.schools_claimed)]).sort(),
    refCounts.map((r) => [r.k, r.n, r.claimed]).sort(), 'every state row counts its own schools')
  if (!refCounts.some((r) => r.claimed < r.n))
    throw new Error('every school in the seed is claimed, so the uncovered case is untested')
  // A state with no coordinator at all still gets a row -- which state that is
  // depends on the scale, so the exact shape is pinned by the fixture check.
  for (const r of nat.filter((x) => Number(x.coordinators) === 0))
    assertEqual([Number(r.approved), Number(r.schools_claimed), Number(r.students_covered), Number(r.students_entered)],
      [0, 0, 0, 0], `a state with no coordinator (${r.key}) has no claims and no covered students`)
  // Ordered students_covered desc, then key. Both halves asserted.
  for (let i = 1; i < nat.length; i++) {
    const a = Number(nat[i - 1].students_covered), b = Number(nat[i].students_covered)
    if (a < b || (a === b && !(nat[i - 1].key < nat[i].key)))
      throw new Error(`breakdown is not ordered (students_covered desc, key): ${nat[i - 1].key} then ${nat[i].key}`)
  }
  // Every column except `coordinators` sums to the national figure.
  const v = (await db.query(`select admin_coordinator_summary() v`)).rows[0].v
  const sum = (k) => nat.reduce((a, r) => a + Number(r[k]), 0)
  assertEqual(sum('schools_total'), v.schools_total, 'schools_total sums to national')
  assertEqual(sum('schools_claimed'), v.schools_claimed, 'schools_claimed sums to national')
  assertEqual(sum('approved'), v.approved, 'approved coordinators sum to national')
  assertEqual(sum('students_covered'), v.students_covered, 'students_covered sums to national')
  assertEqual(sum('students_entered'), v.students_entered, 'students_entered sums to national')
  // ...and `coordinators` does NOT, by exactly the people who have claimed
  // nothing. This is section F probe 7, and it is the documented asymmetry.
  const { rows: [orphan] } = await db.query(`select count(*)::int n from user_profiles p
    where p.role = 'coordinator' and not exists (select 1 from schools s where s.coordinator_id = p.id)`)
  if (!(orphan.n > 0)) throw new Error('no claim-less coordinators in the seed, so the documented gap is untested')
  assertEqual(sum('coordinators') + orphan.n, v.coordinators,
    'state coordinators + coordinators with no claim = national coordinators')
  // Probe 9: one claim per person. The sums above are only exact while it holds,
  // and the multi-claim behaviour is pinned by the fixture check instead.
  const { rows: [multi] } = await db.query(`select count(*)::int n from (
    select coordinator_id from schools where coordinator_id is not null group by 1 having count(*) > 1) t`)
  assertEqual(multi.n, 0, 'the seed gives each coordinator exactly one school')
  // Districts inside the top state sum to that state's row, every column.
  const top = nat[0]
  const di = (await db.query(`select * from admin_coordinator_breakdown($1)`, [top.key])).rows
  if (di.length < 2) throw new Error(`the top state ${top.key} has fewer than two districts`)
  const dsum = (k) => di.reduce((a, r) => a + Number(r[k]), 0)
  for (const k of ['coordinators', 'approved', 'schools_claimed', 'schools_total', 'students_covered', 'students_entered'])
    assertEqual(dsum(k), Number(top[k]), `district ${k} sums to the state row`)
  const { rows: refDistricts } = await db.query(`select distinct district k from schools where state = $1 order by 1`, [top.key])
  assertEqual(di.map((r) => r.key).sort(), refDistricts.map((r) => r.k).sort(), 'the district list')
}))

CHECKS.push(() => check('admin_coordinator_breakdown agrees with admin_coordinator_summary', async () => {
  // Two independently written implementations of the same six numbers, at both
  // levels. The breakdown groups every state in one pass; the summary re-scopes
  // and recounts per call.
  const nat = (await db.query(`select * from admin_coordinator_breakdown()`)).rows
  for (const r of nat) {
    const { rows: [{ v }] } = await db.query(`select admin_coordinator_summary($1) v`, [r.key])
    assertEqual([Number(r.coordinators), Number(r.approved), Number(r.schools_claimed),
      Number(r.schools_total), Number(r.students_covered), Number(r.students_entered)],
      [v.coordinators, v.approved, v.schools_claimed, v.schools_total, v.students_covered, v.students_entered],
      `state ${r.key}`)
  }
  const di = (await db.query(`select * from admin_coordinator_breakdown($1)`, [nat[0].key])).rows
  for (const r of di) {
    const { rows: [{ v }] } = await db.query(`select admin_coordinator_summary($1, $2) v`, [nat[0].key, r.key])
    assertEqual([Number(r.coordinators), Number(r.approved), Number(r.schools_claimed),
      Number(r.schools_total), Number(r.students_covered), Number(r.students_entered)],
      [v.coordinators, v.approved, v.schools_claimed, v.schools_total, v.students_covered, v.students_entered],
      `district ${r.key}`)
  }
}))

CHECKS.push(() => check('admin_coordinator_trend', async () => {
  // Wide enough to cover every seeded coordinator. The default 30-day window
  // covers only a slice of them, so asserting on 30 days alone would be a
  // weaker test of the same shape (and `rows.length === 30` is true whatever the
  // data does -- the function zero-fills).
  const { rows: [w] } = await db.query(
    `select greatest((current_date - min(created_at)::date) + 1, 1)::int d from user_profiles where role = 'coordinator'`)
  const days = w.d
  const rows = (await db.query(`select * from admin_coordinator_trend(null, $1)`, [days])).rows
  assertEqual(rows.length, days, 'one row per day, zero-filled')
  // The columns are cohort_claimed / cohort_approved, not claims / approvals: an
  // approval is plotted on its coordinator's SIGNUP day, so on any window shorter
  // than the whole history the second name would be read as an event count and be
  // wrong. Asserting the names here means a rename cannot pass silently.
  assertEqual(Object.keys(rows[0]).sort(), ['cohort_approved', 'cohort_claimed', 'coordinators', 'day'],
    'the trend columns are named as the cohort figures they are')
  const { rows: ref } = await db.query(`
    select g.d as day, coalesce(c.n, 0)::int as coordinators,
           coalesce(c.claimed, 0)::int as cohort_claimed, coalesce(c.approved, 0)::int as cohort_approved
    from (select (current_date - i)::date d from generate_series(0, $1::int - 1) i) g
    left join (
      select p.created_at::date d, count(*) n,
        count(*) filter (where exists (select 1 from schools s where s.coordinator_id = p.id)) claimed,
        count(*) filter (where exists (select 1 from schools s where s.coordinator_id = p.id
                                         and s.coordinator_status = 'approved')) approved
      from user_profiles p where p.role = 'coordinator' group by 1) c on c.d = g.d
    order by 1`, [days])
  // `day` is a SQL date, so it arrives as a JS Date, not a string. Compare like
  // with like, and the bigints as numbers.
  assertEqual(rows.map((r) => [String(r.day), Number(r.coordinators), Number(r.cohort_claimed), Number(r.cohort_approved)]),
    ref.map((r) => [String(r.day), r.coordinators, r.cohort_claimed, r.cohort_approved]), 'every day matches an independent reference')
  const total = (k) => rows.reduce((a, r) => a + Number(r[k]), 0)
  const { rows: [n] } = await db.query(`select
    (select count(*)::int from user_profiles where role = 'coordinator') c,
    (select count(distinct coordinator_id)::int from schools where coordinator_id is not null) cl,
    (select count(distinct coordinator_id)::int from schools where coordinator_id is not null and coordinator_status = 'approved') ap`)
  assertEqual([total('coordinators'), total('cohort_claimed'), total('cohort_approved')], [n.c, n.cl, n.ap],
    'a window covering every signup accounts for every coordinator, claim and approval')
  // The funnel invariant: all three series are keyed on the same signup day, so
  // coordinators >= cohort_claimed >= cohort_approved on every single day.
  for (const r of rows)
    if (!(Number(r.coordinators) >= Number(r.cohort_claimed) && Number(r.cohort_claimed) >= Number(r.cohort_approved)))
      throw new Error(`the funnel inverts on ${r.day}: ${JSON.stringify(r)}`)
  if (!rows.some((r) => Number(r.coordinators) > 0)) throw new Error('the window covered no signups at all')
  if (!rows.some((r) => Number(r.coordinators) > Number(r.cohort_claimed)))
    throw new Error('no day has a coordinator who never claimed, so cohort_claimed is untested')
  if (!rows.some((r) => Number(r.cohort_claimed) > Number(r.cohort_approved)))
    throw new Error('no day has an unapproved claim, so cohort_approved is untested')
  // The reason the columns are not called `approvals`: a short window misses
  // every approval whose coordinator signed up before it, so this is NOT the
  // number of approved schools and must never be read as one.
  const short = (await db.query(`select * from admin_coordinator_trend(null, 30)`)).rows
  const shortApprovals = short.reduce((a, r) => a + Number(r.cohort_approved), 0)
  if (!(shortApprovals < n.ap))
    throw new Error(`a 30-day window summed to ${shortApprovals} of ${n.ap} approvals: the cohort/event gap this naming exists for is not present in the seed, so the naming rationale is untested`)
  if (!rows.some((r) => Number(r.coordinators) === 0)) throw new Error('no empty day, so the zero-fill is untested')
  // Scoping narrows, and a scoped coordinator IS a scoped claim -- a coordinator
  // has no state until they claim one.
  const { rows: [st] } = await db.query(`select state from schools where coordinator_id is not null order by id limit 1`)
  const scoped = (await db.query(`select * from admin_coordinator_trend($1, $2)`, [st.state, days])).rows
  const { rows: [sref] } = await db.query(
    `select count(distinct s.coordinator_id)::int n from schools s
     join user_profiles p on p.id = s.coordinator_id and p.role = 'coordinator'
     where s.state = $1 and p.created_at >= current_date - ($2::int - 1)`, [st.state, days])
  assertEqual(scoped.reduce((a, r) => a + Number(r.coordinators), 0), sref.n, `trend scoped to ${st.state}`)
  assertEqual(scoped.map((r) => Number(r.cohort_claimed)), scoped.map((r) => Number(r.coordinators)),
    'scoped, every counted coordinator has a claim by construction')
  if (!(sref.n > 0 && sref.n < n.c)) throw new Error(`the state scope did not narrow the trend: ${sref.n} of ${n.c}`)
  // Window edges: p_days 0, negative and null are all one day, as in section C.
  for (const d of [0, -5, null])
    assertEqual((await db.query(`select * from admin_coordinator_trend(null, $1::int)`, [d])).rows.length, 1,
      `p_days ${d} is a single day`)
  assertEqual((await db.query(`select * from admin_coordinator_trend()`)).rows.length, 30, 'the default window is 30 days')
}))

// The full set of seeded coordinators, and the reference row for each of them,
// computed with `exists`/scalar subqueries rather than section G's joins.
const coordPageRef = async () => {
  const { rows } = await db.query(`
    select p.id, p.full_name, u.email, p.phone, p.created_at,
      (select s.id from schools s where s.coordinator_id = p.id
        order by case s.coordinator_status when 'approved' then 0 when 'pending' then 1
                                           when 'rejected' then 2 else 3 end, s.name, s.id limit 1) school_id,
      (select s.name from schools s where s.coordinator_id = p.id
        order by case s.coordinator_status when 'approved' then 0 when 'pending' then 1
                                           when 'rejected' then 2 else 3 end, s.name, s.id limit 1) school_name,
      (select s.state from schools s where s.coordinator_id = p.id
        order by case s.coordinator_status when 'approved' then 0 when 'pending' then 1
                                           when 'rejected' then 2 else 3 end, s.name, s.id limit 1) state,
      (select s.district from schools s where s.coordinator_id = p.id
        order by case s.coordinator_status when 'approved' then 0 when 'pending' then 1
                                           when 'rejected' then 2 else 3 end, s.name, s.id limit 1) district,
      coalesce((select s.coordinator_status from schools s where s.coordinator_id = p.id
        order by case s.coordinator_status when 'approved' then 0 when 'pending' then 1
                                           when 'rejected' then 2 else 3 end, s.name, s.id limit 1), 'none') claim_status,
      (select count(*)::int from schools s where s.coordinator_id = p.id) schools_claimed,
      (select count(*)::int from user_profiles q where q.role = 'student'
        and q.school_id in (select s.id from schools s where s.coordinator_id = p.id)) students,
      (select count(*)::int from user_profiles q where q.role = 'student'
        and q.school_id in (select s.id from schools s where s.coordinator_id = p.id)
        and exists (select 1 from isc_entry_members m
                     where m.user_id = q.id and (m.is_leader or m.accepted_at is not null))) students_entered
    from user_profiles p left join auth.users u on u.id = p.id
    where p.role = 'coordinator'`)
  return new Map(rows.map((r) => [r.id, r]))
}

CHECKS.push(() => check('admin_coordinators_page pages are lossless and totally ordered', async () => {
  const ref = await coordPageRef()
  const ids = [...ref.keys()]
  const n = ids.length
  if (n < 8) throw new Error(`only ${n} coordinators seeded, too few to page through`)
  // Five or six pages per sort: enough boundaries to catch a lost row, few enough
  // that four walks stay affordable at 200k students (each page recomputes the
  // students-per-coordinator aggregate, which is what the default sort needs).
  const size = Math.max(2, Math.ceil(n / 5))
  const cmp = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1 } return 0 }
  const KEY = {
    students_desc: (r) => [-Number(r.students), r.id],
    students_asc: (r) => [Number(r.students), r.id],
    joined_desc: (r) => [-new Date(r.joined_at).getTime(), -Number(r.students), r.id],
  }
  for (const sort of ['students_desc', 'students_asc', 'name_asc', 'joined_desc', 'nonsense', null]) {
    const seen = [], rows = []
    let page = 1
    for (; page <= 40; page++) {
      const { rows: got } = await db.query(
        `select * from admin_coordinators_page(p_sort => $1::text, p_page => $2, p_size => $3)`, [sort, page, size])
      if (!got.length) break
      if (page * size <= n && got.length !== size)
        throw new Error(`${sort}: page ${page} of ${size} came back with ${got.length} rows`)
      for (const r of got) { seen.push(r.id); rows.push(r); assertEqual(Number(r.total), n, `${sort}: total on page ${page}`) }
    }
    if (page > 40) throw new Error(`${sort}: paging did not terminate`)
    assertEqual(new Set(seen).size, seen.length, `${sort}: no coordinator appeared on two pages`)
    assertEqual([...seen].sort(), [...ids].sort(), `${sort}: the walk is exactly the coordinator list`)
    // Strictly increasing on the sort key across every page boundary. That, and
    // not "the pages did not overlap", is what proves the order is TOTAL.
    const key = KEY[sort] || KEY.students_desc
    if (sort !== 'name_asc') {
      for (let i = 1; i < rows.length; i++)
        if (!(cmp(key(rows[i - 1]), key(rows[i])) < 0))
          throw new Error(`${sort}: rows ${i - 1} and ${i} are not in strict order: ${JSON.stringify([key(rows[i - 1]), key(rows[i])])}`)
    }
    // ...and the leading key must actually tie somewhere, or the id tie-break was
    // never exercised.
    if (sort === 'students_desc' || sort === 'students_asc' || !sort) {
      const distinct = new Set(rows.map((r) => Number(r.students))).size
      if (!(distinct < rows.length)) throw new Error(`no students ties in ${rows.length} coordinators, so the tie-break is untested`)
    }
    // One page past the end is empty, not a repeat of the last page.
    assertEqual((await db.query(`select * from admin_coordinators_page(p_sort => $1::text, p_page => $2, p_size => $3)`,
      [sort, page + 2, size])).rows.length, 0, `${sort}: a page past the end is empty`)
  }
  // name_asc is compared against an ORDER BY run by Postgres itself: JS string
  // comparison is not the database's collation, and asserting it here would be
  // asserting the wrong thing. The exact name order is pinned by the fixture
  // check, whose names differ in their first letter.
  const walk = []
  for (let page = 1; page <= 40; page++) {
    const { rows } = await db.query(`select id from admin_coordinators_page(p_sort => 'name_asc', p_page => $1, p_size => $2)`, [page, size])
    if (!rows.length) break
    walk.push(...rows.map((r) => r.id))
  }
  const { rows: nameRef } = await db.query(`
    select p.id from user_profiles p
    left join (select s.coordinator_id cid, count(*) n from schools s
               join user_profiles q on q.school_id = s.id and q.role = 'student'
               where s.coordinator_id is not null group by 1) r on r.cid = p.id
    where p.role = 'coordinator'
    order by lower(coalesce(p.full_name, '')), coalesce(r.n, 0) desc, p.id`)
  assertEqual(walk, nameRef.map((r) => r.id), 'name_asc walks the same order as a single-shot ORDER BY')
  // The three named sorts must not all agree, or three of these walks proved one thing.
  const first = {}
  for (const sort of ['students_desc', 'students_asc', 'name_asc', 'joined_desc'])
    first[sort] = (await db.query(`select id from admin_coordinators_page(p_sort => $1, p_size => 1)`, [sort])).rows[0].id
  if (new Set(Object.values(first)).size < 3)
    throw new Error(`the four sorts return nearly the same first row: ${JSON.stringify(first)}`)
}))

CHECKS.push(() => check('admin_coordinators_page: filters, caps and row contents', async () => {
  const ref = await coordPageRef()
  const n = ref.size
  const total = async (args, params = []) => {
    const { rows } = await db.query(`select * from admin_coordinators_page(${args})`, params)
    return rows.length ? Number(rows[0].total) : 0
  }
  assertEqual(await total(`p_size => 1`), n, 'unfiltered total')
  // Claim status: each of the four, each against a count of the reference map,
  // each strictly between 0 and everything, and all four adding to the total.
  let statusSum = 0
  for (const st of ['approved', 'pending', 'rejected', 'none']) {
    const want = [...ref.values()].filter((r) => r.claim_status === st).length
    const got = await total(`p_status => $1, p_size => 1`, [st])
    assertEqual(got, want, `p_status => ${st}`)
    if (!(want > 0 && want < n)) throw new Error(`p_status => ${st} matched ${want} of ${n}, so it proves nothing`)
    statusSum += got
    const { rows } = await db.query(`select * from admin_coordinators_page(p_status => $1, p_size => 200)`, [st])
    for (const r of rows) if (r.claim_status !== st) throw new Error(`p_status => ${st} returned a ${r.claim_status} row`)
  }
  assertEqual(statusSum, n, 'the four claim statuses partition every coordinator')
  assertEqual(await total(`p_status => 'no_such_status', p_size => 1`), 0, 'an unknown status matches nothing')
  // State: matches a reference, narrows, and drops the claim-less coordinators
  // (a coordinator has no state until they claim one).
  const { rows: [st] } = await db.query(`select state, count(*)::int c from schools where coordinator_id is not null group by 1 order by 2 desc, 1 limit 1`)
  const wantState = [...ref.values()].filter((r) => r.state === st.state).length
  assertEqual(await total(`p_state => $1, p_size => 1`, [st.state]), wantState, `p_state => ${st.state}`)
  if (!(wantState > 0 && wantState < n)) throw new Error(`p_state matched ${wantState} of ${n}`)
  const { rows: scoped } = await db.query(`select * from admin_coordinators_page(p_state => $1, p_size => 200)`, [st.state])
  for (const r of scoped) {
    if (r.state !== st.state) throw new Error(`p_state => ${st.state} returned a ${r.state} row`)
    if (r.school_id === null) throw new Error('a claim-less coordinator was returned under a state filter')
  }
  assertEqual(await total(`p_state => 'Nowhereland', p_size => 1`), 0, 'an unknown state matches nothing')
  // Search: name, email and school name, each on its own.
  const sample = [...ref.values()].find((r) => r.school_name && r.email)
  for (const [label, q, want] of [
    ['name', 'coordinator 1', [...ref.values()].filter((r) => (r.full_name || '').toLowerCase().includes('coordinator 1')).length],
    ['email', sample.email, [...ref.values()].filter((r) => (r.email || '').toLowerCase() === sample.email.toLowerCase()).length],
    ['school name', sample.school_name, [...ref.values()].filter((r) => (r.school_name || '').toLowerCase().includes(sample.school_name.toLowerCase())).length],
  ]) {
    const got = await total(`p_q => $1, p_size => 1`, [q])
    assertEqual(got, want, `p_q by ${label} (${q})`)
    if (!(want > 0 && want < n)) throw new Error(`p_q by ${label} matched ${want} of ${n}, so it proves nothing`)
  }
  assertEqual(await total(`p_q => '  COORDINATOR 1  ', p_size => 1`),
    await total(`p_q => 'coordinator 1', p_size => 1`), 'the query is trimmed and case-folded')
  assertEqual(await total(`p_q => '   ', p_size => 1`), n, 'a blank query is not a filter')
  // Filters AND together.
  const both = await total(`p_q => 'coordinator 1', p_status => 'approved', p_size => 1`)
  const wantBoth = [...ref.values()].filter((r) => (r.full_name || '').toLowerCase().includes('coordinator 1') && r.claim_status === 'approved').length
  assertEqual(both, wantBoth, 'q AND status')
  if (!(both > 0 && both < await total(`p_q => 'coordinator 1', p_size => 1`))) throw new Error('adding a status did not narrow the search')
  // Row contents, against the reference map.
  const { rows } = await db.query(`select * from admin_coordinators_page(p_size => 200)`)
  if (rows.length < 8) throw new Error('too few rows to check contents')
  for (const r of rows) {
    const w = ref.get(r.id)
    if (!w) throw new Error(`${r.id} is not a coordinator`)
    assertEqual([r.full_name, r.email, r.phone, r.school_id, r.school_name, r.state, r.district, r.claim_status,
      Number(r.schools_claimed), Number(r.students), Number(r.students_entered), String(r.joined_at)],
      [w.full_name, w.email, w.phone, w.school_id, w.school_name, w.state, w.district, w.claim_status,
        w.schools_claimed, w.students, w.students_entered, String(w.created_at)], `row ${r.id}`)
  }
  // schools_claimed is what stops "4 students" beside one school name from being
  // read as that school's roll when the person holds four. On this seed it is 1
  // for everyone with a claim and 0 for everyone without; the two- and two-STATE
  // cases are built by the fixture.
  for (const r of rows)
    if (Number(r.schools_claimed) !== (r.school_id === null ? 0 : 1))
      throw new Error(`schools_claimed ${r.schools_claimed} with school_id ${r.school_id} on ${r.id}`)
  if (!rows.some((r) => Number(r.schools_claimed) === 1))
    throw new Error('no claimed coordinator on the page, so schools_claimed proves nothing')
  // The 0 case is asserted on the claim-less rows below, which are fetched by
  // status: they have no students, so page 1 of students_desc never holds one at
  // any real scale.
  // The claim-less rows are listed, with nulls and zeros rather than dropped.
  // Fetched by status, not taken from page 1: they have 0 students, so under the
  // default students_desc sort they are on the LAST page at any real scale.
  const bare = (await db.query(`select * from admin_coordinators_page(p_status => 'none', p_size => 200)`)).rows
  if (!bare.length) throw new Error('no claim-less coordinator at all, so the left joins are untested')
  for (const r of bare) {
    const w = ref.get(r.id)
    if (!w) throw new Error(`${r.id} is not a coordinator`)
    assertEqual([r.full_name, r.email, r.phone, String(r.joined_at)],
      [w.full_name, w.email, w.phone, String(w.created_at)], `claim-less row contents ${r.id}`)
  }
  for (const r of bare)
    assertEqual([r.school_id, r.school_name, r.state, r.district, Number(r.schools_claimed),
      Number(r.students), Number(r.students_entered)],
      [null, null, null, null, 0, 0, 0], `claim-less row ${r.id}`)
  // ...and the entered count is a strict subset of the reach somewhere, or a
  // function returning `students` twice would pass.
  if (!rows.some((r) => Number(r.students_entered) < Number(r.students) && Number(r.students) > 0))
    throw new Error('every coordinator has entered == students, so students_entered proves nothing')
  if (!rows.some((r) => Number(r.students_entered) > 0)) throw new Error('nobody has entered at all')
  // Caps and page edges, exactly as sections D and E. The 200 cap itself is
  // asserted in the next check, which seeds enough coordinators for it to bite:
  // there are fewer than 200 in this database at the default scale, so
  // `p_size => 5000` returning everything would prove nothing here.
  const cnt = async (args, params = []) => (await db.query(`select * from admin_coordinators_page(${args})`, params)).rows.length
  assertEqual(await cnt(`p_size => 0`), 1, 'p_size 0 becomes 1')
  assertEqual(await cnt(`p_size => -7`), 1, 'a negative p_size becomes 1')
  // A NULL p_size is the DEFAULT (50), not 1 -- `least(greatest(coalesce(p_size,
  // 50), 1), 200)` coalesces before it clamps. Asserted as "the same rows as 50"
  // rather than "50 rows", which would be wrong wherever fewer than 50 match.
  assertEqual((await db.query(`select id from admin_coordinators_page(p_size => null::int)`)).rows.map((r) => r.id),
    (await db.query(`select id from admin_coordinators_page(p_size => 50)`)).rows.map((r) => r.id),
    'a null p_size is the default 50, not 1')
  const p1 = (await db.query(`select id from admin_coordinators_page(p_page => 1, p_size => 3)`)).rows.map((r) => r.id)
  for (const page of [0, -5, null])
    assertEqual((await db.query(`select id from admin_coordinators_page(p_page => $1::int, p_size => 3)`, [page])).rows.map((r) => r.id),
      p1, `page ${page} is page 1`)
  assertEqual(await cnt(`p_page => 2000000000, p_size => 200`), 0, 'an absurd page number is empty, not an error')
}))

CHECKS.push(() => check('admin_coordinators_page: the 200 cap is enforced inside the function', async () => {
  // 205 coordinators in one transaction, because the cap cannot be tested
  // against a database that holds fewer than 200 of them -- and at the default
  // scale it holds 33, so `p_size => 5000` returns everything either way and the
  // obvious assertion passes on an uncapped function. (It does: this exact
  // mutation escaped the first version of this file.)
  //
  // The second half is the bug that matters. Clamping the LIMIT but computing
  // the OFFSET from the caller's number puts page 2 at offset 5000 and returns
  // nothing, so every page after the first becomes unreachable while page 1
  // still looks right.
  const C = (n) => `ece00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  await db.exec('begin')
  try {
    // The names run BACKWARDS against the ids on purpose. All 205 rows have 0
    // students and no claim, so the entire page is one tie and only the `id`
    // tie-break decides it -- and because name order is the reverse of id order,
    // a tie-break replaced by the name (or by anything correlated with it) comes
    // back visibly reversed rather than plausibly shuffled.
    const rows = Array.from({ length: 205 }, (_, i) => [C(i), 'coordinator', `Gvcap ${String(204 - i).padStart(3, '0')}`])
    await db.query(`insert into user_profiles (id, role, full_name) values ${
      rows.map((_, j) => `($${j * 3 + 1},$${j * 3 + 2},$${j * 3 + 3})`).join(',')}`, rows.flat())
    const q = async (args) => (await db.query(`select * from admin_coordinators_page(p_q => 'gvcap', ${args})`)).rows
    const wide = await q(`p_size => 5000`)
    assertEqual(wide.length, 200, 'p_size 5000 gives 200 rows')
    assertEqual(wide.map((r) => r.id), Array.from({ length: 200 }, (_, i) => C(i)),
      'a page that is entirely one tie comes back in id order')
    assertEqual(Number(wide[0].total), 205, 'total is the whole match set, not the page')
    assertEqual(wide.map((r) => r.id), (await q(`p_size => 200`)).map((r) => r.id), 'an over-large p_size behaves exactly like 200')
    const two = await q(`p_size => 5000, p_page => 2`)
    assertEqual(two.length, 5, 'page 2 of an over-large p_size is reachable and holds the remaining 5')
    assertEqual(two.map((r) => r.id), Array.from({ length: 5 }, (_, i) => C(200 + i)), 'and holds the LAST five in id order')
    assertEqual(two.map((r) => r.id), (await q(`p_size => 200, p_page => 2`)).map((r) => r.id), 'page 2 is the same page either way')
    assertEqual(new Set(wide.concat(two).map((r) => r.id)).size, 205, 'the two pages together are all 205, none repeated')
  } finally { await db.exec('rollback') }
  assertEqual((await db.query(`select count(*)::int n from user_profiles where full_name like 'Gvcap%'`)).rows[0].n, 0, 'the fixture was rolled back')
}))

CHECKS.push(() => check('admin_coordinator_detail', async () => {
  const ids = (await db.query(`
    (select coordinator_id id from schools where coordinator_status = 'approved' order by id limit 1)
    union all (select coordinator_id from schools where coordinator_status = 'pending' order by id limit 1)
    union all (select coordinator_id from schools where coordinator_status = 'rejected' order by id limit 1)
    union all (select p.id from user_profiles p where p.role = 'coordinator'
                and not exists (select 1 from schools s where s.coordinator_id = p.id) order by p.id limit 1)`)).rows
  assertEqual(ids.length, 4, 'the seed offers an approved, a pending, a rejected and a claim-less coordinator')
  let sawSchool = false, sawEntries = false
  for (const { id } of ids) {
    const { rows: [{ v }] } = await db.query(`select admin_coordinator_detail($1) v`, [id])
    if (!v) throw new Error(`no detail for ${id}`)
    const { rows: [ref] } = await db.query(`select
      p.full_name, p.phone, p.created_at, p.onboarding_completed, u.email,
      (select count(*)::int from schools s where s.coordinator_id = p.id) schools_claimed,
      (select count(*)::int from user_profiles q where q.role = 'student'
        and q.school_id in (select s.id from schools s where s.coordinator_id = p.id)) students,
      (select count(*)::int from user_profiles q where q.role = 'student'
        and q.school_id in (select s.id from schools s where s.coordinator_id = p.id)
        and exists (select 1 from isc_entry_members m where m.user_id = q.id
                     and (m.is_leader or m.accepted_at is not null))) students_entered,
      (select count(*)::int from isc_entries e
        where e.school_id in (select s.id from schools s where s.coordinator_id = p.id)) entries,
      (select count(*)::int from isc_entries e
        where e.school_id in (select s.id from schools s where s.coordinator_id = p.id)
          and e.status = 'submitted') submitted
      from user_profiles p left join auth.users u on u.id = p.id where p.id = $1`, [id])
    assertEqual([v.full_name, v.email, v.phone, v.onboarding_completed, v.schools_claimed,
      v.students, v.students_entered, v.entries, v.submitted],
      [ref.full_name, ref.email, ref.phone, ref.onboarding_completed, ref.schools_claimed,
        ref.students, ref.students_entered, ref.entries, ref.submitted], `detail ${id}`)
    assertEqual(new Date(v.joined_at).getTime(), new Date(ref.created_at).getTime(), `detail ${id} joined_at`)
    assertEqual(v.entered_pct, ref.students === 0 ? 0 : Math.round((1000 * ref.students_entered) / ref.students) / 10,
      `detail ${id} entered_pct`)
    if (!(v.entered_pct >= 0 && v.entered_pct <= 100)) throw new Error(`entered_pct out of range: ${v.entered_pct}`)
    // by_track counts ENTRIES, so it sums to `entries` exactly -- unlike
    // admin_isc_summary.by_track, which counts distinct students.
    assertEqual(v.by_track.reduce((a, t) => a + t.count, 0), ref.entries, `detail ${id} by_track sums to entries`)
    for (const t of v.by_track)
      if (typeof t.key !== 'string' || typeof t.count !== 'number') throw new Error(`bad by_track item ${JSON.stringify(t)}`)
    if (ref.schools_claimed === 0) {
      assertEqual([v.school, v.students, v.entries, v.by_track], [null, 0, 0, []], 'a claim-less coordinator')
    } else {
      sawSchool = true
      const { rows: [s] } = await db.query(`select s.id, s.name, s.state, s.district, s.review_status,
        s.coordinator_status, s.coordinator_notes, s.board from schools s where s.coordinator_id = $1
        order by case s.coordinator_status when 'approved' then 0 when 'pending' then 1
                                           when 'rejected' then 2 else 3 end, s.name, s.id limit 1`, [id])
      assertEqual([v.school.id, v.school.name, v.school.state, v.school.district, v.school.review_status,
        v.school.claim_status, v.school.notes, v.school.board],
        [s.id, s.name, s.state, s.district, s.review_status, s.coordinator_status, s.coordinator_notes, s.board],
        `detail ${id} school`)
    }
    if (ref.entries > 0) sawEntries = true
  }
  if (!sawSchool || !sawEntries) throw new Error('the sample never exercised a school or an entry')
  // Not a coordinator -> SQL NULL, not an object and not an exception.
  const { rows: [unknown] } = await db.query(`select admin_coordinator_detail('00000000-0000-4000-8000-000000000000') v`)
  assertEqual(unknown.v, null, 'an unknown id returns null')
  const { rows: [stu] } = await db.query(
    `select admin_coordinator_detail((select id from user_profiles where role = 'student' order by id limit 1)) v`)
  assertEqual(stu.v, null, 'a student id returns null, not a half-filled coordinator')
  assertEqual((await db.query(`select admin_coordinator_detail(null) v`)).rows[0].v, null, 'a null id returns null')
}))

CHECKS.push(() => check('coordinator analytics on a hand-computed fixture', async () => {
  // Everything the seeded data cannot show, in one small world whose every
  // number was worked out by hand: a coordinator holding TWO claims, one holding
  // claims in two STATES, a coordinator with no auth.users row, a coordinator
  // whose own profile carries a school_id and a WRONG school_state, an approved
  // claim on a school with no students, an APPROVED STATUS WITH NO COORDINATOR,
  // a pending invitee at a covered school (not entered), and a student who
  // competes on another school's team (entered, for their own school).
  const S = (n) => `e8e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const U = (n) => `e9e00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const P = (n) => `eae00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const E = (n) => `ebe00000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const D1 = 'Gvland District 1', D2 = 'Gvland District 2'
  await db.exec('begin')
  try {
    // C1 holds S1 and S5, both approved, in two DISTRICTS. C6 holds S10 and S11,
    // both approved, in two STATES. C2 pending, C3 rejected, C5 approved on an
    // empty school, C4 nothing at all and no auth row either.
    //
    // C1's own profile carries school_id = S1 and a school_state that is a lie
    // ('Gvwrong'). Both are load-bearing: the school_id makes a reach join that
    // forgot `role = 'student'` count the coordinator as one of their own pupils,
    // and the wrong state makes any function that took a coordinator's geography
    // from user_profiles instead of from the claimed school visibly wrong rather
    // than merely unproven.
    await db.query(`insert into user_profiles (id, role, full_name, phone, created_at, school_id, school_state, school_district) values
      ($1,'coordinator','Gvcoord Zulu',   '7770000001', current_date - 1 + interval '3 hours', $7, 'Gvwrong', 'Gvwrong District 1'),
      ($2,'coordinator','Gvcoord Yankee', '7770000002', current_date - 1 + interval '5 hours', null, null, null),
      ($3,'coordinator','Gvcoord Xray',   '7770000003', current_date - 1 + interval '1 hour',  null, null, null),
      ($4,'coordinator','Gvcoord Whiskey','7770000004', current_date - 1 + interval '4 hours', null, null, null),
      ($5,'coordinator','Gvcoord Victor', '7770000005', current_date - 1 + interval '2 hours', null, null, null),
      ($6,'coordinator','Gvcoord Uniform','7770000006', current_date - 1 + interval '6 hours', null, null, null),
      ($8,'coordinator','Gvcoord Tango',  '7770000007', current_date - 1 + interval '7 hours', null, null, null)`,
      [U(1), U(2), U(3), U(4), U(5), U(6), S(1), U(7)])
    await db.query(`insert into auth.users (id, email) values
      ($1,'zulu@gv.test'), ($2,'yankee@gv.test'), ($3,'xray@gv.test'), ($4,'victor@gv.test'),
      ($5,'uniform@gv.test'), ($6,'tango@gv.test')`,
      [U(1), U(2), U(3), U(5), U(6), U(7)])
    // Postgres cannot infer the type of a bind parameter that appears in no
    // expression, so every parameter here is used at least once.
    //
    // S9 is the row section F probe 8 tells the founder to hunt for: status
    // 'approved' with NO coordinator_id. It is NOT covered — nobody is running
    // it — and its two students are uncovered. admin_dashboard, which reads the
    // status alone, would count it; section G, which requires both halves, does
    // not, and that is the disagreement probe 8 exists to explain.
    await db.query(`insert into schools (id, name, state, district, review_status, coordinator_id, coordinator_status, coordinator_notes) values
      ($1, 'Gv Approved One',   'Gvland',$7,'approved',$9,  'approved','looks legitimate'),
      ($2, 'Gv Pending',        'Gvland',$7,'approved',$10, 'pending', null),
      ($3, 'Gv Rejected',       'Gvland',$7,'approved',$11, 'rejected','not the head teacher'),
      ($4, 'Gv Unclaimed',      'Gvland',$7,'approved',null,'none',    null),
      ($5, 'Gv Approved Two',   'Gvland',$8,'approved',$9,  'approved',null),
      ($6, 'Gv Empty',          'Gvland',$8,'approved',$12, 'approved',null),
      ($13,'Gv Orphan Approval','Gvland',$7,'approved',null,'approved','approved, but nobody is attached'),
      ($14,'Gv Split Home',     'Gvland',$8,'approved',$15, 'approved',null),
      ($16,'Zz Far Away',       'Gvfar', 'Gvfar District 1','approved',$15,'approved',null),
      -- C7 exists so the state's per-coordinator population is EVEN (six people:
      -- 0, 1, 2, 3, 3, 10 students), which is the only shape that tells
      -- percentile_cont from percentile_disc -- 2.5 against 2.
      ($19,'Gv Late',           'Gvland',$8,'approved',$20, 'rejected','applied after the deadline'),
      -- A whole state nobody has claimed: it must still get a breakdown row.
      ($17,'Gvbare One','Gvbare','Gvbare District 1','approved',null,'none',null),
      ($18,'Gvbare Two','Gvbare','Gvbare District 1','approved',null,'none',null)`,
      [S(1), S(2), S(3), S(4), S(5), S(6), D1, D2, U(1), U(2), U(3), U(5),
       S(9), S(10), U(6), S(11), S(7), S(8), S(12), U(7)])
    const students = []
    const add = (n, school, district, state = 'Gvland') =>
      students.push([P(n), 'student', `Gvpupil ${n}`, 'Class 9', state, district, school])
    for (let i = 1; i <= 4; i++) add(i, S(1), D1)        // S1: 4 students
    for (let i = 5; i <= 7; i++) add(i, S(2), D1)        // S2: 3
    for (let i = 8; i <= 9; i++) add(i, S(3), D1)        // S3: 2
    for (let i = 10; i <= 14; i++) add(i, S(4), D1)      // S4: 5
    for (let i = 15; i <= 20; i++) add(i, S(5), D2)      // S5: 6
    for (let i = 21; i <= 23; i++) add(i, S(7), 'Gvbare District 1', 'Gvbare')
    for (let i = 24; i <= 25; i++) add(i, S(9), D1)      // S9 (orphan approval): 2
    for (let i = 26; i <= 28; i++) add(i, S(10), D2)     // S10: 3
    for (let i = 29; i <= 32; i++) add(i, S(11), 'Gvfar District 1', 'Gvfar')  // S11: 4
    add(33, S(12), D2)                                  // S12 (rejected claim): 1
    await db.query(`insert into user_profiles (id, role, full_name, school_class, school_state, school_district, school_id)
      values ${students.map((_, j) => `($${j * 7 + 1},$${j * 7 + 2},$${j * 7 + 3},$${j * 7 + 4},$${j * 7 + 5},$${j * 7 + 6},$${j * 7 + 7})`).join(',')}`,
      students.flat())
    await db.query(`insert into isc_entries (id, track, school_id, created_by, status, submitted_at, created_at) values
      ($1,'ai_for_impact',   $9, $15,'submitted', current_date - 2, current_date - 2),
      ($2,'entrepreneurship',$12,$16,'draft',     null,             current_date - 1),
      ($3,'ai_for_impact',   $13,$17,'draft',     null,             current_date - 1),
      ($4,'content_creator', $10,$18,'submitted', current_date - 1, current_date - 1),
      ($5,'puzzle_master',   $11,$19,'draft',     null,             current_date - 1),
      ($6,'entrepreneurship',$9, $15,'draft',     null,             current_date - 1),
      ($7,'ai_for_impact',   $14,$20,'draft',     null,             current_date - 1),
      ($8,'puzzle_master',   $21,$22,'draft',     null,             current_date - 1)`,
      [E(1), E(2), E(3), E(4), E(5), E(6), E(7), E(8), S(1), S(2), S(3), S(4), S(5), S(10),
       P(1), P(10), P(15), P(5), P(8), P(26), S(11), P(29)])
    await db.query(`insert into isc_entry_members (entry_id, track, user_id, is_leader, accepted_at) values
      ($1,'ai_for_impact',   $9, true,  current_date - 2),
      ($2,'entrepreneurship',$10,true,  current_date - 1),
      ($2,'entrepreneurship',$11,false, current_date - 1),
      ($2,'entrepreneurship',$12,false, null),
      ($3,'ai_for_impact',   $13,true,  current_date - 1),
      ($3,'ai_for_impact',   $14,false, current_date - 1),
      ($3,'ai_for_impact',   $15,false, current_date - 1),
      ($4,'content_creator', $16,true,  current_date - 1),
      ($4,'content_creator', $17,false, current_date - 1),
      ($4,'content_creator', $18,false, current_date - 1),
      ($4,'content_creator', $19,false, null),
      ($5,'puzzle_master',   $20,true,  current_date - 1),
      ($6,'entrepreneurship',$9, true,  current_date - 1),
      ($7,'ai_for_impact',   $21,true,  current_date - 1),
      ($7,'ai_for_impact',   $22,false, current_date - 1),
      ($8,'puzzle_master',   $23,true,  current_date - 1)`,
      [E(1), E(2), E(3), E(4), E(5), E(6), E(7), E(8), P(1), P(10), P(2), P(11), P(15), P(16), P(17),
       P(5), P(6), P(7), P(3), P(8), P(26), P(27), P(29)])

    // Entered, worked out by hand:
    //   S1  (covered)   P1 leads E1 and E6; P2 is an ACCEPTED member of E2, which
    //                   belongs to S4 -- a different school, and they still count
    //                   for S1. P3 is an invitee on E4 who never accepted, so they
    //                   do NOT. P4 is on nothing.               -> 2 of 4
    //   S2  (pending)   P5 leads E4, P6 and P7 accepted.        -> 3 of 3, uncovered
    //   S3  (rejected)  P8 leads E5, P9 on nothing.             -> 1 of 2, uncovered
    //   S4  (unclaimed) P10 leads E2, P11 never accepted.       -> 1 of 5, uncovered
    //   S5  (covered)   P15 leads E3, P16 and P17 accepted.     -> 3 of 6
    //   S6  (covered)   no students at all.                     -> 0 of 0
    //   S9  (approved, NO coordinator) P24 and P25 on nothing.  -> 0 of 2, uncovered
    //   S10 (covered)   P26 leads E7, P27 accepted, P28 not.    -> 2 of 3
    //   S11 (covered, in Gvfar) P29 leads E8.                   -> 1 of 4
    //   S12 (rejected)  P33 on nothing.                         -> 0 of 1, uncovered
    const v = (await db.query(`select admin_coordinator_summary('Gvland') v`)).rows[0].v
    assertEqual([v.coordinators, v.approved, v.pending, v.rejected], [6, 3, 1, 2],
      'Gvland people: C4 has no claim so is not in a state at all')
    assertEqual([v.schools_total, v.schools_claimed, v.schools_approved, v.schools_uncovered], [9, 7, 4, 5],
      'Gvland schools: pending, rejected AND an approved status with no coordinator are all uncovered')
    assertEqual([v.students_covered, v.students_uncovered, v.students_entered], [13, 13, 7], 'Gvland students')
    assertEqual(v.entered_pct, 53.8, 'Gvland entered_pct is a real percentage, rounded to one decimal')
    // {C1: 10, C2: 3, C3: 2, C5: 0, C6: 3 (their Gvland school only), C7: 1}
    // -> 0, 1, 2, 3, 3, 10 -> (2 + 3) / 2. percentile_disc would say 2.
    assertEqual(v.median_students_per_coordinator, 2.5, 'Gvland median over an EVEN population')
    // The orphan approval, called out on its own: an 'approved' status with no
    // coordinator_id must not cover its two students.
    const noCoord = (await db.query(`select admin_coordinator_summary('Gvland', $1) v`, [D1])).rows[0].v
    assertEqual([noCoord.schools_total, noCoord.schools_claimed, noCoord.schools_approved], [5, 3, 1],  // District 1 is untouched by C7, which claimed in District 2
      'Gvland District 1 schools: the approved-with-nobody row is counted as a school, not as a claim')
    assertEqual([noCoord.coordinators, noCoord.approved, noCoord.pending, noCoord.rejected], [3, 1, 1, 1],
      'Gvland District 1 people')
    assertEqual([noCoord.students_covered, noCoord.students_uncovered, noCoord.students_entered], [4, 12, 2],
      'Gvland District 1 students: the orphan approval\'s two pupils are uncovered')
    assertEqual(noCoord.median_students_per_coordinator, 3, 'Gvland District 1 median over an odd population')
    // ...and District 2, whose population {C1: 6, C5: 0, C6: 3, C7: 1} is even
    // with an integer answer: 0, 1, 3, 6 -> (1 + 3) / 2 = 2, where
    // percentile_disc would say 1.
    const d2v = (await db.query(`select admin_coordinator_summary('Gvland', $1) v`, [D2])).rows[0].v
    assertEqual(d2v.median_students_per_coordinator, 2, 'Gvland District 2 median')
    // A coordinator's geography is their SCHOOL's, never their profile's. C1's
    // profile says Gvwrong and C1 is counted in Gvland, not in Gvwrong.
    const wrong = (await db.query(`select admin_coordinator_summary('Gvwrong') v`)).rows[0].v
    assertEqual([wrong.coordinators, wrong.schools_total, wrong.students_covered], [0, 0, 0],
      'the state on a coordinator\'s own profile is not their state')

    const natRows = (await db.query(`select * from admin_coordinator_breakdown()`)).rows
    const nat = natRows.find((r) => r.key === 'Gvland')
    assertEqual([Number(nat.coordinators), Number(nat.approved), Number(nat.schools_claimed),
      Number(nat.schools_total), Number(nat.students_covered), Number(nat.students_entered)],
      [6, 3, 7, 9, 13, 7], 'the Gvland row of the national breakdown')
    const far = natRows.find((r) => r.key === 'Gvfar')
    assertEqual([Number(far.coordinators), Number(far.approved), Number(far.schools_claimed),
      Number(far.schools_total), Number(far.students_covered), Number(far.students_entered)],
      [1, 1, 1, 1, 4, 1], 'the other state of the two-state coordinator gets its own row')
    // The state nobody has claimed. It is listed, with its schools and its
    // students, and every coordinator column at 0 -- that row IS the answer to
    // "which states have no coverage", so a breakdown that inner-joined the
    // claims would drop exactly the rows the founder is looking for.
    const bare = natRows.find((r) => r.key === 'Gvbare')
    if (!bare) throw new Error('a state with no coordinator vanished from the breakdown')
    assertEqual([Number(bare.coordinators), Number(bare.approved), Number(bare.schools_claimed),
      Number(bare.schools_total), Number(bare.students_covered), Number(bare.students_entered)],
      [0, 0, 0, 2, 0, 0], 'the Gvbare row: two schools, nobody running them')
    const bv = (await db.query(`select admin_coordinator_summary('Gvbare') v`)).rows[0].v
    assertEqual([bv.coordinators, bv.schools_total, bv.schools_claimed, bv.schools_approved, bv.schools_uncovered,
      bv.students_covered, bv.students_uncovered, bv.students_entered, bv.entered_pct, bv.median_students_per_coordinator],
      [0, 2, 0, 0, 2, 0, 3, 0, 0, 0], 'a whole state with no coordinator: three students, none of them covered')
    const di = (await db.query(`select * from admin_coordinator_breakdown('Gvland')`)).rows
    assertEqual(di.map((r) => [r.key, Number(r.coordinators), Number(r.approved), Number(r.schools_claimed),
      Number(r.schools_total), Number(r.students_covered), Number(r.students_entered)]),
      [[D2, 4, 3, 4, 4, 9, 5], [D1, 3, 1, 3, 5, 4, 2]], 'Gvland districts, most covered students first')
    // The documented multi-claim caveat, made visible. C1 holds a school in each
    // district, so BOTH people columns double-count them: the districts add to 7
    // coordinators and 4 approved where the state row says 6 and 3. The three
    // school and student columns are unaffected, because a school belongs to one
    // district whoever claimed it. Section F probe 9 is how the founder finds out
    // whether this is live.
    assertEqual(di.reduce((a, r) => a + Number(r.coordinators), 0), 7, 'a two-claim coordinator is counted in both districts')
    assertEqual(di.reduce((a, r) => a + Number(r.approved), 0), 4, '...and in both districts of the approved column too')
    for (const k of ['schools_claimed', 'schools_total', 'students_covered', 'students_entered'])
      assertEqual(di.reduce((a, r) => a + Number(r[k]), 0), Number(nat[k]), `district ${k} still sums to the state`)

    // The page. p_state isolates the fixture; C4 is excluded because a claim is
    // the only thing that gives a coordinator a state.
    const page = (await db.query(`select * from admin_coordinators_page(p_state => 'Gvland', p_size => 50)`)).rows
    assertEqual(page.map((r) => [r.full_name, Number(r.schools_claimed), Number(r.students),
      Number(r.students_entered), r.school_name, r.district, r.claim_status]),
      [['Gvcoord Zulu', 2, 10, 5, 'Gv Approved One', D1, 'approved'],
       ['Gvcoord Yankee', 1, 3, 3, 'Gv Pending', D1, 'pending'],
       // C6 holds a school in Gvland and one in Gvfar. Under p_state => 'Gvland'
       // BOTH the reach and the entered count stop at the state line, and
       // schools_claimed says 1, not 2 -- otherwise the row would advertise
       // students the filtered page is not showing. It also ties C2 on 3
       // students, so the id tie-break decides the order here.
       ['Gvcoord Uniform', 1, 3, 2, 'Gv Split Home', D2, 'approved'],
       ['Gvcoord Xray', 1, 2, 1, 'Gv Rejected', D1, 'rejected'],
       ['Gvcoord Tango', 1, 1, 0, 'Gv Late', D2, 'rejected'],
       ['Gvcoord Victor', 1, 0, 0, 'Gv Empty', D2, 'approved']],
      'the state page: C1 summed over BOTH their schools, C6 stopped at the state line')
    assertEqual(page.every((r) => Number(r.total) === 6), true, 'total on every row of the state page')
    // ...and nationally the same person carries both schools and both counts.
    const all = (await db.query(`select * from admin_coordinators_page(p_q => 'gvcoord', p_size => 50)`)).rows
    assertEqual(all.map((r) => [r.full_name, Number(r.schools_claimed), Number(r.students), Number(r.students_entered)]),
      [['Gvcoord Zulu', 2, 10, 5], ['Gvcoord Uniform', 2, 7, 3], ['Gvcoord Yankee', 1, 3, 3],
       ['Gvcoord Xray', 1, 2, 1], ['Gvcoord Tango', 1, 1, 0], ['Gvcoord Whiskey', 0, 0, 0],
       ['Gvcoord Victor', 1, 0, 0]],
      'students_desc, with the two zero-student rows broken by id')
    // C1's own profile carries school_id = S1. A reach join that forgot
    // `role = 'student'` would count them as their own eleventh pupil.
    assertEqual(Number(all[0].students), 10, 'a coordinator is not a student of their own school')
    const c4 = all.find((r) => r.full_name === 'Gvcoord Whiskey')
    assertEqual([c4.email, c4.school_id, c4.school_name, c4.state, c4.district, c4.claim_status,
      Number(c4.schools_claimed), Number(c4.students), Number(c4.students_entered)],
      [null, null, null, null, null, 'none', 0, 0, 0], 'a coordinator with no auth row and no claim is still listed')
    const order = async (sort) => (await db.query(
      `select full_name from admin_coordinators_page(p_q => 'gvcoord', p_sort => $1, p_size => 50)`, [sort])).rows.map((r) => r.full_name)
    assertEqual(await order('students_asc'),
      ['Gvcoord Whiskey', 'Gvcoord Victor', 'Gvcoord Tango', 'Gvcoord Xray', 'Gvcoord Yankee',
       'Gvcoord Uniform', 'Gvcoord Zulu'], 'students_asc')
    assertEqual(await order('name_asc'),
      ['Gvcoord Tango', 'Gvcoord Uniform', 'Gvcoord Victor', 'Gvcoord Whiskey', 'Gvcoord Xray',
       'Gvcoord Yankee', 'Gvcoord Zulu'], 'name_asc')
    assertEqual(await order('joined_desc'),
      ['Gvcoord Tango', 'Gvcoord Uniform', 'Gvcoord Yankee', 'Gvcoord Whiskey', 'Gvcoord Zulu',
       'Gvcoord Victor', 'Gvcoord Xray'], 'joined_desc')
    assertEqual(await order('nonsense'), await order('students_desc'), 'an unknown p_sort behaves like students_desc')
    // Paging one row at a time visits the same order.
    const walk = []
    for (let p = 1; p <= 10; p++) {
      const { rows } = await db.query(`select full_name from admin_coordinators_page(p_q => 'gvcoord', p_page => $1, p_size => 1)`, [p])
      if (!rows.length) break
      walk.push(rows[0].full_name)
    }
    assertEqual(walk, await order('students_desc'), 'one row per page visits every coordinator exactly once, in order')

    // Detail: the two-claim coordinator, whose numbers span both schools.
    const dv = (await db.query(`select admin_coordinator_detail($1) v`, [U(1)])).rows[0].v
    assertEqual([dv.schools_claimed, dv.students, dv.students_entered, dv.entered_pct, dv.entries, dv.submitted],
      [2, 10, 5, 50, 3, 1], 'detail sums over every claimed school')
    assertEqual([dv.school.name, dv.school.claim_status, dv.school.notes], ['Gv Approved One', 'approved', 'looks legitimate'],
      'detail shows the strongest claim, with its notes')
    assertEqual(dv.by_track, [{ key: 'ai_for_impact', count: 2 }, { key: 'entrepreneurship', count: 1 }],
      'detail by_track counts ENTRIES and sums to `entries`')
    // The two-STATE coordinator. detail has no scope at all, so it always spans
    // every claim: 3 + 4 students, 2 + 1 entered, one entry at each school.
    const dv6 = (await db.query(`select admin_coordinator_detail($1) v`, [U(6)])).rows[0].v
    assertEqual([dv6.schools_claimed, dv6.students, dv6.students_entered, dv6.entered_pct, dv6.entries, dv6.submitted],
      [2, 7, 3, 42.9, 2, 0], 'detail spans both states, unlike a state-filtered page row')
    assertEqual(dv6.school.name, 'Gv Split Home', 'detail shows the alphabetically first of two equal claims')
    const dv3 = (await db.query(`select admin_coordinator_detail($1) v`, [U(3)])).rows[0].v
    assertEqual([dv3.school.name, dv3.school.claim_status, dv3.school.notes, dv3.students, dv3.students_entered, dv3.entered_pct],
      ['Gv Rejected', 'rejected', 'not the head teacher', 2, 1, 50], 'a rejected claim still has a school and students')
    const dv4 = (await db.query(`select admin_coordinator_detail($1) v`, [U(4)])).rows[0].v
    assertEqual([dv4.email, dv4.school, dv4.schools_claimed, dv4.students, dv4.entered_pct], [null, null, 0, 0, 0],
      'a coordinator with no auth row and no claim')
    const dv5 = (await db.query(`select admin_coordinator_detail($1) v`, [U(5)])).rows[0].v
    assertEqual([dv5.school.name, dv5.students, dv5.students_entered, dv5.entered_pct, dv5.entries, dv5.by_track],
      ['Gv Empty', 0, 0, 0, 0, []], 'an approved claim on a school with no students')

    // The trend, scoped so only the fixture is in it. All seven signed up
    // yesterday; C4 has no claim and therefore no state, so the scoped series
    // sees six people, six claims and three approvals.
    const tr = (await db.query(`select * from admin_coordinator_trend('Gvland', 3)`)).rows
    assertEqual(tr.map((r) => [Number(r.coordinators), Number(r.cohort_claimed), Number(r.cohort_approved)]),
      [[0, 0, 0], [6, 6, 3], [0, 0, 0]], 'Gvland trend, oldest day first')
  } finally { await db.exec('rollback') }
  assertEqual((await db.query(`select count(*)::int n from schools where state in ('Gvland', 'Gvbare', 'Gvfar')`)).rows[0].n, 0, 'the fixture was rolled back')
  assertEqual((await db.query(`select count(*)::int n from user_profiles where full_name like 'Gvcoord%'`)).rows[0].n, 0, 'the coordinators were rolled back')
}))

CHECKS.push(() => check('section G reads through the indexes', async () => {
  // Raw table queries, never a call to a section G function: EXPLAIN of a plpgsql
  // call prints only "Function Scan" and would prove nothing.
  const { rows: [c] } = await db.query(`select coordinator_id cid, id sid from schools where coordinator_id is not null order by id limit 1`)
  // The per-coordinator reach, which is what `students` and the default sort are.
  await assertIndexScan(`select count(*) from schools sx
    join user_profiles px on px.school_id = sx.id and px.role = 'student'
    where sx.coordinator_id = $1`, [c.cid], 'user_profiles')
  // students_entered, run once per row of a page: 50 sequential scans of 1.2M
  // member rows is exactly what this must not become.
  await assertIndexScan(`select count(*) from user_profiles px
    where px.school_id = $1 and px.role = 'student'
      and exists (select 1 from isc_entry_members m
                   where m.user_id = px.id and (m.is_leader or m.accepted_at is not null))`,
    [c.sid], 'isc_entry_members')
  // schools is small enough at every scale here that a sequential scan really is
  // cheaper, so whether the planner PICKS schools_coordinator_idx is a costing
  // question. Whether it CAN is the thing that must not rot -- the same
  // reasoning as the trigram check above.
  await db.exec('set enable_seqscan = off')
  try {
    const { rows } = await db.query(`explain select s.id from schools s where s.coordinator_id = $1`, [c.cid])
    const plan = rows.map((r) => Object.values(r)[0]).join('\n')
    if (!/schools_coordinator_idx/.test(plan))
      throw new Error(`the claim lookup cannot use schools_coordinator_idx:\n${plan}`)
  } finally { await db.exec('set enable_seqscan = on') }
  const { rows: [idx] } = await db.query(
    `select count(*)::int n from pg_indexes where schemaname = 'public' and indexname = 'schools_coordinator_idx'`)
  assertEqual(idx.n, 1, 'section G creates schools_coordinator_idx')
  // The honest counterpart, written out as the function actually runs it, so
  // nobody reads the three assertions above as a promise the directory is
  // index-backed. Two things are true of it at EVERY scale, and one thing that
  // looks similar is not -- see below.
  const { rows: real } = await db.query(`explain
    select p.id, count(*) over () from user_profiles p
    left join auth.users u on u.id = p.id
    left join (select distinct on (coordinator_id) coordinator_id cid, id sid, name from schools
               where coordinator_id is not null order by coordinator_id, name, id) c on c.cid = p.id
    left join (select s.coordinator_id cid, count(*) students from schools s
               join user_profiles q on q.school_id = s.id and q.role = 'student'
               where s.coordinator_id is not null group by s.coordinator_id) r on r.cid = p.id
    where p.role = 'coordinator'
      and (lower(coalesce(p.full_name, '')) like '%coordinator 1%'
           or lower(coalesce(u.email, '')) like '%coordinator 1%'
           or lower(coalesce(c.name, '')) like '%coordinator 1%')
    order by coalesce(r.students, 0) desc, p.id limit 50`)
  const plan = real.map((r) => Object.values(r)[0]).join('\n')
  // (1) The students-per-coordinator aggregate reads EVERY student row. That is
  // structural, not a costing accident: `students` is the default sort key and
  // `total` counts the whole match set, so both have to be known before the
  // LIMIT. It is the page's cost, and it is the reason `students_entered` is
  // computed after the LIMIT instead of joining a second time here.
  if (!/Seq Scan on user_profiles\b/.test(plan))
    throw new Error(`the students-per-coordinator aggregate no longer reads every student row -- good news, but update this check and the PERFORMANCE note above admin_coordinators_page in section G:\n${plan}`)
  // (2) The search stays a FILTER. p_q ORs a name on user_profiles, an email on
  // auth.users and a school name on schools; a BitmapOr cannot span three tables,
  // so no trigram index is reachable however many exist -- the same finding as
  // admin_users_page, and the same remedy (get every searched value onto one
  // table). Asserted on the plan's own Filter line rather than on a scan type,
  // which is what makes it hold at every scale.
  const filterLine = plan.split('\n').find((l) => /Filter:/.test(l) && /~~/.test(l))
  if (!filterLine || !/full_name/.test(filterLine) || !/email/.test(filterLine) || !/c\.name/.test(filterLine))
    throw new Error(`the three-branch search is no longer one filter over the join -- good news, but update this check, the PERFORMANCE note above admin_coordinators_page in section G and section F item 6(d):\n${plan}`)
  if (/_trgm/.test(plan))
    throw new Error(`a trigram index became reachable from the coordinators-page search:\n${plan}`)
  // (3) What is NOT true, and was wrongly claimed here until the review caught
  // it at target scale: auth.users is not read whole. Unlike admin_users_page,
  // this query carries a highly selective `role = 'coordinator'` (807 of 210,807
  // profiles at target scale), so the planner is free to walk
  // user_profiles_role_idx and probe users_pkey once per coordinator -- which it
  // does at 200k, while at the default scale it hashes the tiny table instead.
  // Both plans are fine and neither is asserted; asserting a sequential scan on
  // auth.users made this check fail at target scale for a plan that was better
  // than the one documented.
}))

CHECKS.push(() => check('section G is admin only', async () => {
  // Every one of these reads children's records by way of their school. A
  // non-admin must get an exception, never an empty result a caller could read
  // as "no coordinators".
  await db.exec(`create or replace function is_admin() returns boolean language sql as $x$ select false $x$`)
  try {
    for (const sql of [
      `select admin_coordinator_summary()`,
      `select * from admin_coordinator_breakdown()`,
      `select * from admin_coordinator_trend()`,
      `select * from admin_coordinators_page()`,
      // ...including an id that does not exist: the gate must come FIRST, or a
      // non-admin gets a silent null back and learns the function is there.
      `select admin_coordinator_detail('00000000-0000-4000-8000-000000000000')`,
      `select admin_coordinator_detail(null)`,
    ]) {
      let raised = null
      try { await db.query(sql) } catch (e) { raised = e.message }
      assertEqual(raised, 'admin only', `${sql} must refuse a non-admin`)
    }
  } finally {
    await db.exec(`create or replace function is_admin() returns boolean language sql as $x$ select true $x$`)
  }
}))

CHECKS.push(() => check('section G survives a second apply', async () => {
  // `create or replace function` only REPLACES when the signature matches to the
  // argument type; a changed parameter would leave TWO functions of the name and
  // every call would fail with "function is not unique". The index is
  // `if not exists`, so a second apply must leave exactly one of that too.
  await db.exec(MIGRATION_SQL)
  const names = ['admin_coordinator_breakdown', 'admin_coordinator_detail', 'admin_coordinator_summary',
    'admin_coordinator_trend', 'admin_coordinators_page'].sort()
  const { rows } = await db.query(
    `select proname, count(*)::int n from pg_proc where proname = any($1) group by 1 order by 1`, [names])
  assertEqual(rows.map((r) => [r.proname, r.n]), names.map((n) => [n, 1]), 'exactly one function of each name after a second apply')
  const { rows: [idx] } = await db.query(
    `select count(*)::int n from pg_indexes where schemaname = 'public' and indexname = 'schools_coordinator_idx'`)
  assertEqual(idx.n, 1, 'exactly one schools_coordinator_idx after a second apply')
  // ...and the numbers are still the same ones.
  const v = (await db.query(`select admin_coordinator_summary() v`)).rows[0].v
  assertSummaryMatches(v, await coordRef(), 'national after a second apply')
  for (const sql of [`select * from admin_coordinator_breakdown()`, `select * from admin_coordinator_trend()`,
    `select * from admin_coordinators_page(p_size => 1)`,
    `select admin_coordinator_detail((select coordinator_id from schools where coordinator_id is not null order by id limit 1))`])
    await db.query(sql)
}))

// Bare calls, nothing else in the timing: this is what the founder's page waits for.
CHECKS.push(() => check('TIMING admin_coordinator_summary() national', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_coordinator_summary() v`)
  if (!v || v.coordinators === undefined) throw new Error('no summary')
}))
CHECKS.push(() => check('TIMING admin_coordinator_summary() one state', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_coordinator_summary('Haryana') v`)
  if (!v || !(v.schools_total > 0)) throw new Error('no rows in Haryana')
}))
CHECKS.push(() => check('TIMING admin_coordinator_breakdown() national', async () => {
  const { rows } = await db.query(`select * from admin_coordinator_breakdown()`)
  if (!rows.length) throw new Error('no breakdown rows')
}))
CHECKS.push(() => check('TIMING admin_coordinator_trend() 30 days', async () => {
  const { rows } = await db.query(`select * from admin_coordinator_trend()`)
  assertEqual(rows.length, 30, 'default window is 30 days')
}))
CHECKS.push(() => check('TIMING admin_coordinators_page() page 1', async () => {
  const { rows } = await db.query(`select * from admin_coordinators_page(p_size => 50)`)
  if (!rows.length) throw new Error('no rows')
}))
CHECKS.push(() => check('TIMING admin_coordinators_page() search', async () => {
  const { rows } = await db.query(`select * from admin_coordinators_page(p_q => 'coordinator 1', p_size => 50)`)
  if (!rows.length) throw new Error('no rows')
}))
CHECKS.push(() => check('TIMING admin_coordinator_detail()', async () => {
  const { rows: [{ v }] } = await db.query(
    `select admin_coordinator_detail((select coordinator_id from schools where coordinator_id is not null order by id limit 1)) v`)
  if (!v) throw new Error('no detail')
}))

// ============================================================================
// RUNNER — KEEP THIS BLOCK LAST IN THE FILE. Add new checks above, not below.
// ============================================================================
for (const c of CHECKS) await c()

console.table(timings.map(([name, ms]) => ({ name, ms })))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log('all admin-scale checks passed')
