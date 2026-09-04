# Admin at Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin area work for 200,000 students, 1,000+ schools and 8 lakh ISC entries by moving every aggregate and list into Postgres functions and making the pages thin, paginated and searchable.

**Architecture:** One SQL migration (`docs/admin-scale-migration.sql`) adds indexes, a denormalised `division` column on entries, and admin-only functions that return answers (summaries, breakdowns, pages). A small typed data layer in `src/lib/admin/` wraps each function, caches results for 60 seconds per isolate, and maps a missing-migration error to a panel. Admin pages call the data layer and render; the in-memory ISC loader and its helpers are deleted. Migration correctness and performance are verified on a local WASM Postgres (pglite) seeded at target scale.

**Tech Stack:** Next.js 16.3.4 App Router (read `node_modules/next/dist/docs/` before touching pages), React 19, Supabase (`@supabase/supabase-js` 2.108, PostgREST RPC), Postgres with `pg_trgm`, Tailwind v4, lucide-react, vitest, `@electric-sql/pglite` 0.5.x (devDependency, scripts only).

**Spec:** `docs/superpowers/specs/2026-09-04-admin-scale-design.md`

## Global Constraints

- Next.js 16.3.4: this is not the Next you know. Read the relevant guide in `node_modules/next/dist/docs/` before writing page or route code. `params` and `searchParams` are Promises and must be awaited.
- Server components read Supabase through `createClient()` from `@/lib/supabase/server`. Never use the service-role client in pages.
- Every new SQL function is `security definer`, `set search_path = public`, and starts with `if not is_admin() then raise exception 'admin only'; end if;`.
- The migration must be safe to run twice: `create or replace`, `create index if not exists`, `add column if not exists`, `drop trigger if exists`.
- Page size is capped at 200 inside SQL. Pages are 1-based. Totals come from `count(*) over ()`.
- Cache lifetime is 60 seconds, in-memory per isolate (the Worker has no writable incremental cache), see Task 6.
- A PostgREST "function not found" error (`code === 'PGRST202'`) means the migration has not been run; pages render the `MigrationMissing` panel, never a crash.
- Copy: sentence case, plain words, numbers spelled out in prose. Contact address is `hello@skillfleet.org`. Never mention a wildcard route.
- Design: reuse `clay-card`, `PageHeader`, `StatCard`, `Reveal`, and the token colours (`primary`, `accent-teal`, `accent-pink`, `accent-yellow`, `accent-purple`). No new colour values.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Commit after each task. Do not push; the orchestrator pushes.
- Before every commit: `npx tsc --noEmit`, `npx eslint <changed files>`, `npx vitest run` all clean.
- Do not touch `src/components/sections/isc-2026-sketch.tsx` or anything under `src/components/sections/`.

---

## File structure

**Created**
- `scripts/admin-scale/schema.sql` — local copy of the tables the functions touch, plus `auth.users` and an `is_admin()` stub. Verification only.
- `scripts/admin-scale/seed.mjs` — synthetic data at a chosen scale.
- `scripts/admin-scale/verify.mjs` — applies schema + migration + seed, checks every function against a reference query, times it, and asserts index use.
- `docs/admin-scale-migration.sql` — the migration the founder pastes into Supabase. Sections A–E.
- `src/lib/admin/scope.ts` — scope and filter types, URL parsing/serialising, RPC argument mapping. Pure.
- `src/lib/admin/errors.ts` — `AdminResult<T>` and `mapRpcError`. Pure.
- `src/lib/admin/cache.ts` — `cached(key, fn)` 60-second in-memory TTL and `invalidateAdminCache()`.
- `src/lib/admin/isc.ts` — readers for the ISC functions.
- `src/lib/admin/users.ts` — users page and global search readers.
- `src/lib/admin/queues.ts` — paginated queue readers and the batched similar-schools lookup.
- `src/lib/admin/dashboard.ts` — dashboard reader.
- `src/lib/admin/csv.ts` — CSV row formatting for export. Pure.
- `src/components/admin/migration-missing.tsx`, `section-failed.tsx` — the two panels.
- `src/components/admin/pagination.tsx` — page links that keep the rest of the URL.
- `src/components/admin/isc-roster-table.tsx` — paginated roster.
- `src/components/admin/isc-cold-schools.tsx` — paginated cold-school list.
- `src/components/admin/global-search.tsx` — header search box.
- `src/components/admin/admin-queue.tsx` — shared queue table with selection and bulk actions.
- `src/app/(admin)/admin/isc/export/route.ts` — streaming CSV.
- `src/app/(admin)/admin/search/route.ts` — JSON endpoint for the search box.
- `src/app/(admin)/admin/queues/actions.ts` — bulk approve/reject server actions.

**Modified**
- `src/lib/types/database.ts` — add the new functions under `Functions` and `division` on `isc_entries`.
- `src/app/(admin)/admin/isc/page.tsx` and the three drill-down pages — call the data layer.
- `src/components/admin/isc-funnel-panel.tsx`, `isc-comparison-chart.tsx`, `isc-insights.tsx`, `isc-export.tsx`, `isc-outreach.tsx` — accept function outputs.
- `src/app/(admin)/admin/users/page.tsx`, `users/[id]/page.tsx`, `schools/page.tsx`, `coordinators/page.tsx`, `certificates/page.tsx`, `page.tsx` — rewritten on the data layer.
- `src/components/admin/admin-nav.tsx` — hosts the global search.
- `package.json` — `admin-scale:verify` script, pglite devDependency.

**Deleted (Task 8)**
- `src/lib/isc/admin-data.ts`, `analytics.ts`, `funnel.ts`, `admin-filters.ts`, `outreach.ts` and their tests, plus `src/components/admin/isc-filters.tsx` and `isc-roster.tsx` once nothing imports them.

---

## Phase 1 — Migration, verification harness, ISC data layer and pages

### Task 1: Local Postgres verification harness

**Files:**
- Create: `scripts/admin-scale/schema.sql`
- Create: `scripts/admin-scale/seed.mjs`
- Create: `scripts/admin-scale/verify.mjs`
- Modify: `package.json` (devDependency, script)

**Interfaces:**
- Produces: `npm run admin-scale:verify -- --students 2000 --schools 40 --entries 8000` runs the whole check at a small scale; `--students 200000 --schools 1000 --entries 800000` is the target-scale run. `verify.mjs` exports nothing; it exits non-zero on any failure and prints a table of function timings.

- [ ] **Step 1: Install pglite as a devDependency**

Run: `npm i -D @electric-sql/pglite@^0.5.8`
Expected: package.json devDependencies gains `@electric-sql/pglite`.

- [ ] **Step 2: Write the local schema**

`scripts/admin-scale/schema.sql`:

```sql
-- Local stand-in for the live schema: only the columns the admin functions read.
create extension if not exists pg_trgm;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);

create table if not exists user_profiles (
  id uuid primary key,
  role text not null default 'student',
  full_name text,
  phone text,
  school_class text,
  school_state text,
  school_district text,
  school_id uuid,
  school_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  family_id uuid,
  city text,
  date_of_birth date
);
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null,
  district text not null,
  address text,
  affiliation_no text,
  board text,
  review_status text not null default 'approved',
  coordinator_id uuid,
  coordinator_status text not null default 'none',
  created_by uuid,
  created_at timestamptz not null default now()
);
create table if not exists isc_entries (
  id uuid primary key default gen_random_uuid(),
  track text not null,
  school_id uuid not null,
  created_by uuid not null,
  status text not null default 'draft',
  submission jsonb not null default '{}'::jsonb,
  consent_given_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists isc_entry_members (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
  track text not null,
  user_id uuid,
  invited_email text,
  invite_token text,
  is_leader boolean not null default false,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create table if not exists certificate_uploads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table if not exists support_conversations (
  id uuid primary key default gen_random_uuid(),
  coordinator_id uuid,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  parent_full_name text, parent_email text, parent_phone text
);
-- Live project has these; stubbed here.
create or replace function is_admin() returns boolean language sql as $$ select true $$;
create or replace function find_similar_schools(p_school_id uuid)
returns table(id uuid, name text, address text, review_status text, score real)
language sql stable as $$
  select o.id, o.name, o.address, o.review_status, similarity(lower(o.name), lower(s.name))::real
  from schools s join schools o on o.id <> s.id and o.district = s.district
  where s.id = p_school_id and similarity(lower(o.name), lower(s.name)) > 0.3
  order by 5 desc limit 5
$$;
```

- [ ] **Step 3: Write the seeder**

`scripts/admin-scale/seed.mjs`:

```js
// Synthetic data at a chosen scale. Deterministic so two runs agree.
const STATES = ['Haryana','Delhi','Maharashtra','Karnataka','Tamil Nadu','Gujarat','Rajasthan','Uttar Pradesh','West Bengal','Kerala']
const TRACKS = ['ai_for_impact','entrepreneurship','content_creator','puzzle_master']
const CLASSES = ['Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12']
const LANGS = ['English','Hindi']

let seedState = 42
function rand() { seedState = (seedState * 1103515245 + 12345) & 0x7fffffff; return seedState / 0x7fffffff }
function pick(a) { return a[Math.floor(rand() * a.length)] }
function uuid(n, tag) { return `${tag}0000-0000-4000-8000-${String(n).padStart(12, '0')}` }

export async function seed(db, { students, schools, entries }) {
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
    schoolRows.push([uuid(i, 'sch0'), `School ${i} ${pick(['Public','International','Model','Central'])}`, state, `${state} District ${i % 7}`, 'approved', i % 9 === 0 ? 'pending' : (i % 3 === 0 ? 'approved' : 'none')])
  }
  await batch('insert into schools (id, name, state, district, review_status, coordinator_status) values %VALUES%', schoolRows)

  const userRows = [], authRows = []
  for (let i = 0; i < students; i++) {
    const s = schoolRows[i % schools]
    userRows.push([uuid(i, 'stu0'), 'student', `Student ${i}`, `9${String(i).padStart(9, '0')}`, pick(CLASSES), s[2], s[3], s[0], s[1], i % 5 !== 0])
    authRows.push([uuid(i, 'stu0'), `student${i}@example.test`])
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
    entryRows.push([uuid(i, 'ent0'), track, leader[7], leader[0], submitted ? 'submitted' : 'draft', JSON.stringify({ language: pick(LANGS) }), submitted ? created : null, created])
    memberRows.push([uuid(i * 2, 'mem0'), uuid(i, 'ent0'), track, leader[0], true, created])
    if (i % 2 === 0 && track !== 'puzzle_master') {
      const mate = userRows[(i + 1) % students]
      memberRows.push([uuid(i * 2 + 1, 'mem0'), uuid(i, 'ent0'), track, mate[0], false, i % 4 === 0 ? null : created])
    }
  }
  await batch('insert into isc_entries (id, track, school_id, created_by, status, submission, submitted_at, created_at) values %VALUES%', entryRows, 1000)
  await batch('insert into isc_entry_members (id, entry_id, track, user_id, is_leader, accepted_at) values %VALUES%', memberRows, 1000)
  await db.query(`insert into certificate_uploads (student_id, status) select id, case when random() < 0.7 then 'pending' else 'approved' end from user_profiles where role = 'student' limit 500`)
  return { schoolRows, userRows, entryRows }
}
```

- [ ] **Step 4: Write the verifier skeleton (assertions are added per task)**

`scripts/admin-scale/verify.mjs`:

