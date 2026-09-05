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

// Coordinator claim status per school, deliberately uneven — 6 approved, 4
// unclaimed, 2 pending and 1 rejected out of every 13 schools. Length 13 is
// coprime with the 10 states, the 7 districts per state and the 7-school roster
// cycle below, so every status lands in every state, in every district and on
// schools of every size; `i % 4` would tie the status to the school's roll and
// make a function that groups by the wrong one look right.
const CLAIM_PATTERN = [
  'approved', 'none', 'approved', 'pending', 'none', 'approved', 'rejected',
  'approved', 'none', 'pending', 'approved', 'none', 'approved',
]

// UUID namespaces, one per table. These MUST be hex-only ([0-9a-f]) — Postgres
// rejects anything else as `invalid input syntax for type uuid`, so mnemonic
// tags like 'sch0'/'stu0' cannot be used here.
const NS = { school: 'a0a00000', student: 'b0b00000', entry: 'c0c00000', member: 'd0d00000', coordinator: 'b1b10000' }

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
  // A school's claim status and its coordinator are decided together: a school
  // with status 'none' has NO coordinator_id, and every other status has one.
  // Nothing in the schema ties the two columns, so seeding them apart would let a
  // function that reads only one of them pass — section F probe 8 is the live
  // version of the same worry.
  const schoolRows = []
  let nClaimed = 0
  for (let i = 0; i < schools; i++) {
    const state = STATES[i % STATES.length]
    const claim = CLAIM_PATTERN[i % CLAIM_PATTERN.length]
    // One coordinator per claimed school and never two schools for one person:
    // that is what the product allows, and section F probe 9 asserts it. The
    // multi-claim path is exercised by a rolled-back fixture in verify.mjs
    // instead, where the expected numbers can be worked out by hand.
    const coordinatorId = claim === 'none' ? null : uuid(nClaimed++, NS.coordinator)
    schoolRows.push([uuid(i, NS.school), `School ${i} ${pick(['Public','International','Model','Central'])}`, state, `${state} District ${i % 7}`, 'approved', claim, coordinatorId])
  }
  await batch('insert into schools (id, name, state, district, review_status, coordinator_status, coordinator_id) values %VALUES%', schoolRows)

  // ...plus a sixth of that many coordinators who have signed up and claimed
  // NOTHING. They are the gap between the national coordinator count and the sum
  // of the state rows (section F probe 7), so a seed without them would let a
  // breakdown that quietly drops them pass every sum check.
  //
  // A real coordinator profile carries no school columns at all — signup asks
  // for an email, the claim comes later — so school_id / school_state /
  // school_district / school_name are left null here on purpose. Section G reads
  // a coordinator's geography from the school they claimed; if it read
  // user_profiles instead, every scoped figure would come back 0 against this
  // seed rather than merely wrong.
  const coordRows = [], coordAuthRows = []
  const coordinators = nClaimed + Math.max(2, Math.round(nClaimed / 6))
  for (let c = 0; c < coordinators; c++) {
    // (c * 13) % 200 walks all 200 residues (13 and 200 are coprime), so signups
    // spread over ~7 months on a DIFFERENT cycle from the students' 400 days:
    // a trend that read the wrong role would not line up.
    coordRows.push([uuid(c, NS.coordinator), 'coordinator', `Coordinator ${c}`, `8${String(c).padStart(9, '0')}`, c % 4 !== 0, daysAgo((c * 13) % 200, c % 24)])
    coordAuthRows.push([uuid(c, NS.coordinator), `coordinator${c}@example.test`])
  }
  await batch('insert into auth.users (id, email) values %VALUES%', coordAuthRows)
  await batch('insert into user_profiles (id, role, full_name, phone, onboarding_completed, created_at) values %VALUES%', coordRows, 1000)

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
  // A twentieth as many students again who compete in NOTHING. Every one of the
  // `students` rows above leads `entries / students` entries — four, at every
  // scale the harness is run at — so without these the seed is SATURATED:
  // `students entered` equals `students` at every school, entered_pct is 100
  // everywhere, and a section G function that returned the reach as the entered
  // count would pass every assertion made against this data. These students are
  // never a leader and never a team-mate, so the two numbers differ.
  //
  // Built with no rand() call at all, and appended AFTER the competing rows, so
  // the LCG stream and therefore every school name, class, language and entry in
  // the seed is byte-identical to what it was before they existed. They also
  // continue the same weighted school roster, so they are spread the same uneven
  // way and do not flatten any per-school or per-state skew.
  const idleRows = [], idleAuthRows = []
  const idle = Math.max(3, Math.round(students / 20))
  for (let k = 0; k < idle; k++) {
    const i = students + k
    const s = schoolRows[roster[i % roster.length]]
    idleRows.push([uuid(i, NS.student), 'student', `Student ${i}`, `9${String(i).padStart(9, '0')}`,
      CLASSES[(k * 3) % CLASSES.length], s[2], s[3], s[0], s[1], k % 5 !== 0, daysAgo((k * 7) % 400, k % 24)])
    idleAuthRows.push([uuid(i, NS.student), `student${i}@example.test`])
  }
  await batch('insert into auth.users (id, email) values %VALUES%', authRows.concat(idleAuthRows))
  await batch('insert into user_profiles (id, role, full_name, phone, school_class, school_state, school_district, school_id, school_name, onboarding_completed, created_at) values %VALUES%', userRows.concat(idleRows), 1000)

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
  return { schoolRows, userRows, idleRows, entryRows, coordRows }
}
