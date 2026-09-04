// Synthetic data at a chosen scale. Deterministic so two runs agree.
const STATES = ['Haryana','Delhi','Maharashtra','Karnataka','Tamil Nadu','Gujarat','Rajasthan','Uttar Pradesh','West Bengal','Kerala']
const TRACKS = ['ai_for_impact','entrepreneurship','content_creator','puzzle_master']
const CLASSES = ['Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12']
const LANGS = ['English','Hindi']

// Tracks are deliberately UNEVEN — 5/3/2/1 out of every 11 entries. With the
// obvious `TRACKS[i % 4]` every bucket holds exactly the same number of rows, so
// a function that groups by the wrong column still returns an identical multiset
// and every assertion passes on broken SQL. Length 11 is odd on purpose: each
// track then lands on both odd and even `i`, which keeps the two-member branch
// below reachable for every track.
const TRACK_PATTERN = [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3]

// UUID namespaces, one per table. These MUST be hex-only ([0-9a-f]) — Postgres
// rejects anything else as `invalid input syntax for type uuid`, so mnemonic
// tags like 'sch0'/'stu0' cannot be used here.
const NS = { school: 'a0a00000', student: 'b0b00000', entry: 'c0c00000', member: 'd0d00000' }

let seedState = 42
function rand() { seedState = (seedState * 1103515245 + 12345) & 0x7fffffff; return seedState / 0x7fffffff }
function pick(a) { return a[Math.floor(rand() * a.length)] }
function uuid(n, tag) { return `${tag}-0000-4000-8000-${String(n).padStart(12, '0')}` }

export async function seed(db, { students, schools, entries }) {
  seedState = 42 // reset, so a second seed() in the same process produces the same data
  const iso = (ms) => new Date(ms).toISOString()
  // Signup-style dates are anchored to the clock, not to a hard-coded calendar
  // date, so a "joined in the last 30 days" filter keeps matching the same rows
  // however long from now the harness is run. Anchored to midnight UTC, and each
  // row sits AFTER its own day's midnight and at least one whole day in the past.
  // That is what makes a `now() - interval 'N days'` boundary land exactly on a
  // day boundary: `days` 0..N-1 are always inside the window and N.. always
  // outside, whatever time of day the harness runs, and two runs on the same day
  // produce byte-identical rows.
  const MIDNIGHT = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
  const daysAgo = (days, hours = 0) => iso(MIDNIGHT - (1 + days) * 86400e3 + hours * 3600e3)

  const batch = async (sql, rows, size = 2000) => {
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size)
      const values = chunk.map((r, j) => `(${r.map((_, k) => `$${j * r.length + k + 1}`).join(',')})`).join(',')
      await db.query(sql.replace('%VALUES%', values), chunk.flat())
    }
  }
  const schoolRows = []
  for (let i = 0; i < schools; i++) {
    const state = STATES[i % STATES.length]
    schoolRows.push([uuid(i, NS.school), `School ${i} ${pick(['Public','International','Model','Central'])}`, state, `${state} District ${i % 7}`, 'approved', i % 9 === 0 ? 'pending' : (i % 3 === 0 ? 'approved' : 'none')])
  }
  await batch('insert into schools (id, name, state, district, review_status, coordinator_status) values %VALUES%', schoolRows)

  // School rolls are uneven on purpose: school s takes 1 + (s % 7) seats per pass,
  // so counts per school (and, because states own different schools, per state)
  // differ. `i % schools` would give every school exactly the same roll and make a
  // group-by-the-wrong-column bug invisible.
  const roster = []
  for (let s = 0; s < schools; s++) for (let w = 0; w <= s % 7; w++) roster.push(s)

  const userRows = [], authRows = []
  for (let i = 0; i < students; i++) {
    const s = schoolRows[roster[i % roster.length]]
    // (i * 7) % 400 walks all 400 residues, so signups spread over ~13 months.
    userRows.push([uuid(i, NS.student), 'student', `Student ${i}`, `9${String(i).padStart(9, '0')}`, pick(CLASSES), s[2], s[3], s[0], s[1], i % 5 !== 0, daysAgo((i * 7) % 400, i % 24)])
    authRows.push([uuid(i, NS.student), `student${i}@example.test`])
  }
  await batch('insert into auth.users (id, email) values %VALUES%', authRows)
  await batch('insert into user_profiles (id, role, full_name, phone, school_class, school_state, school_district, school_id, school_name, onboarding_completed, created_at) values %VALUES%', userRows, 1000)

  const entryRows = [], memberRows = []
  for (let i = 0; i < entries; i++) {
    const leader = userRows[i % students]
    const track = TRACKS[TRACK_PATTERN[i % TRACK_PATTERN.length]]
    const submitted = i % 3 === 0
    const day = 1 + (i % 28)
    const created = `2026-08-${String(day).padStart(2, '0')}T10:00:00Z`
    // updated_at is always >= created_at but never equal to it, so a function
    // reading the wrong one of the two returns visibly different rows.
    const updated = iso(Date.parse(created) + (1 + (i % 30)) * 86400e3 + (i % 17) * 3600e3)
    entryRows.push([uuid(i, NS.entry), track, leader[7], leader[0], submitted ? 'submitted' : 'draft', JSON.stringify({ language: pick(LANGS) }), submitted ? created : null, created, updated])
    memberRows.push([uuid(i * 2, NS.member), uuid(i, NS.entry), track, leader[0], true, created])
    if (i % 2 === 0 && track !== 'puzzle_master') {
      const mate = userRows[(i + 1) % students]
      memberRows.push([uuid(i * 2 + 1, NS.member), uuid(i, NS.entry), track, mate[0], false, i % 4 === 0 ? null : created])
    }
  }
  await batch('insert into isc_entries (id, track, school_id, created_by, status, submission, submitted_at, created_at, updated_at) values %VALUES%', entryRows, 1000)
  await batch('insert into isc_entry_members (id, entry_id, track, user_id, is_leader, accepted_at) values %VALUES%', memberRows, 1000)
  // Deterministic on purpose: 500 certificate rows, 350 pending / 150 approved,
  // always for the same 500 students, spread over the last ~120 days so a
  // date-bounded admin query has something to actually filter.
  await db.query(`insert into certificate_uploads (student_id, status, created_at)
    select id,
           case when n % 10 < 7 then 'pending' else 'approved' end,
           date_trunc('day', now()) - ((1 + n % 120) || ' days')::interval + ((n % 11) || ' hours')::interval
    from (select id, row_number() over (order by id) as n from user_profiles where role = 'student' order by id limit 500) t`)
  return { schoolRows, userRows, entryRows }
}