```js
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
console.log(`seeded ${scale.students} students, ${scale.schools} schools, ${scale.entries} entries in ${Date.now() - t0} ms`)

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
export async function assertIndexScan(sql, params, forbiddenTable) {
  const { rows } = await db.query(`explain ${sql}`, params)
  const plan = rows.map((r) => Object.values(r)[0]).join('\n')
  if (new RegExp(`Seq Scan on ${forbiddenTable}\\b`).test(plan)) throw new Error(`sequential scan on ${forbiddenTable}:\n${plan}`)
}
export { db }

// --- checks are appended below by later tasks ---
const CHECKS = []
for (const c of CHECKS) await c()

console.table(timings.map(([name, ms]) => ({ name, ms })))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log('all admin-scale checks passed')
```

Add to `package.json` scripts: `"admin-scale:verify": "node scripts/admin-scale/verify.mjs"`.

- [ ] **Step 5: Create an empty migration so the harness runs end to end**

`docs/admin-scale-migration.sql` with only a header comment:

```sql
-- Admin at scale: indexes, the division column and admin-only functions.
-- Safe to run more than once. Paste into the Supabase SQL editor as one script.
```

Run: `npm run admin-scale:verify`
Expected: prints the seed line, an empty timings table, and "all admin-scale checks passed".

- [ ] **Step 6: Commit**

```bash
git add scripts/admin-scale docs/admin-scale-migration.sql package.json package-lock.json
git commit -m "chore: local Postgres harness for verifying the admin migration at scale

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Migration section A and B — indexes, division column, trigger, backfill

**Files:**
- Modify: `docs/admin-scale-migration.sql`
- Modify: `scripts/admin-scale/verify.mjs` (append checks)

**Interfaces:**
- Produces: `isc_entries.division text` ('group1' | 'group2' | null), `isc_division_for_class(text) returns text`.

- [ ] **Step 1: Append section A (indexes) and section B (division) to the migration**

```sql
-- ---------------------------------------------------------------
-- A. Indexes
-- ---------------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists isc_entries_school_idx     on isc_entries (school_id);
create index if not exists isc_entries_status_idx     on isc_entries (status);
create index if not exists isc_entries_track_idx      on isc_entries (track);
create index if not exists isc_entries_created_idx    on isc_entries (created_at desc, id desc);
create index if not exists isc_entries_submitted_idx  on isc_entries (submitted_at) where submitted_at is not null;
create index if not exists isc_entries_language_idx   on isc_entries ((submission->>'language'));
create index if not exists isc_entry_members_entry_idx on isc_entry_members (entry_id);
create index if not exists isc_entry_members_user_idx  on isc_entry_members (user_id) where user_id is not null;

create index if not exists user_profiles_role_idx    on user_profiles (role);
create index if not exists user_profiles_geo_idx     on user_profiles (school_state, school_district);
create index if not exists user_profiles_school_idx  on user_profiles (school_id);
create index if not exists user_profiles_class_idx   on user_profiles (school_class);
create index if not exists user_profiles_created_idx on user_profiles (created_at desc);
create index if not exists user_profiles_name_trgm   on user_profiles using gin (lower(coalesce(full_name, '')) gin_trgm_ops);
create index if not exists user_profiles_phone_idx   on user_profiles (phone);

create index if not exists schools_geo_idx          on schools (state, district);
create index if not exists schools_review_idx       on schools (review_status);
create index if not exists schools_coord_status_idx on schools (coordinator_status);
create index if not exists schools_name_trgm        on schools using gin (lower(name) gin_trgm_ops);

create index if not exists certificate_uploads_status_idx on certificate_uploads (status, created_at desc);

-- ---------------------------------------------------------------
-- B. Division on entries (Classes 5–8 = group1, 9–12 = group2)
-- ---------------------------------------------------------------
alter table isc_entries add column if not exists division text;
create index if not exists isc_entries_division_idx on isc_entries (division);

create or replace function isc_division_for_class(p_class text)
returns text language sql immutable as $$
  select case
    when p_class in ('Class 5','Class 6','Class 7','Class 8') then 'group1'
    when p_class in ('Class 9','Class 10','Class 11','Class 12') then 'group2'
    else null end
$$;

create or replace function isc_entries_set_division()
returns trigger language plpgsql as $$
begin
  if new.division is null then
    select isc_division_for_class(p.school_class) into new.division
    from user_profiles p where p.id = new.created_by;
  end if;
  return new;
end $$;

drop trigger if exists isc_entries_division_trg on isc_entries;
create trigger isc_entries_division_trg
  before insert on isc_entries for each row execute function isc_entries_set_division();

update isc_entries e
   set division = isc_division_for_class(p.school_class)
  from user_profiles p
 where p.id = e.created_by and e.division is null;
```

- [ ] **Step 2: Append checks to verify.mjs (inside the CHECKS array)**

```js
CHECKS.push(() => check('division backfill', async () => {
  const { rows } = await db.query(`select count(*)::int as n from isc_entries e join user_profiles p on p.id = e.created_by
    where e.division is distinct from isc_division_for_class(p.school_class)`)
  assertEqual(rows[0].n, 0, 'every entry carries its leader division')
}))
CHECKS.push(() => check('division trigger', async () => {
  const { rows: [s] } = await db.query(`select id, school_id from user_profiles where school_class = 'Class 10' limit 1`)
  await db.query(`insert into isc_entries (track, school_id, created_by) values ('ai_for_impact', $1, $2)`, [s.school_id, s.id])
  const { rows } = await db.query(`select division from isc_entries where created_by = $1 order by created_at desc limit 1`, [s.id])
  assertEqual(rows[0].division, 'group2', 'trigger sets group2 for Class 10')
}))
```

- [ ] **Step 3: Run the harness**

Run: `npm run admin-scale:verify`
Expected: two passing checks, "all admin-scale checks passed".

- [ ] **Step 4: Commit**

```bash
git add docs/admin-scale-migration.sql scripts/admin-scale/verify.mjs
git commit -m "feat(sql): indexes and a division column for ISC entries

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Migration section C — summary, breakdown, timeline

**Files:**
- Modify: `docs/admin-scale-migration.sql`
- Modify: `scripts/admin-scale/verify.mjs`

**Interfaces:**
- Produces:
  - `admin_isc_summary(p_state text default null, p_district text default null, p_school_id uuid default null) returns jsonb` with keys `eligible, started, submitted, schools_with_entries, by_track[], by_division[], by_status[], by_language[]`; each list item is `{key, count}`.
  - `admin_isc_breakdown(p_state text default null, p_district text default null) returns table(key text, label text, eligible bigint, started bigint, submitted bigint, schools bigint)`.
  - `admin_isc_timeline(p_state, p_district, p_school_id, p_days int default 30) returns table(day date, started bigint, submitted bigint)`.

- [ ] **Step 1: Append section C to the migration**

```sql
-- ---------------------------------------------------------------
-- C. Championship summaries
-- ---------------------------------------------------------------
create or replace function admin_isc_summary(
  p_state text default null, p_district text default null, p_school_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  with scoped_schools as (
    select s.id from schools s
    where (p_school_id is null or s.id = p_school_id)
      and (p_school_id is not null or p_state is null or s.state = p_state)
      and (p_school_id is not null or p_district is null or s.district = p_district)
  ),
  eligible as (
    select p.id from user_profiles p
    where p.role = 'student' and isc_division_for_class(p.school_class) is not null
      and (p_school_id is null or p.school_id = p_school_id)
      and (p_school_id is not null or p_state is null or p.school_state = p_state)
      and (p_school_id is not null or p_district is null or p.school_district = p_district)
  ),
  entries as (
    select e.id, e.track, e.status, e.division, e.submission->>'language' as language, e.school_id
    from isc_entries e
    where e.school_id in (select id from scoped_schools)
  ),
  members as (
    select m.user_id, en.track, en.status
    from isc_entry_members m join entries en on en.id = m.entry_id
    where m.user_id is not null and (m.is_leader or m.accepted_at is not null)
  )
  select jsonb_build_object(
    'eligible', (select count(*) from eligible),
    'started', (select count(distinct user_id) from members),
    'submitted', (select count(distinct user_id) from members where status = 'submitted'),
    'schools_with_entries', (select count(distinct school_id) from entries),
    'by_track', (select coalesce(jsonb_agg(jsonb_build_object('key', track, 'count', c) order by c desc), '[]'::jsonb)
                 from (select track, count(distinct user_id) c from members group by track) t),
    'by_division', (select coalesce(jsonb_agg(jsonb_build_object('key', coalesce(division, 'unknown'), 'count', c) order by c desc), '[]'::jsonb)
                 from (select division, count(*) c from entries group by division) t),
    'by_status', (select coalesce(jsonb_agg(jsonb_build_object('key', status, 'count', c) order by c desc), '[]'::jsonb)
                 from (select status, count(*) c from entries group by status) t),
    'by_language', (select coalesce(jsonb_agg(jsonb_build_object('key', coalesce(language, 'unknown'), 'count', c) order by c desc), '[]'::jsonb)
                 from (select language, count(*) c from entries group by language) t)
  ) into v;
  return v;
end $$;

create or replace function admin_isc_breakdown(p_state text default null, p_district text default null)
returns table(key text, label text, eligible bigint, started bigint, submitted bigint, schools bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_state is null then
    return query
    with el as (
      select p.school_state k, count(*) n from user_profiles p
      where p.role = 'student' and isc_division_for_class(p.school_class) is not null and p.school_state is not null
      group by p.school_state),
    st as (
      select s.state k,
             count(distinct m.user_id) filter (where m.is_leader or m.accepted_at is not null) started,
             count(distinct m.user_id) filter (where (m.is_leader or m.accepted_at is not null) and e.status = 'submitted') submitted,
             count(distinct e.school_id) schools
      from isc_entries e join schools s on s.id = e.school_id
      left join isc_entry_members m on m.entry_id = e.id and m.user_id is not null
      group by s.state)
    select coalesce(el.k, st.k), coalesce(el.k, st.k), coalesce(el.n, 0), coalesce(st.started, 0), coalesce(st.submitted, 0), coalesce(st.schools, 0)
    from el full join st on st.k = el.k order by 3 desc;
  elsif p_district is null then
    return query
    with el as (
      select p.school_district k, count(*) n from user_profiles p
      where p.role = 'student' and isc_division_for_class(p.school_class) is not null and p.school_state = p_state and p.school_district is not null
      group by p.school_district),
    st as (
      select s.district k,
             count(distinct m.user_id) filter (where m.is_leader or m.accepted_at is not null) started,
             count(distinct m.user_id) filter (where (m.is_leader or m.accepted_at is not null) and e.status = 'submitted') submitted,
             count(distinct e.school_id) schools
      from isc_entries e join schools s on s.id = e.school_id and s.state = p_state
      left join isc_entry_members m on m.entry_id = e.id and m.user_id is not null
      group by s.district)
    select coalesce(el.k, st.k), coalesce(el.k, st.k), coalesce(el.n, 0), coalesce(st.started, 0), coalesce(st.submitted, 0), coalesce(st.schools, 0)
    from el full join st on st.k = el.k order by 3 desc;
  else
    return query
    with sc as (select s.id, s.name from schools s where s.state = p_state and s.district = p_district),
    el as (
      select p.school_id k, count(*) n from user_profiles p
      where p.role = 'student' and isc_division_for_class(p.school_class) is not null and p.school_id in (select id from sc)
      group by p.school_id),
    st as (
      select e.school_id k,
             count(distinct m.user_id) filter (where m.is_leader or m.accepted_at is not null) started,
             count(distinct m.user_id) filter (where (m.is_leader or m.accepted_at is not null) and e.status = 'submitted') submitted,
             1::bigint schools
      from isc_entries e
      left join isc_entry_members m on m.entry_id = e.id and m.user_id is not null
      where e.school_id in (select id from sc)
      group by e.school_id)
    select sc.id::text, sc.name, coalesce(el.n, 0), coalesce(st.started, 0), coalesce(st.submitted, 0), coalesce(st.schools, 0)
    from sc left join el on el.k = sc.id left join st on st.k = sc.id order by 3 desc;
  end if;
end $$;

create or replace function admin_isc_timeline(
  p_state text default null, p_district text default null, p_school_id uuid default null, p_days int default 30
) returns table(day date, started bigint, submitted bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  with scoped as (
    select e.created_at, e.submitted_at
    from isc_entries e join schools s on s.id = e.school_id
    where (p_school_id is null or e.school_id = p_school_id)
      and (p_school_id is not null or p_state is null or s.state = p_state)
      and (p_school_id is not null or p_district is null or s.district = p_district)
      and (e.created_at >= current_date - (p_days - 1) or e.submitted_at >= current_date - (p_days - 1))
  ),
  c as (select created_at::date d, count(*) n from scoped where created_at >= current_date - (p_days - 1) group by 1),
  s as (select submitted_at::date d, count(*) n from scoped where submitted_at >= current_date - (p_days - 1) group by 1)
  select g.d::date, coalesce(c.n, 0), coalesce(s.n, 0)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') g(d)
  left join c on c.d = g.d::date left join s on s.d = g.d::date
  order by 1;
end $$;
```

