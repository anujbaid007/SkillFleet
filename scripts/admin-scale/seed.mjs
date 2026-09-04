// Synthetic data at a chosen scale. Deterministic so two runs agree.
const STATES = ['Haryana','Delhi','Maharashtra','Karnataka','Tamil Nadu','Gujarat','Rajasthan','Uttar Pradesh','West Bengal','Kerala']
const TRACKS = ['ai_for_impact','entrepreneurship','content_creator','puzzle_master']
const CLASSES = ['Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12']
const LANGS = ['English','Hindi']

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

  const userRows = [], authRows = []
  for (let i = 0; i < students; i++) {
    const s = schoolRows[i % schools]
    userRows.push([uuid(i, NS.student), 'student', `Student ${i}`, `9${String(i).padStart(9, '0')}`, pick(CLASSES), s[2], s[3], s[0], s[1], i % 5 !== 0])
    authRows.push([uuid(i, NS.student), `student${i}@example.test`])
  }
  await batch('insert into auth.users (id, email) values %VALUES%', authRows)
  await batch('insert into user_profiles (id, role, full_name, phone, school_class, school_state, school_district, school_id, school_name, onboarding_completed) values %VALUES%', userRows, 1000)

  const entryRows = [], memberRows = []
  for (let i = 0; i < entries; i++) {
    const leader = userRows[i % students]
    const track = TRACKS[i % 4]
    const submitted = i % 3 === 0
    const day = 1 + (i % 28)
    const created = `2026-08-${String(day).padStart(2, '0')}T10:00:00Z`
    entryRows.push([uuid(i, NS.entry), track, leader[7], leader[0], submitted ? 'submitted' : 'draft', JSON.stringify({ language: pick(LANGS) }), submitted ? created : null, created])
    memberRows.push([uuid(i * 2, NS.member), uuid(i, NS.entry), track, leader[0], true, created])
    if (i % 2 === 0 && track !== 'puzzle_master') {
      const mate = userRows[(i + 1) % students]
      memberRows.push([uuid(i * 2 + 1, NS.member), uuid(i, NS.entry), track, mate[0], false, i % 4 === 0 ? null : created])
    }
  }
  await batch('insert into isc_entries (id, track, school_id, created_by, status, submission, submitted_at, created_at) values %VALUES%', entryRows, 1000)
  await batch('insert into isc_entry_members (id, entry_id, track, user_id, is_leader, accepted_at) values %VALUES%', memberRows, 1000)
  // Deterministic on purpose: 500 certificate rows, 350 pending / 150 approved,
  // always for the same 500 students, so counts asserted by later tasks are stable.
  await db.query(`insert into certificate_uploads (student_id, status)
    select id, case when n % 10 < 7 then 'pending' else 'approved' end
    from (select id, row_number() over (order by id) as n from user_profiles where role = 'student' order by id limit 500) t`)
  return { schoolRows, userRows, entryRows }
}
