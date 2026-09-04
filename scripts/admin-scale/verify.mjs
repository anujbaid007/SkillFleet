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

// ============================================================================
// RUNNER — KEEP THIS BLOCK LAST IN THE FILE. Add new checks above, not below.
// ============================================================================
for (const c of CHECKS) await c()

console.table(timings.map(([name, ms]) => ({ name, ms })))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log('all admin-scale checks passed')