- [ ] **Step 2: Append checks**

```js
CHECKS.push(() => check('admin_isc_summary national', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_isc_summary() v`)
  const { rows: [ref] } = await db.query(`select
    (select count(*)::int from user_profiles where role='student' and isc_division_for_class(school_class) is not null) eligible,
    (select count(distinct user_id)::int from isc_entry_members where user_id is not null and (is_leader or accepted_at is not null)) started`)
  assertEqual(v.eligible, ref.eligible, 'eligible'); assertEqual(v.started, ref.started, 'started')
  if (!Array.isArray(v.by_track) || v.by_track.length !== 4) throw new Error('by_track should list four tracks')
}))
CHECKS.push(() => check('admin_isc_summary school scope', async () => {
  const { rows: [s] } = await db.query(`select id from schools limit 1`)
  const { rows: [{ v }] } = await db.query(`select admin_isc_summary(null, null, $1) v`, [s.id])
  const { rows: [ref] } = await db.query(`select count(*)::int n from user_profiles where role='student' and school_id=$1 and isc_division_for_class(school_class) is not null`, [s.id])
  assertEqual(v.eligible, ref.n, 'eligible in one school')
}))
CHECKS.push(() => check('admin_isc_breakdown levels', async () => {
  const nat = await db.query(`select * from admin_isc_breakdown()`)
  if (nat.rows.length < 2) throw new Error('national breakdown should list states')
  const st = await db.query(`select * from admin_isc_breakdown($1)`, [nat.rows[0].key])
  const di = await db.query(`select * from admin_isc_breakdown($1, $2)`, [nat.rows[0].key, st.rows[0].key])
  if (!di.rows.length || !di.rows[0].label) throw new Error('district breakdown should list schools by name')
  const sumEligible = nat.rows.reduce((a, r) => a + Number(r.eligible), 0)
  const { rows: [ref] } = await db.query(`select count(*)::int n from user_profiles where role='student' and isc_division_for_class(school_class) is not null and school_state is not null`)
  assertEqual(sumEligible, ref.n, 'state eligible sums to national')
}))
CHECKS.push(() => check('admin_isc_timeline', async () => {
  const { rows } = await db.query(`select * from admin_isc_timeline(null, null, null, 7)`)
  assertEqual(rows.length, 7, 'one row per day')
}))
```

- [ ] **Step 3: Run the harness at small scale, then target scale**

Run: `npm run admin-scale:verify` then `npm run admin-scale:verify -- --students 200000 --schools 1000 --entries 800000`
Expected: all checks pass; at target scale each of summary, breakdown, timeline reports under 3000 ms in the timings table (pglite is several times slower than native Postgres; under three seconds here is under one second live).

- [ ] **Step 4: Commit**

```bash
git add docs/admin-scale-migration.sql scripts/admin-scale/verify.mjs
git commit -m "feat(sql): ISC summary, breakdown and timeline as admin functions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: Migration section D — roster, export chunk, cold schools

**Files:**
- Modify: `docs/admin-scale-migration.sql`
- Modify: `scripts/admin-scale/verify.mjs`

**Interfaces:**
- Produces:
  - `admin_isc_roster(p_state, p_district, p_school_id, p_track text, p_status text, p_division text, p_language text, p_q text, p_page int, p_size int) returns table(id uuid, track text, status text, division text, language text, school_id uuid, school_name text, leader_id uuid, leader_name text, member_count bigint, created_at timestamptz, submitted_at timestamptz, total bigint)`.
  - `admin_isc_export_chunk(same scope and filters, p_after_created timestamptz, p_after_id uuid, p_size int) returns table(... same columns without total)`.
  - `admin_isc_cold_schools(p_state, p_district, p_page int, p_size int) returns table(id uuid, name text, state text, district text, eligible bigint, coordinator_status text, total bigint)`.

- [ ] **Step 1: Append section D**

```sql
-- ---------------------------------------------------------------
-- D. Roster pages, export chunks, cold schools
-- ---------------------------------------------------------------
create or replace function admin_isc_roster(
  p_state text default null, p_district text default null, p_school_id uuid default null,
  p_track text default null, p_status text default null, p_division text default null,
  p_language text default null, p_q text default null, p_page int default 1, p_size int default 50
) returns table(
  id uuid, track text, status text, division text, language text, school_id uuid, school_name text,
  leader_id uuid, leader_name text, member_count bigint, created_at timestamptz, submitted_at timestamptz, total bigint
) language plpgsql security definer set search_path = public as $$
declare v_size int := least(greatest(coalesce(p_size, 50), 1), 200);
        v_off  int := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_size, 50), 1), 200);
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  select e.id, e.track, e.status, e.division, e.submission->>'language', e.school_id, s.name,
         e.created_by, p.full_name,
         (select count(*) from isc_entry_members m where m.entry_id = e.id and (m.is_leader or m.accepted_at is not null)),
         e.created_at, e.submitted_at, count(*) over ()
  from isc_entries e
  join schools s on s.id = e.school_id
  left join user_profiles p on p.id = e.created_by
  where (p_school_id is null or e.school_id = p_school_id)
    and (p_school_id is not null or p_state is null or s.state = p_state)
    and (p_school_id is not null or p_district is null or s.district = p_district)
    and (p_track is null or e.track = p_track)
    and (p_status is null or e.status = p_status)
    and (p_division is null or e.division = p_division)
    and (p_language is null or e.submission->>'language' = p_language)
    and (p_q is null or p_q = '' or lower(coalesce(p.full_name, '')) like '%' || lower(p_q) || '%' or lower(s.name) like '%' || lower(p_q) || '%')
  order by e.created_at desc, e.id desc
  limit v_size offset v_off;
end $$;

create or replace function admin_isc_export_chunk(
  p_state text default null, p_district text default null, p_school_id uuid default null,
  p_track text default null, p_status text default null, p_division text default null,
  p_language text default null, p_q text default null,
  p_after_created timestamptz default null, p_after_id uuid default null, p_size int default 1000
) returns table(
  id uuid, track text, status text, division text, language text, school_id uuid, school_name text,
  leader_id uuid, leader_name text, member_count bigint, created_at timestamptz, submitted_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_state is null and p_school_id is null then raise exception 'export needs a state, district or school scope'; end if;
  return query
  select e.id, e.track, e.status, e.division, e.submission->>'language', e.school_id, s.name,
         e.created_by, p.full_name,
         (select count(*) from isc_entry_members m where m.entry_id = e.id and (m.is_leader or m.accepted_at is not null)),
         e.created_at, e.submitted_at
  from isc_entries e
  join schools s on s.id = e.school_id
  left join user_profiles p on p.id = e.created_by
  where (p_school_id is null or e.school_id = p_school_id)
    and (p_school_id is not null or p_state is null or s.state = p_state)
    and (p_school_id is not null or p_district is null or s.district = p_district)
    and (p_track is null or e.track = p_track)
    and (p_status is null or e.status = p_status)
    and (p_division is null or e.division = p_division)
    and (p_language is null or e.submission->>'language' = p_language)
    and (p_q is null or p_q = '' or lower(coalesce(p.full_name, '')) like '%' || lower(p_q) || '%' or lower(s.name) like '%' || lower(p_q) || '%')
    and (p_after_created is null or (e.created_at, e.id) < (p_after_created, p_after_id))
  order by e.created_at desc, e.id desc
  limit least(greatest(coalesce(p_size, 1000), 1), 1000);
end $$;

create or replace function admin_isc_cold_schools(
  p_state text default null, p_district text default null, p_page int default 1, p_size int default 20
) returns table(id uuid, name text, state text, district text, eligible bigint, coordinator_status text, total bigint)
language plpgsql security definer set search_path = public as $$
declare v_size int := least(greatest(coalesce(p_size, 20), 1), 200);
        v_off  int := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_size, 20), 1), 200);
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  select s.id, s.name, s.state, s.district, count(p.id), s.coordinator_status, count(*) over ()
  from schools s
  join user_profiles p on p.school_id = s.id and p.role = 'student' and isc_division_for_class(p.school_class) is not null
  where (p_state is null or s.state = p_state)
    and (p_district is null or s.district = p_district)
    and not exists (select 1 from isc_entries e where e.school_id = s.id)
  group by s.id
  order by count(p.id) desc, s.name
  limit v_size offset v_off;
end $$;
```

- [ ] **Step 2: Append checks**

```js
CHECKS.push(() => check('admin_isc_roster paging and filters', async () => {
  const { rows: [st] } = await db.query(`select key from admin_isc_breakdown() limit 1`)
  const p1 = await db.query(`select * from admin_isc_roster($1, null, null, null, 'submitted', null, null, null, 1, 50)`, [st.key])
  const p2 = await db.query(`select * from admin_isc_roster($1, null, null, null, 'submitted', null, null, null, 2, 50)`, [st.key])
  if (p1.rows.length !== 50) throw new Error('page 1 should have 50 rows')
  if (p1.rows[0].id === p2.rows[0].id) throw new Error('page 2 should differ from page 1')
  if (p1.rows.some((r) => r.status !== 'submitted')) throw new Error('status filter not applied')
  const { rows: [ref] } = await db.query(`select count(*)::int n from isc_entries e join schools s on s.id=e.school_id where s.state=$1 and e.status='submitted'`, [st.key])
  assertEqual(Number(p1.rows[0].total), ref.n, 'total matches reference')
  await assertIndexScan(`select * from admin_isc_roster(null, null, $1, null, null, null, null, null, 1, 50)`, [p1.rows[0].school_id], 'isc_entries')
}))
CHECKS.push(() => check('admin_isc_export_chunk keyset', async () => {
  const { rows: [st] } = await db.query(`select key from admin_isc_breakdown() limit 1`)
  const a = await db.query(`select * from admin_isc_export_chunk($1, null, null, null, null, null, null, null, null, null, 100)`, [st.key])
  const last = a.rows[a.rows.length - 1]
  const b = await db.query(`select * from admin_isc_export_chunk($1, null, null, null, null, null, null, null, $2, $3, 100)`, [st.key, last.created_at, last.id])
  if (b.rows.some((r) => a.rows.find((x) => x.id === r.id))) throw new Error('chunks overlap')
  let refused = false
  try { await db.query(`select * from admin_isc_export_chunk()`) } catch { refused = true }
  if (!refused) throw new Error('national export must be refused')
}))
CHECKS.push(() => check('admin_isc_cold_schools', async () => {
  const { rows } = await db.query(`select * from admin_isc_cold_schools(null, null, 1, 20)`)
  for (const r of rows) {
    const { rows: [{ n }] } = await db.query(`select count(*)::int n from isc_entries where school_id = $1`, [r.id])
    if (n !== 0) throw new Error(`${r.name} has entries but is listed cold`)
  }
}))
```

- [ ] **Step 3: Run the harness at both scales**

Run: `npm run admin-scale:verify` and the target-scale command.
Expected: all pass; the school-scoped roster reports under 200 ms even at target scale.

- [ ] **Step 4: Commit**

```bash
git add docs/admin-scale-migration.sql scripts/admin-scale/verify.mjs
git commit -m "feat(sql): paginated ISC roster, keyset export chunks and cold schools

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: Migration section E — users page, search, dashboard, similar schools batch; EXPLAIN block

**Files:**
- Modify: `docs/admin-scale-migration.sql`
- Modify: `scripts/admin-scale/verify.mjs`

**Interfaces:**
- Produces:
  - `admin_users_page(p_q text, p_role text, p_onboarded boolean, p_sort text, p_page int, p_size int) returns table(id uuid, full_name text, email text, role text, school_name text, school_state text, school_class text, onboarding_completed boolean, created_at timestamptz, total bigint)`; `p_sort` in `'created_desc' | 'created_asc' | 'name_asc'`.
  - `admin_search(p_q text, p_limit int default 10) returns table(kind text, id uuid, title text, subtitle text)`; kind is `'student' | 'school' | 'coordinator'`.
  - `admin_dashboard() returns jsonb` with keys `pending_schools, pending_coordinators, pending_certificates, active_support, students, students_onboarded, coordinators, schools_approved, isc (summary object), top_states[], stalled_states[], timeline[]`.
  - `admin_similar_schools_batch(p_school_ids uuid[]) returns table(school_id uuid, similar_id uuid, similar_name text, similar_address text, similar_review_status text, score real)`.

- [ ] **Step 1: Append section E**

```sql
-- ---------------------------------------------------------------
-- E. Users, search, dashboard, similar schools
-- ---------------------------------------------------------------
create or replace function admin_users_page(
  p_q text default null, p_role text default null, p_onboarded boolean default null,
  p_sort text default 'created_desc', p_page int default 1, p_size int default 50
) returns table(
  id uuid, full_name text, email text, role text, school_name text, school_state text, school_class text,
  onboarding_completed boolean, created_at timestamptz, total bigint
) language plpgsql security definer set search_path = public as $$
declare v_size int := least(greatest(coalesce(p_size, 50), 1), 200);
        v_off  int := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_size, 50), 1), 200);
        v_q text := nullif(lower(trim(coalesce(p_q, ''))), '');
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  select p.id, p.full_name, u.email, p.role, p.school_name, p.school_state, p.school_class,
         p.onboarding_completed, p.created_at, count(*) over ()
  from user_profiles p
  join auth.users u on u.id = p.id
  where (p_role is null or p.role = p_role)
    and (p_onboarded is null or p.onboarding_completed = p_onboarded)
    and (v_q is null
         or lower(coalesce(p.full_name, '')) like '%' || v_q || '%'
         or lower(u.email) like '%' || v_q || '%'
         or p.phone like '%' || v_q || '%'
         or lower(coalesce(p.school_name, '')) like '%' || v_q || '%')
  order by
    case when p_sort = 'name_asc' then lower(coalesce(p.full_name, '')) end asc,
    case when p_sort = 'created_asc' then p.created_at end asc,
    p.created_at desc
  limit v_size offset v_off;
end $$;

create or replace function admin_search(p_q text, p_limit int default 10)
returns table(kind text, id uuid, title text, subtitle text)
language plpgsql security definer set search_path = public as $$
declare v_q text := lower(trim(coalesce(p_q, ''))); v_lim int := least(greatest(coalesce(p_limit, 10), 1), 25);
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if length(v_q) < 2 then return; end if;
  return query
  (select 'student'::text, p.id, coalesce(p.full_name, u.email), concat_ws(' · ', p.school_name, p.school_class)
   from user_profiles p join auth.users u on u.id = p.id
   where p.role = 'student'
     and (lower(coalesce(p.full_name, '')) like '%' || v_q || '%' or lower(u.email) like '%' || v_q || '%' or p.phone like '%' || v_q || '%')
   order by p.full_name limit v_lim)
  union all
  (select 'school'::text, s.id, s.name, concat_ws(', ', s.district, s.state)
   from schools s where lower(s.name) like '%' || v_q || '%' or s.affiliation_no = v_q
   order by s.name limit v_lim)
  union all
  (select 'coordinator'::text, p.id, coalesce(p.full_name, u.email), coalesce(s.name, 'No school claimed')
   from user_profiles p join auth.users u on u.id = p.id left join schools s on s.coordinator_id = p.id
   where p.role = 'coordinator'
     and (lower(coalesce(p.full_name, '')) like '%' || v_q || '%' or lower(u.email) like '%' || v_q || '%' or p.phone like '%' || v_q || '%')
   order by p.full_name limit v_lim);
end $$;

create or replace function admin_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select jsonb_build_object(
    'pending_schools', (select count(*) from schools where review_status = 'pending'),
    'pending_coordinators', (select count(*) from schools where coordinator_status = 'pending'),
    'pending_certificates', (select count(*) from certificate_uploads where status = 'pending'),
    'active_support', (select count(*) from support_conversations where last_message_at > now() - interval '7 days'),
    'students', (select count(*) from user_profiles where role = 'student'),
    'students_onboarded', (select count(*) from user_profiles where role = 'student' and onboarding_completed),
    'coordinators', (select count(*) from user_profiles where role = 'coordinator'),
    'schools_approved', (select count(*) from schools where review_status = 'approved'),
    'isc', admin_isc_summary(),
    'top_states', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select * from admin_isc_breakdown() where eligible > 0
        order by submitted::numeric / eligible desc, eligible desc limit 5) t),
    'stalled_states', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select * from admin_isc_breakdown() where eligible >= 50
        order by submitted::numeric / eligible asc, eligible desc limit 5) t),
    'timeline', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from admin_isc_timeline(null, null, null, 7) t)
  ) into v;
  return v;
end $$;

create or replace function admin_similar_schools_batch(p_school_ids uuid[])
returns table(school_id uuid, similar_id uuid, similar_name text, similar_address text, similar_review_status text, score real)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  select s.id, f.id, f.name, f.address, f.review_status, f.score
  from unnest(p_school_ids) as s(id)
  cross join lateral find_similar_schools(s.id) f;
end $$;

-- ---------------------------------------------------------------
-- F. Run these on the live project to confirm index use (each should
--    show Index Scan / Bitmap Heap Scan, never "Seq Scan on isc_entries"
--    or "Seq Scan on user_profiles" for scoped queries):
--
-- explain analyze select * from admin_isc_roster(null, null, (select id from schools limit 1), null, null, null, null, null, 1, 50);
-- explain analyze select * from admin_users_page('sharma', 'student', null, 'created_desc', 1, 50);
-- explain analyze select * from admin_search('sharma', 10);
-- explain analyze select admin_isc_summary('Haryana');
-- ---------------------------------------------------------------
```

- [ ] **Step 2: Append checks**

```js
CHECKS.push(() => check('admin_users_page search and paging', async () => {
  const a = await db.query(`select * from admin_users_page('student 1', 'student', null, 'created_desc', 1, 50)`)
  if (!a.rows.length || a.rows.some((r) => !r.email)) throw new Error('rows need emails from auth.users')
  const b = await db.query(`select * from admin_users_page(null, null, true, 'name_asc', 1, 50)`)
  if (b.rows.some((r) => r.onboarding_completed !== true)) throw new Error('onboarded filter not applied')
  await assertIndexScan(`select * from admin_users_page('7', 'student', null, 'created_desc', 1, 50)`, [], 'user_profiles')
}))
CHECKS.push(() => check('admin_search groups kinds', async () => {
  const { rows } = await db.query(`select * from admin_search('school 1', 5)`)
  if (!rows.some((r) => r.kind === 'school')) throw new Error('should find schools')
  const { rows: short } = await db.query(`select * from admin_search('s', 5)`)
  assertEqual(short.length, 0, 'one-character search returns nothing')
}))
CHECKS.push(() => check('admin_dashboard shape', async () => {
  const { rows: [{ v }] } = await db.query(`select admin_dashboard() v`)
  for (const k of ['pending_schools','pending_coordinators','pending_certificates','students','isc','top_states','stalled_states','timeline']) if (!(k in v)) throw new Error(`missing ${k}`)
  assertEqual(v.timeline.length, 7, 'seven-day timeline')
}))
CHECKS.push(() => check('admin_similar_schools_batch', async () => {
  const { rows: ids } = await db.query(`select id from schools limit 5`)
  const { rows } = await db.query(`select * from admin_similar_schools_batch($1)`, [ids.map((r) => r.id)])
  if (rows.some((r) => !ids.find((i) => i.id === r.school_id))) throw new Error('rows must belong to requested schools')
}))
```

- [ ] **Step 3: Run the harness at both scales**

Run: `npm run admin-scale:verify` and the target-scale run.
Expected: all pass. The users page search at target scale reports under 1500 ms in pglite.

- [ ] **Step 4: Commit**

```bash
git add docs/admin-scale-migration.sql scripts/admin-scale/verify.mjs
git commit -m "feat(sql): users page, global search, dashboard and batched similar schools

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: App data layer foundations — scope, errors, cache, csv

**Files:**
- Create: `src/lib/admin/scope.ts`, `src/lib/admin/errors.ts`, `src/lib/admin/cache.ts`, `src/lib/admin/csv.ts`
- Test: `src/lib/admin/__tests__/scope.test.ts`, `errors.test.ts`, `cache.test.ts`, `csv.test.ts`

**Interfaces:**
- Produces:

```ts
// scope.ts
export interface IscScope { state?: string; district?: string; schoolId?: string }
export interface RosterFilters { track?: string; status?: string; division?: string; language?: string; q?: string; page: number }
export type SearchParams = Record<string, string | string[] | undefined>
export function parseRosterFilters(sp: SearchParams): RosterFilters
export function rosterFiltersToQuery(f: RosterFilters, overrides?: Partial<RosterFilters>): string  // "?track=..&page=2", '' when empty
export function scopeToRpcArgs(scope: IscScope): { p_state: string | null; p_district: string | null; p_school_id: string | null }
export function filtersToRpcArgs(f: RosterFilters): { p_track: string | null; p_status: string | null; p_division: string | null; p_language: string | null; p_q: string | null }
export function pageCount(total: number, size: number): number

// errors.ts
export type AdminResult<T> = { ok: true; data: T } | { ok: false; kind: 'migration-missing' | 'failed'; message: string }
export function mapRpcError(error: { code?: string; message?: string } | null): AdminResult<never>
export function ok<T>(data: T): AdminResult<T>

// cache.ts
export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T>  // default 60_000
export function invalidateAdminCache(prefix?: string): void

// csv.ts
export function csvRow(values: (string | number | null | undefined)[]): string  // RFC 4180 quoting, trailing \n
```

- [ ] **Step 1: Write the failing tests**

`src/lib/admin/__tests__/scope.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseRosterFilters, rosterFiltersToQuery, scopeToRpcArgs, filtersToRpcArgs, pageCount } from '@/lib/admin/scope'

describe('parseRosterFilters', () => {
  it('reads known keys and defaults page to 1', () => {
    expect(parseRosterFilters({ track: 'ai_for_impact', page: '3', junk: 'x' })).toEqual({ track: 'ai_for_impact', page: 3 })
  })
  it('ignores bad pages and empty strings', () => {
    expect(parseRosterFilters({ page: '-2', q: '' })).toEqual({ page: 1 })
    expect(parseRosterFilters({ page: 'abc' })).toEqual({ page: 1 })
  })
  it('takes the first value of an array', () => {
    expect(parseRosterFilters({ status: ['submitted', 'draft'] })).toEqual({ status: 'submitted', page: 1 })
  })
})

describe('rosterFiltersToQuery', () => {
  it('serialises only set keys and omits page 1', () => {
    expect(rosterFiltersToQuery({ track: 'puzzle_master', page: 1 })).toBe('?track=puzzle_master')
    expect(rosterFiltersToQuery({ page: 1 })).toBe('')
  })
  it('applies overrides and encodes', () => {
    expect(rosterFiltersToQuery({ q: 'a b', page: 1 }, { page: 2 })).toBe('?q=a+b&page=2')
  })
})

describe('rpc args', () => {
  it('maps scope with nulls', () => {
    expect(scopeToRpcArgs({ state: 'Haryana' })).toEqual({ p_state: 'Haryana', p_district: null, p_school_id: null })
  })
  it('maps filters with nulls', () => {
    expect(filtersToRpcArgs({ status: 'draft', page: 4 })).toEqual({ p_track: null, p_status: 'draft', p_division: null, p_language: null, p_q: null })
  })
})

describe('pageCount', () => {
  it('rounds up and never returns below one', () => {
    expect(pageCount(0, 50)).toBe(1)
    expect(pageCount(51, 50)).toBe(2)
  })
})
```

`src/lib/admin/__tests__/errors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapRpcError, ok } from '@/lib/admin/errors'

describe('mapRpcError', () => {
  it('recognises a missing function as the migration not having run', () => {
    expect(mapRpcError({ code: 'PGRST202', message: 'Could not find the function' })).toEqual({ ok: false, kind: 'migration-missing', message: expect.stringContaining('admin-scale-migration.sql') })
  })
  it('passes other errors through as failed', () => {
    expect(mapRpcError({ code: '57014', message: 'canceling statement due to statement timeout' })).toEqual({ ok: false, kind: 'failed', message: 'canceling statement due to statement timeout' })
  })
  it('wraps data', () => {
    expect(ok(3)).toEqual({ ok: true, data: 3 })
  })
})
```

`src/lib/admin/__tests__/cache.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { cached, invalidateAdminCache } from '@/lib/admin/cache'

describe('cached', () => {
  it('returns the stored value inside the ttl and recomputes after invalidation', async () => {
    invalidateAdminCache()
    const fn = vi.fn(async () => Math.random())
    const a = await cached('k', fn, 60_000)
    const b = await cached('k', fn, 60_000)
    expect(a).toBe(b)
    expect(fn).toHaveBeenCalledTimes(1)
    invalidateAdminCache('k')
    await cached('k', fn, 60_000)
    expect(fn).toHaveBeenCalledTimes(2)
  })
  it('does not cache a rejected promise', async () => {
    invalidateAdminCache()
    let n = 0
    const fn = async () => { n++; if (n === 1) throw new Error('boom'); return n }
    await expect(cached('e', fn)).rejects.toThrow('boom')
    expect(await cached('e', fn)).toBe(2)
  })
})
```

`src/lib/admin/__tests__/csv.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { csvRow } from '@/lib/admin/csv'

describe('csvRow', () => {
  it('quotes commas, quotes and newlines and ends the line', () => {
    expect(csvRow(['a', 'b,c', 'say "hi"', null, 3, 'x\ny'])).toBe('a,"b,c","say ""hi""",,3,"x\ny"\n')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/admin`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the four modules**

`src/lib/admin/scope.ts`:

```ts
export interface IscScope { state?: string; district?: string; schoolId?: string }
export interface RosterFilters { track?: string; status?: string; division?: string; language?: string; q?: string; page: number }
export type SearchParams = Record<string, string | string[] | undefined>

const FILTER_KEYS = ['track', 'status', 'division', 'language', 'q'] as const

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s && s.trim() !== '' ? s : undefined
}

export function parseRosterFilters(sp: SearchParams): RosterFilters {
  const out: RosterFilters = { page: 1 }
  for (const k of FILTER_KEYS) { const v = first(sp[k]); if (v) out[k] = v }
  const p = Number.parseInt(first(sp.page) ?? '', 10)
  if (Number.isFinite(p) && p > 1) out.page = p
  return out
}

export function rosterFiltersToQuery(f: RosterFilters, overrides: Partial<RosterFilters> = {}): string {
  const merged = { ...f, ...overrides }
  const q = new URLSearchParams()
  for (const k of FILTER_KEYS) { const v = merged[k]; if (v) q.set(k, v) }
  if (merged.page > 1) q.set('page', String(merged.page))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function scopeToRpcArgs(scope: IscScope) {
  return { p_state: scope.state ?? null, p_district: scope.district ?? null, p_school_id: scope.schoolId ?? null }
}

export function filtersToRpcArgs(f: RosterFilters) {
  return { p_track: f.track ?? null, p_status: f.status ?? null, p_division: f.division ?? null, p_language: f.language ?? null, p_q: f.q ?? null }
}

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size))
}
```

`src/lib/admin/errors.ts`:

```ts
export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'migration-missing' | 'failed'; message: string }

/** PostgREST answers PGRST202 when the function does not exist: the migration has not been run. */
export function mapRpcError(error: { code?: string; message?: string } | null): AdminResult<never> {
  if (error?.code === 'PGRST202') {
    return { ok: false, kind: 'migration-missing', message: 'Run docs/admin-scale-migration.sql in the Supabase SQL editor, then reload.' }
  }
  return { ok: false, kind: 'failed', message: error?.message ?? 'Unknown error' }
}

export function ok<T>(data: T): AdminResult<T> { return { ok: true, data } }
```

`src/lib/admin/cache.ts`:

```ts
/*
  Sixty seconds, in memory, per isolate. The Worker has no writable
  incremental cache, so this is the only cache there is; it means a room of
  admins refreshing costs one query a minute per isolate, which is the point.
*/
const store = new Map<string, { until: number; value: unknown }>()

export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.until > Date.now()) return hit.value as T
  const value = await fn()
  store.set(key, { until: Date.now() + ttlMs, value })
  return value
}

export function invalidateAdminCache(prefix = ''): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k)
}
```

`src/lib/admin/csv.ts`:

```ts
export function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map((v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',') + '\n'
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run src/lib/admin && npx tsc --noEmit && npx eslint src/lib/admin`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin
git commit -m "feat(admin): scope parsing, result mapping, a 60-second cache and CSV rows

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 7: Database types and the ISC readers

**Files:**
- Modify: `src/lib/types/database.ts` (add `division` to `isc_entries` Row/Insert/Update; add the ten functions under `Functions`)
- Create: `src/lib/admin/isc.ts`
- Test: `src/lib/admin/__tests__/isc.test.ts`

**Interfaces:**
- Consumes: Task 6 exports.
- Produces:

```ts
export interface CountRow { key: string; count: number }
export interface IscSummary { eligible: number; started: number; submitted: number; schools_with_entries: number; by_track: CountRow[]; by_division: CountRow[]; by_status: CountRow[]; by_language: CountRow[] }
export interface BreakdownRow { key: string; label: string; eligible: number; started: number; submitted: number; schools: number }
export interface TimelinePoint { day: string; started: number; submitted: number }
export interface RosterRow { id: string; track: string; status: string; division: string | null; language: string | null; school_id: string; school_name: string; leader_id: string | null; leader_name: string | null; member_count: number; created_at: string; submitted_at: string | null }
export interface Page<T> { rows: T[]; total: number; page: number; size: number }
export interface ColdSchoolRow { id: string; name: string; state: string; district: string; eligible: number; coordinator_status: string }
export function getIscSummary(supabase, scope: IscScope): Promise<AdminResult<IscSummary>>
export function getIscBreakdown(supabase, scope: Pick<IscScope,'state'|'district'>): Promise<AdminResult<BreakdownRow[]>>
export function getIscTimeline(supabase, scope: IscScope, days?: number): Promise<AdminResult<TimelinePoint[]>>
export function getIscRoster(supabase, scope: IscScope, filters: RosterFilters, size?: number): Promise<AdminResult<Page<RosterRow>>>
export function getColdSchools(supabase, scope: Pick<IscScope,'state'|'district'>, page: number, size?: number): Promise<AdminResult<Page<ColdSchoolRow>>>
export async function* iterateExport(supabase, scope: IscScope, filters: RosterFilters): AsyncGenerator<RosterRow[]>
```

`supabase` is the type returned by `createClient()` from `@/lib/supabase/server` (use `Awaited<ReturnType<typeof createClient>>`).

- [ ] **Step 1: Add the types to database.ts**

In the `Functions` block of `src/lib/types/database.ts`, add entries mirroring the SQL signatures. Example for two; do all ten (`admin_isc_summary`, `admin_isc_breakdown`, `admin_isc_timeline`, `admin_isc_roster`, `admin_isc_export_chunk`, `admin_isc_cold_schools`, `admin_users_page`, `admin_search`, `admin_dashboard`, `admin_similar_schools_batch`):

```ts
      admin_isc_summary: {
        Args: { p_state?: string | null; p_district?: string | null; p_school_id?: string | null }
        Returns: Json
      }
      admin_isc_roster: {
        Args: {
          p_state?: string | null; p_district?: string | null; p_school_id?: string | null
          p_track?: string | null; p_status?: string | null; p_division?: string | null
          p_language?: string | null; p_q?: string | null; p_page?: number; p_size?: number
        }
        Returns: {
          id: string; track: string; status: string; division: string | null; language: string | null
          school_id: string; school_name: string; leader_id: string | null; leader_name: string | null
          member_count: number; created_at: string; submitted_at: string | null; total: number
        }[]
      }
```

Add `division: string | null` to `isc_entries` Row, and `division?: string | null` to Insert and Update.

- [ ] **Step 2: Write the failing test (mocked client)**

`src/lib/admin/__tests__/isc.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { getIscSummary, getIscRoster, iterateExport } from '@/lib/admin/isc'
import { invalidateAdminCache } from '@/lib/admin/cache'

function client(rpcImpl: (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async (name: string, args: Record<string, unknown>) => rpcImpl(name, args)) } as never
}

describe('getIscSummary', () => {
  it('passes scope args and coerces the JSON', async () => {
    invalidateAdminCache()
    const c = client((name, args) => {
      expect(name).toBe('admin_isc_summary')
      expect(args).toEqual({ p_state: 'Haryana', p_district: null, p_school_id: null })
      return { data: { eligible: 10, started: 4, submitted: 2, schools_with_entries: 1, by_track: [], by_division: [], by_status: [], by_language: [] }, error: null }
    })
    const r = await getIscSummary(c, { state: 'Haryana' })
    expect(r).toEqual({ ok: true, data: expect.objectContaining({ eligible: 10 }) })
  })
  it('maps a missing function', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: null, error: { code: 'PGRST202', message: 'nope' } }))
    expect(await getIscSummary(c, {})).toMatchObject({ ok: false, kind: 'migration-missing' })
  })
})

describe('getIscRoster', () => {
  it('lifts total out of the rows', async () => {
    invalidateAdminCache()
    const row = { id: 'e1', track: 'ai_for_impact', status: 'draft', division: 'group1', language: 'English', school_id: 's', school_name: 'S', leader_id: 'u', leader_name: 'U', member_count: 1, created_at: 'now', submitted_at: null, total: 123 }
    const c = client(() => ({ data: [row], error: null }))
    const r = await getIscRoster(c, {}, { page: 2 })
    expect(r).toEqual({ ok: true, data: { rows: [expect.not.objectContaining({ total: 123 })], total: 123, page: 2, size: 50 } })
  })
  it('returns an empty page with total 0', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: [], error: null }))
    expect(await getIscRoster(c, {}, { page: 1 })).toEqual({ ok: true, data: { rows: [], total: 0, page: 1, size: 50 } })
  })
})

describe('iterateExport', () => {
  it('follows the keyset until a short chunk', async () => {
    const chunks = [[{ id: 'a', created_at: '2026-09-01' }, { id: 'b', created_at: '2026-08-31' }], [{ id: 'c', created_at: '2026-08-30' }]]
    let call = 0
    const c = client((_n, args) => { if (call === 1) expect(args).toMatchObject({ p_after_created: '2026-08-31', p_after_id: 'b' }); return { data: chunks[call++], error: null } })
    const seen: string[] = []
    for await (const rows of iterateExport(c, { state: 'X' }, { page: 1 })) seen.push(...rows.map((r) => r.id))
    expect(seen).toEqual(['a', 'b', 'c'])
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/admin/__tests__/isc.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement isc.ts**

```ts
import type { createClient } from '@/lib/supabase/server'
import { cached } from '@/lib/admin/cache'
import { mapRpcError, ok, type AdminResult } from '@/lib/admin/errors'
import { filtersToRpcArgs, scopeToRpcArgs, type IscScope, type RosterFilters } from '@/lib/admin/scope'

type Db = Awaited<ReturnType<typeof createClient>>

export interface CountRow { key: string; count: number }
export interface IscSummary { eligible: number; started: number; submitted: number; schools_with_entries: number; by_track: CountRow[]; by_division: CountRow[]; by_status: CountRow[]; by_language: CountRow[] }
export interface BreakdownRow { key: string; label: string; eligible: number; started: number; submitted: number; schools: number }
export interface TimelinePoint { day: string; started: number; submitted: number }
export interface RosterRow { id: string; track: string; status: string; division: string | null; language: string | null; school_id: string; school_name: string; leader_id: string | null; leader_name: string | null; member_count: number; created_at: string; submitted_at: string | null }
export interface Page<T> { rows: T[]; total: number; page: number; size: number }
export interface ColdSchoolRow { id: string; name: string; state: string; district: string; eligible: number; coordinator_status: string }

const EXPORT_CHUNK = 1000
export const ROSTER_PAGE = 50
export const COLD_PAGE = 20

function key(name: string, args: unknown) { return `${name}:${JSON.stringify(args)}` }

async function rpc<T>(db: Db, name: string, args: Record<string, unknown>): Promise<AdminResult<T>> {
  const { data, error } = await db.rpc(name as never, args as never)
  if (error) return mapRpcError(error)
  return ok(data as T)
}

export function getIscSummary(db: Db, scope: IscScope) {
  const args = scopeToRpcArgs(scope)
  return cached(key('admin_isc_summary', args), () => rpc<IscSummary>(db, 'admin_isc_summary', args))
}

export function getIscBreakdown(db: Db, scope: Pick<IscScope, 'state' | 'district'>) {
  const args = { p_state: scope.state ?? null, p_district: scope.district ?? null }
  return cached(key('admin_isc_breakdown', args), () => rpc<BreakdownRow[]>(db, 'admin_isc_breakdown', args))
}

export function getIscTimeline(db: Db, scope: IscScope, days = 30) {
  const args = { ...scopeToRpcArgs(scope), p_days: days }
  return cached(key('admin_isc_timeline', args), () => rpc<TimelinePoint[]>(db, 'admin_isc_timeline', args))
}

function lift<T extends { total: number }>(rows: T[] | null, page: number, size: number): Page<Omit<T, 'total'>> {
  const list = rows ?? []
  const total = list.length ? Number(list[0].total) : 0
  return { rows: list.map(({ total: _t, ...rest }) => rest), total, page, size }
}

export async function getIscRoster(db: Db, scope: IscScope, filters: RosterFilters, size = ROSTER_PAGE): Promise<AdminResult<Page<RosterRow>>> {
  const args = { ...scopeToRpcArgs(scope), ...filtersToRpcArgs(filters), p_page: filters.page, p_size: size }
  return cached(key('admin_isc_roster', args), async () => {
    const r = await rpc<(RosterRow & { total: number })[]>(db, 'admin_isc_roster', args)
    return r.ok ? ok(lift(r.data, filters.page, size)) : r
  })
}

export async function getColdSchools(db: Db, scope: Pick<IscScope, 'state' | 'district'>, page: number, size = COLD_PAGE): Promise<AdminResult<Page<ColdSchoolRow>>> {
  const args = { p_state: scope.state ?? null, p_district: scope.district ?? null, p_page: page, p_size: size }
  return cached(key('admin_isc_cold_schools', args), async () => {
    const r = await rpc<(ColdSchoolRow & { total: number })[]>(db, 'admin_isc_cold_schools', args)
    return r.ok ? ok(lift(r.data, page, size)) : r
  })
}

/** Keyset pages of the current scope and filters, for streaming to CSV. Not cached. */
export async function* iterateExport(db: Db, scope: IscScope, filters: RosterFilters): AsyncGenerator<RosterRow[]> {
  let after: { created: string; id: string } | null = null
  for (;;) {
    const args = { ...scopeToRpcArgs(scope), ...filtersToRpcArgs(filters), p_after_created: after?.created ?? null, p_after_id: after?.id ?? null, p_size: EXPORT_CHUNK }
    const { data, error } = await db.rpc('admin_isc_export_chunk' as never, args as never)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as RosterRow[]
    if (!rows.length) return
    yield rows
    if (rows.length < EXPORT_CHUNK) return
    const last = rows[rows.length - 1]
    after = { created: last.created_at, id: last.id }
  }
}
```

- [ ] **Step 5: Run tests, typecheck, lint; commit**

Run: `npx vitest run src/lib/admin && npx tsc --noEmit && npx eslint src/lib/admin src/lib/types/database.ts`

```bash
git add src/lib/admin src/lib/types/database.ts
git commit -m "feat(admin): typed readers for the ISC admin functions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: ISC admin pages on the new data layer

**Files:**
- Create: `src/components/admin/migration-missing.tsx`, `src/components/admin/section-failed.tsx`, `src/components/admin/pagination.tsx`, `src/components/admin/isc-roster-table.tsx`, `src/components/admin/isc-cold-schools.tsx`
- Modify: `src/app/(admin)/admin/isc/page.tsx`, `src/app/(admin)/admin/isc/state/[state]/page.tsx`, `.../district/[district]/page.tsx`, `.../school/[schoolId]/page.tsx`
- Modify: `src/components/admin/isc-funnel-panel.tsx`, `isc-comparison-chart.tsx`, `isc-insights.tsx`, `isc-export.tsx`, `isc-outreach.tsx` (props become function outputs)
- Delete: `src/lib/isc/admin-data.ts`, `src/lib/isc/analytics.ts`, `src/lib/isc/funnel.ts`, `src/lib/isc/admin-filters.ts`, `src/lib/isc/outreach.ts`, their `__tests__`, `src/components/admin/isc-filters.tsx`, `src/components/admin/isc-roster.tsx`, `src/components/admin/isc-student-profile.tsx` if only the roster used it

Read every file you modify in full first. Keep the visual design of each component: same cards, same colours, same layout. Only the data source changes.

**Interfaces:**
- Consumes: Task 6 and 7 exports.
- Produces: `<Pagination page total size hrefFor(page) />`, `<IscRosterTable page filters scope />`, `<IscColdSchools page scope />`, `<MigrationMissing message />`, `<SectionFailed title message />`.

- [ ] **Step 1: Panels and pagination**

`src/components/admin/migration-missing.tsx`:

```tsx
import { Database } from 'lucide-react'

export function MigrationMissing({ message }: { message: string }) {
  return (
    <div className="clay-card flex items-start gap-4 p-6" role="alert">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-yellow/15">
        <Database className="h-5 w-5 text-accent-yellow" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display font-bold text-foreground">This page needs a database update</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    </div>
  )
}
```

`src/components/admin/section-failed.tsx`:

```tsx
import { AlertTriangle } from 'lucide-react'

export function SectionFailed({ title, message }: { title: string; message: string }) {
  return (
    <div className="clay-card flex items-start gap-3 p-5" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-pink" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title} could not load</p>
        <p className="mt-0.5 text-xs text-muted">{message}</p>
      </div>
    </div>
  )
}
```

`src/components/admin/pagination.tsx`:

```tsx
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageCount } from '@/lib/admin/scope'

export function Pagination({ page, total, size, hrefFor }: { page: number; total: number; size: number; hrefFor: (page: number) => string }) {
  const pages = pageCount(total, size)
  if (pages <= 1) return null
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)
  const link = 'inline-flex h-9 items-center gap-1 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm font-semibold text-foreground hover:border-primary'
  const disabled = 'pointer-events-none opacity-40'
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-4" aria-label="Pages">
      <p className="text-xs text-muted">Showing {from.toLocaleString('en-IN')} to {to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}</p>
      <div className="flex items-center gap-2">
        <Link href={hrefFor(page - 1)} className={`${link} ${page <= 1 ? disabled : ''}`} aria-disabled={page <= 1}><ChevronLeft className="h-4 w-4" /> Previous</Link>
        <span className="text-xs text-muted">Page {page} of {pages}</span>
        <Link href={hrefFor(page + 1)} className={`${link} ${page >= pages ? disabled : ''}`} aria-disabled={page >= pages}>Next <ChevronRight className="h-4 w-4" /></Link>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Roster table and cold schools**

`src/components/admin/isc-roster-table.tsx` (server component):

```tsx
import Link from 'next/link'
import { ISC_TRACKS, PUZZLE_MASTER, LANGUAGE_OPTIONS } from '@/lib/isc/tracks'
import { ISC_GROUPS, iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
import { rosterFiltersToQuery, type IscScope, type RosterFilters } from '@/lib/admin/scope'
import type { Page, RosterRow } from '@/lib/admin/isc'
import { Pagination } from '@/components/admin/pagination'

const TRACK_NAMES: Record<string, string> = Object.fromEntries([...ISC_TRACKS.map((t) => [t.id, t.name]), ['puzzle_master', PUZZLE_MASTER.name]])

function Select({ name, value, options, all }: { name: string; value?: string; options: { value: string; label: string }[]; all: string }) {
  return (
    <select name={name} defaultValue={value ?? ''} className="h-10 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm">
      <option value="">{all}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function IscRosterTable({ page, filters, scope, basePath }: { page: Page<RosterRow>; filters: RosterFilters; scope: IscScope; basePath: string }) {
  const hrefFor = (p: number) => `${basePath}${rosterFiltersToQuery(filters, { page: p })}`
  const national = !scope.state && !scope.schoolId
  const filtered = Boolean(filters.track || filters.status || filters.division || filters.language || filters.q)
  return (
    <section className="clay-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-foreground sm:text-lg">Entries</h2>
        <span className="text-xs text-muted">{page.total.toLocaleString('en-IN')} in this view</span>
      </div>
      {/* A GET form: the filters live in the URL, so a filtered view can be shared. */}
      <form method="get" action={basePath} className="mt-4 flex flex-wrap gap-2">
        <Select name="track" value={filters.track} all="All championships" options={Object.entries(TRACK_NAMES).map(([value, label]) => ({ value, label }))} />
        <Select name="status" value={filters.status} all="Any status" options={[{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }]} />
        <Select name="division" value={filters.division} all="Both divisions" options={(Object.keys(ISC_GROUPS) as IscGroup[]).map((g) => ({ value: g, label: iscGroupLabel(g) }))} />
        <Select name="language" value={filters.language} all="Any language" options={LANGUAGE_OPTIONS.map((l) => ({ value: l, label: l }))} />
        <input name="q" defaultValue={filters.q ?? ''} placeholder="Student or school" className="h-10 min-w-[12rem] flex-1 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm" />
        <button type="submit" className="clay-button h-10 bg-cta px-4 text-sm font-semibold text-white">Apply</button>
        {filtered && <Link href={basePath} className="inline-flex h-10 items-center px-3 text-sm text-muted hover:text-foreground">Clear</Link>}
      </form>
      {national && !filtered ? (
        <p className="mt-6 text-sm text-muted">Pick a state above, or add a filter or search, to list entries. Every entry in India is too many to page through.</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-bold uppercase tracking-wider text-foreground/50">
                <tr><th className="py-2 pr-3">Student</th><th className="py-2 pr-3">School</th><th className="py-2 pr-3">Championship</th><th className="py-2 pr-3">Division</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Team</th><th className="py-2">Started</th></tr>
              </thead>
              <tbody>
                {page.rows.map((r) => (
                  <tr key={r.id} className="border-t border-black/[0.05]">
                    <td className="py-2 pr-3">{r.leader_id ? <Link href={`/admin/users/${r.leader_id}`} className="font-semibold text-primary hover:underline">{r.leader_name ?? 'Unnamed'}</Link> : 'Unnamed'}</td>
                    <td className="py-2 pr-3 text-muted">{r.school_name}</td>
                    <td className="py-2 pr-3">{TRACK_NAMES[r.track] ?? r.track}</td>
                    <td className="py-2 pr-3 text-muted">{r.division ? iscGroupLabel(r.division as IscGroup) : '—'}</td>
                    <td className="py-2 pr-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.status === 'submitted' ? 'bg-green-50 text-green-700' : 'bg-accent-yellow/15 text-amber-700'}`}>{r.status === 'submitted' ? 'Submitted' : 'Draft'}</span></td>
                    <td className="py-2 pr-3 text-muted">{r.member_count}</td>
                    <td className="py-2 text-muted">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  </tr>
                ))}
                {page.rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">Nothing matches.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={page.page} total={page.total} size={page.size} hrefFor={hrefFor} />
        </>
      )}
    </section>
  )
}
```

`src/components/admin/isc-cold-schools.tsx` renders `Page<ColdSchoolRow>` as a list of school name, district, eligible count, coordinator status chip, and a `Pagination` whose `hrefFor` sets a `cold` search param (`?cold=2`) and preserves the roster filters via `rosterFiltersToQuery(filters, {})` merged by hand: build with `new URLSearchParams(rosterFiltersToQuery(filters).slice(1))`, set `cold`, and return `${basePath}?${qs}`.

- [ ] **Step 3: Rewrite the four ISC pages**

Pattern for every page (shown for the state page; national omits `state`, district adds `district`, school uses `schoolId` and skips breakdown and cold schools):

```tsx
import { createClient } from '@/lib/supabase/server'
import { getIscSummary, getIscBreakdown, getIscTimeline, getIscRoster, getColdSchools } from '@/lib/admin/isc'
import { parseRosterFilters, type IscScope } from '@/lib/admin/scope'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscComparisonChart } from '@/components/admin/isc-comparison-chart'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscExport } from '@/components/admin/isc-export'
import { IscRosterTable } from '@/components/admin/isc-roster-table'
import { IscColdSchools } from '@/components/admin/isc-cold-schools'

export default async function IscStatePage({ params, searchParams }: { params: Promise<{ state: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { state: raw } = await params
  const state = decodeURIComponent(raw)
  const sp = await searchParams
  const filters = parseRosterFilters(sp)
  const coldPage = Math.max(1, Number.parseInt(String(sp.cold ?? '1'), 10) || 1)
  const scope: IscScope = { state }
  const basePath = `/admin/isc/state/${encodeURIComponent(state)}`
  const supabase = await createClient()

  const [summary, breakdown, timeline, roster, cold] = await Promise.all([
    getIscSummary(supabase, scope), getIscBreakdown(supabase, scope), getIscTimeline(supabase, scope),
    getIscRoster(supabase, scope, filters), getColdSchools(supabase, scope, coldPage),
  ])
  if (!summary.ok && summary.kind === 'migration-missing') return <MigrationMissing message={summary.message} />

  return (
    <div className="space-y-6">
      <IscBreadcrumb segments={[{ label: 'All India', href: '/admin/isc' }]} current={state} />
      {summary.ok ? <IscFunnelPanel summary={summary.data} /> : <SectionFailed title="The funnel" message={summary.message} />}
      <div className="flex justify-end"><IscExport scope={scope} filters={filters} /></div>
      {breakdown.ok ? <IscComparisonChart rows={breakdown.data} level="district" basePath={basePath} /> : <SectionFailed title="Districts" message={breakdown.message} />}
      {summary.ok && timeline.ok ? <IscInsights summary={summary.data} timeline={timeline.data} /> : null}
      {roster.ok ? <IscRosterTable page={roster.data} filters={filters} scope={scope} basePath={basePath} /> : <SectionFailed title="Entries" message={roster.message} />}
      {cold.ok ? <IscColdSchools page={cold.data} filters={filters} basePath={basePath} /> : <SectionFailed title="Schools without entries" message={cold.message} />}
    </div>
  )
}
```

- [ ] **Step 4: Re-prop the five presentational components**

- `IscFunnelPanel({ summary })`: eligible, started, submitted, schools_with_entries; activation = started/eligible, completion = submitted/started, both rounded, 0 when the divisor is 0. Keep the current strip layout.
- `IscComparisonChart({ rows, level, basePath })`: bars per `BreakdownRow`, bar length by `submitted / max(eligible)`; each label links to the next level (`level === 'state'` → `/admin/isc/state/<key>`, `'district'` → `${basePath}/district/<key>`, `'school'` → `${basePath}/school/<key>`). Keep the current bar styling.
- `IscInsights({ summary, timeline })`: the by-track, by-division, by-status, by-language lists and the timeline sparkline. Remove any panel whose data no longer exists (stale drafts, class distribution, top schools) rather than fake it.
- `IscExport({ scope, filters })`: a link to `/admin/isc/export?state=..&district=..&schoolId=..` plus the filter query; hidden when there is no state and no school (national), with a one-line note "Export is available from a state, district or school".
- `IscOutreach` is replaced by `IscColdSchools`; delete `isc-outreach.tsx` if nothing else imports it.

- [ ] **Step 5: Delete the in-memory layer**

Delete the files listed under Deleted. Run `grep -rn "admin-data\|isc/analytics\|isc/funnel\|admin-filters\|isc/outreach\|isc-filters\|isc-roster'" src` and fix any remaining import. `src/lib/isc/roster.ts` (coordinator roster) stays.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/\(admin\)/admin/isc src/components/admin src/lib/admin && npx vitest run && SUPABASE_SERVICE_ROLE_KEY= npx next build 2>&1 | grep -E "Compiled|Failed|error"`
Expected: clean; build compiles. Then start `npx next dev --port 3000`, sign in as an admin (the orchestrator provides credentials), open `/admin/isc`: with the migration not yet run on the live project you must see the `MigrationMissing` panel and no crash.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "feat(admin): ISC pages read database answers instead of loading every row

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: Streaming CSV export route

**Files:**
- Create: `src/app/(admin)/admin/isc/export/route.ts`

**Interfaces:**
- Consumes: `iterateExport`, `csvRow`, `parseRosterFilters`.

- [ ] **Step 1: Write the route**

Read `node_modules/next/dist/docs/` on route handlers first. Then:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { iterateExport } from '@/lib/admin/isc'
import { csvRow } from '@/lib/admin/csv'
import { parseRosterFilters, type IscScope } from '@/lib/admin/scope'

const HEADER = ['Entry id', 'Championship', 'Status', 'Division', 'Language', 'School', 'Leader', 'Team size', 'Started', 'Submitted']

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Sign in required', { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new NextResponse('Admins only', { status: 403 })

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries())
  const scope: IscScope = { state: sp.state || undefined, district: sp.district || undefined, schoolId: sp.schoolId || undefined }
  if (!scope.state && !scope.schoolId) return new NextResponse('Export is available from a state, district or school, not for all of India.', { status: 400 })
  const filters = parseRosterFilters(sp)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode('﻿' + csvRow(HEADER)))
      try {
        for await (const rows of iterateExport(supabase, scope, filters)) {
          const text = rows.map((r) => csvRow([r.id, r.track, r.status, r.division, r.language, r.school_name, r.leader_name, r.member_count, r.created_at, r.submitted_at])).join('')
          controller.enqueue(encoder.encode(text))
        }
      } catch (e) {
        controller.enqueue(encoder.encode(csvRow(['Export stopped', e instanceof Error ? e.message : 'unknown error'])))
      } finally { controller.close() }
    },
  })
  const name = ['isc-entries', scope.state, scope.district, scope.schoolId].filter(Boolean).join('-').replace(/[^a-z0-9-]+/gi, '_')
  return new Response(stream, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"`, 'Cache-Control': 'no-store' } })
}
```

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit && npx eslint "src/app/(admin)/admin/isc/export/route.ts"`; `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/isc/export` must be 401 signed out.

```bash
git add "src/app/(admin)/admin/isc/export/route.ts"
git commit -m "feat(admin): stream a scoped ISC export as CSV in keyset chunks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Phase 2 — Users and global search

### Task 10: Users reader and the paginated users page

**Files:**
- Create: `src/lib/admin/users.ts`, `src/lib/admin/__tests__/users.test.ts`
- Modify: `src/app/(admin)/admin/users/page.tsx`

**Interfaces:**
- Produces:

```ts
export interface UserRow { id: string; full_name: string | null; email: string; role: string; school_name: string | null; school_state: string | null; school_class: string | null; onboarding_completed: boolean; created_at: string }
export interface UsersQuery { q?: string; role?: string; onboarded?: boolean; sort: 'created_desc' | 'created_asc' | 'name_asc'; page: number }
export function parseUsersQuery(sp: SearchParams): UsersQuery
export function usersQueryToString(q: UsersQuery, overrides?: Partial<UsersQuery>): string
export function getUsersPage(db, q: UsersQuery, size?: number): Promise<AdminResult<Page<UserRow>>>
export interface SearchHit { kind: 'student' | 'school' | 'coordinator'; id: string; title: string; subtitle: string }
export function searchAll(db, q: string): Promise<AdminResult<SearchHit[]>>
```

- [ ] **Step 1: Tests for the pure parts** (same style as Task 6): `parseUsersQuery({ role: 'student', onboarded: 'no', sort: 'name_asc', page: '2' })` → `{ role: 'student', onboarded: false, sort: 'name_asc', page: 2 }`; unknown sort falls back to `created_desc`; `usersQueryToString` omits defaults; `getUsersPage` lifts `total` exactly like `getIscRoster` (mocked client); `searchAll` returns `[]` for a one-character query without calling rpc.

- [ ] **Step 2: Implement users.ts** following `isc.ts` exactly: `cached` + `rpc` + `lift`. `searchAll` is cached for 15 seconds, not 60.

- [ ] **Step 3: Rewrite the users page**

Layout: `PageHeader`, then a `clay-card` with a GET form (search input, role select with student/coordinator/vendor/admin, onboarding select with any/yes/no, sort select), a table with columns Name (link to `/admin/users/<id>`), Email, Role chip, School, State, Class, Onboarded (tick or dash), Joined, and `Pagination` with `hrefFor = (p) => '/admin/users' + usersQueryToString(q, { page: p })`. Show `MigrationMissing` on that error, `SectionFailed` on others. Remove the old `admin_list_users` call and the JS filtering.

- [ ] **Step 4: Verify and commit**

Run the standard checks and the dev server: `/admin/users?q=probe&role=student` renders the panel or a table.

```bash
git add src/lib/admin/users.ts src/lib/admin/__tests__/users.test.ts "src/app/(admin)/admin/users/page.tsx"
git commit -m "feat(admin): users list paged and searched by the database

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 11: Student detail page gains ISC, family, school and certificates

**Files:**
- Modify: `src/app/(admin)/admin/users/[id]/page.tsx`

Read it in full first. It already loads the profile, growth scores and family. Add, for `role === 'student'`, three sections, each its own query scoped to this student and each wrapped so a failure shows `SectionFailed` for that section only:

1. **ISC entries**: `isc_entry_members` where `user_id = id` joined to `isc_entries` (`id, track, status, division, submitted_at, school_id`) and to `schools(name)`; list track name, status chip, division label, submitted date, and teammates (a second query on `isc_entry_members` for those entry ids with `user_profiles(full_name)`).
2. **School and coordinator**: `schools` by `profile.school_id` with `coordinator_id`, then that coordinator's `full_name, phone`; link to `/admin/coordinators`.
3. **Certificates**: `certificate_uploads` for this student, status chip, points, date; link to `/admin/certificates/<id>`.

Use the existing card styling on that page. Commit as `feat(admin): everything about one student on one screen`.

### Task 12: Global search in the admin header

**Files:**
- Create: `src/app/(admin)/admin/search/route.ts`, `src/components/admin/global-search.tsx`
- Modify: `src/components/admin/admin-nav.tsx` (or the admin layout, whichever renders the header; read both)

- [ ] **Step 1: JSON route** at `/admin/search?q=`: same auth check as the export route; returns `searchAll` data as `{ hits: SearchHit[] }`, `[]` for under two characters; `Cache-Control: no-store`.

- [ ] **Step 2: Client component** `GlobalSearch`: an input with a search icon; debounce 250 ms; fetch the route; render hits grouped by kind under small headings Students / Schools / Coordinators; each hit links to `/admin/users/<id>`, `/admin/schools?q=<name>` (schools page gains a `q` param in Task 13; until then link to `/admin/isc` school page is unknown, so link schools to `/admin/schools?q=`), `/admin/coordinators?q=<name>`. Escape closes; arrow keys move; Enter opens the highlighted hit. Announce results with `aria-live="polite"`.

- [ ] **Step 3: Mount it** in the admin header above the nav, full width on mobile.

- [ ] **Step 4: Verify** (typecheck, lint, dev server: typing two letters shows a list or "No matches"), commit `feat(admin): global search across students, schools and coordinators`.

---

## Phase 3 — Review queues

### Task 13: Queue readers, shared queue component, schools queue

**Files:**
- Create: `src/lib/admin/queues.ts`, `src/lib/admin/__tests__/queues.test.ts`, `src/components/admin/admin-queue.tsx`, `src/app/(admin)/admin/queues/actions.ts`
- Modify: `src/app/(admin)/admin/schools/page.tsx`

**Interfaces:**
- Produces:

```ts
export interface QueueQuery { status: string; q?: string; page: number }
export function parseQueueQuery(sp: SearchParams, defaultStatus: string): QueueQuery
export function queueQueryToString(q: QueueQuery, defaultStatus: string, overrides?: Partial<QueueQuery>): string
export function getSchoolsQueue(db, q: QueueQuery, size?: number): Promise<AdminResult<Page<SchoolQueueRow>>>       // schools by review_status, ilike on name when q, count 'exact' via .range()
export function getSimilarSchools(db, ids: string[]): Promise<AdminResult<Map<string, SimilarSchool[]>>>           // admin_similar_schools_batch
export function getCoordinatorsQueue(db, q: QueueQuery, size?: number): Promise<AdminResult<Page<CoordinatorQueueRow>>> // schools by coordinator_status joined to profile name/phone
export function getCertificatesQueue(db, q: QueueQuery, size?: number): Promise<AdminResult<Page<CertificateQueueRow>>>
// actions.ts
export async function bulkReviewSchools(formData: FormData): Promise<{ ok: number; failed: number }>      // ids[], decision 'approve'|'reject', note
export async function bulkReviewCoordinators(formData: FormData): Promise<{ ok: number; failed: number }>
export async function bulkReviewCertificates(formData: FormData): Promise<{ ok: number; failed: number }>  // approve with points from form or reject with note
```

The three queue readers use table queries with `.range()` and `{ count: 'exact' }` (these tables are filtered to pending, so exact counts are cheap); `getSimilarSchools` uses the batch function. Bulk actions loop over ids and call the existing single-row actions' underlying RPCs (`admin_review_school`, `admin_review_coordinator_claim`, `admin_approve_cert`/`admin_reject_cert`), collect successes and failures, call `invalidateAdminCache()` and `revalidatePath('/admin')` plus the queue path.

`AdminQueue` (client) renders: status tabs (pending / approved / rejected via links), a search input (GET), a table with a checkbox column, the rows passed as `ReactNode` per row, a sticky footer that appears when something is selected with "Approve selected" and "Reject selected" (the reject button opens a small inline textarea for the required note), calls the passed server action with the selected ids, and shows the `{ok, failed}` result. Keep `SchoolReviewRow`'s inner content for the schools queue but render it inside `AdminQueue`'s rows.

Schools page: `parseQueueQuery(sp, 'pending')`, load the page, load similar schools for the page's ids in one call, render. Commit `feat(admin): schools queue paged, searched, and reviewed in bulk`.

### Task 14: Coordinators and certificates queues on the shared component

**Files:**
- Modify: `src/app/(admin)/admin/coordinators/page.tsx`, `src/app/(admin)/admin/certificates/page.tsx`

Read both in full. Replace their unbounded reads with `getCoordinatorsQueue` / `getCertificatesQueue`, render inside `AdminQueue` with their existing row content, wire the bulk actions from Task 13. Keep the coordinators page's message list link and the certificates page's per-item review link. Commit `feat(admin): coordinator and certificate queues paged with bulk review`.

---

## Phase 4 — Dashboard

### Task 15: Dashboard reader and the command centre

**Files:**
- Create: `src/lib/admin/dashboard.ts`
- Modify: `src/app/(admin)/admin/page.tsx`

**Interfaces:**
- Produces: `interface Dashboard { pending_schools: number; pending_coordinators: number; pending_certificates: number; active_support: number; students: number; students_onboarded: number; coordinators: number; schools_approved: number; isc: IscSummary; top_states: BreakdownRow[]; stalled_states: BreakdownRow[]; timeline: TimelinePoint[] }`, `getDashboard(db): Promise<AdminResult<Dashboard>>` cached 60 seconds.

Page layout, top to bottom:

1. `PageHeader` "Overview" with the day's date as the subtitle.
2. **Queues**: four `StatCard`s (pending schools → `/admin/schools?status=pending`, pending coordinators → `/admin/coordinators?status=pending`, pending certificates → `/admin/certificates?status=pending`, active support → `/admin/coordinators/support`). Wrap each in a `Link`.
3. **People**: students, onboarded of students, coordinators, approved schools, as a second row of `StatCard`s.
4. **The championship**: the funnel numbers from `isc` as three big figures with the two rates; a two-column card pair "Strongest states" and "Stalled states" listing `label`, `submitted/eligible` as a percentage and a link to `/admin/isc/state/<key>`; the seven-day timeline as a small bar chart (reuse whatever `IscInsights` uses for its timeline).
5. `MigrationMissing` when that error comes back, `SectionFailed` otherwise, and the old five-count fallback removed.

Commit `feat(admin): the overview is a command centre for queues, people and the championship`.

### Task 16: Final verification and hand-over notes

**Files:**
- Modify: `docs/admin-scale-migration.sql` (header comment lists what it does and the EXPLAIN block from Task 5)

- [ ] Run `npm run admin-scale:verify -- --students 200000 --schools 1000 --entries 800000` once more and paste the timings table into the migration header as a comment.
- [ ] Run `npx tsc --noEmit && npx eslint src && npx vitest run && SUPABASE_SERVICE_ROLE_KEY= npx next build`.
- [ ] `grep -rn "admin_list_users\|loadIscAdminData" src` must be empty.
- [ ] Commit `docs: admin migration header with verified timings`.

---

## Self-review notes

- Spec 1.1–1.4 → Tasks 2–5. Spec 1.5 → Tasks 1–5 harness. Spec 2 → Tasks 6, 7, 10, 13, 15. Spec 3 → Tasks 8, 9. Spec 4 → Tasks 10–12. Spec 5 → Tasks 13–14. Spec 6 → Task 15. Spec 7 → Task 6 (cache, errors) and the `is_admin` guard in every function. Spec 8 → tests in 6, 7, 10, 13 and the harness. Spec 9 → phase order.
- Names used across tasks: `getIscSummary/getIscBreakdown/getIscTimeline/getIscRoster/getColdSchools/iterateExport` (7, 8, 9), `parseRosterFilters/rosterFiltersToQuery/scopeToRpcArgs/filtersToRpcArgs/pageCount` (6, 8, 9), `Page<T>` and `lift` (7, 10, 13), `AdminResult/mapRpcError/ok` (6 onward), `cached/invalidateAdminCache` (6, 7, 10, 13), `MigrationMissing/SectionFailed/Pagination` (8 onward).
