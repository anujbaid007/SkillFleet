-- ===============================================================
-- Admin at scale: indexes, the division column and admin-only functions.
--
-- Paste this whole file into the Supabase SQL editor and run it once. It is
-- safe to run again, and safe to run over an earlier copy of itself: every
-- index is `if not exists`, every function is `create or replace`, and the two
-- functions that changed shape after their first version are dropped first
-- (see the note above section G). Nothing here deletes or rewrites a row of
-- real data. It adds indexes, adds one column to isc_entries, backfills that
-- column, and creates functions.
--
-- Until it has been run, the admin area still loads: every screen keeps its
-- heading and its navigation and shows a panel saying to run this file. The
-- parts that read plain tables -- the review queues, the four counters at the
-- top of /admin, a coordinator's own profile and roster -- show real numbers
-- the whole time.
--
-- ---------------------------------------------------------------
-- WHAT YOU ARE PASTING, one sentence per section
-- ---------------------------------------------------------------
-- The sections run in the order the file needs, which puts F last because it
-- is the only one you read rather than run.
--
--   A. Indexes -- pg_trgm plus the twenty-odd indexes on isc_entries,
--      isc_entry_members, user_profiles, schools and certificate_uploads that
--      every function below depends on to stay in milliseconds at 200,000
--      students and 800,000 entries.
--
--   B. Division on entries -- adds isc_entries.division ('group1' for Classes
--      5-8, 'group2' for 9-12), backfills it from each entry leader's class,
--      and keeps it right with an insert trigger, so a division filter is an
--      index lookup instead of a join to the leader's profile.
--
--   C. Championship summaries -- admin_isc_summary(), admin_isc_breakdown()
--      and admin_isc_timeline(): the ISC funnel, the state/district/school
--      league table and the daily started/submitted series, each scoped by
--      state, district or school and each counted by Postgres rather than by
--      fetching rows into the app.
--
--   D. Roster pages, export chunks, cold schools -- admin_isc_roster() pages
--      entries with ten filters and a total, admin_isc_export_chunk() walks
--      the same rows by keyset cursor for a streamed CSV, and
--      admin_isc_cold_schools() lists schools that have eligible students and
--      no entry at all.
--
--   E. Users, search, dashboard, similar schools -- admin_users_page() pages
--      and searches every profile with its auth email, admin_search() answers
--      the global search box in one round trip, admin_dashboard() returns the
--      whole /admin landing page as one jsonb value, and
--      admin_similar_schools_batch() finds near-duplicate schools for a whole
--      page of them in one call instead of one call per row.
--
--   G. Coordinator and school analytics -- admin_coordinator_summary(),
--      admin_coordinator_breakdown(), admin_coordinator_trend(),
--      admin_coordinators_page() and admin_coordinator_detail(): who the
--      coordinators are, which schools and students they cover, how many of
--      those students have entered, and how the signup cohorts have converted.
--
--   F. Integrity probes and the EXPLAIN block -- ten queries to run by hand
--      after pasting, plus the EXPLAIN statements that prove the indexes in A
--      are the ones being used. Probes 1 to 5 cover sections C to E (orphan
--      entries, eligible students with no state, member rows with no user,
--      approved schools with no eligible student, profiles with no auth row);
--      part 6 is the EXPLAIN pass; probes 7 to 11 cover section G
--      (coordinators who claimed nothing, claims that do not line up,
--      coordinators holding more than one claim, students at a school that
--      does not exist, students entered only at another school). Every one of
--      them is a number the admin pages either cannot show you or have to
--      leave out of a total.
--
-- ---------------------------------------------------------------
-- WHO CAN CALL ANY OF IT
-- ---------------------------------------------------------------
-- All fifteen admin_* functions here are `security definer` with `set
-- search_path = public` and open with `if not is_admin() then raise exception
-- 'admin only'; end if;`. The two functions from section B are the exceptions,
-- and have to be: isc_division_for_class() touches no table and is called on
-- the student path (the comment above it says why), and
-- isc_entries_set_division() is the insert trigger that runs as the student
-- creating the entry.
--
-- Every function that takes a scope refuses a district without a state,
-- because district names repeat across states (Aurangabad is in both
-- Maharashtra and Bihar).
--
-- ---------------------------------------------------------------
-- WHAT THIS DOES NOT DROP
-- ---------------------------------------------------------------
-- admin_list_users() is replaced by admin_users_page() and nothing under src/
-- calls it any more. It is left standing, because dropping a function is the
-- one thing here that pasting the file again cannot undo. It costs nothing
-- sitting there, so drop it in your own time, once you are satisfied the new
-- users page is behaving:
--
--   drop function if exists admin_list_users();
--
-- That argument list is the one in src/lib/types/database.ts, which was
-- generated from this database. If the drop says no such function exists, run
-- `\df admin_list_users` in the SQL editor and use the signature it prints: a
-- drop has to name the arguments exactly.
--
-- DO NOT DROP find_similar_schools(uuid). No page calls it directly any more,
-- so it looks like the same kind of leftover, and it is not:
-- admin_similar_schools_batch() in section E is built on it --
-- `cross join lateral find_similar_schools(s.id)` -- and that batch function is
-- what /admin/schools calls for every page of the queue.
--
-- Postgres will not stop you. A plpgsql body is stored as text and records no
-- dependency on the functions it calls, so the DROP succeeds with no error and
-- no warning, and nothing looks wrong until the next render of /admin/schools
-- fails with 'function find_similar_schools(uuid) does not exist'. What breaks
-- is the near-duplicate warning on every pending school -- while an admin is
-- deciding which of them to approve, which is the worst possible moment for
-- that particular warning to go quiet.
--
-- ---------------------------------------------------------------
-- BEFORE YOU PASTE
-- ---------------------------------------------------------------
-- admin_dashboard() reads support_conversations and certificate_uploads. If
-- either table is missing under exactly that name, that one CREATE fails and
-- the SQL editor stops there, leaving the sections after it uncreated. Check
-- both exist first; if the paste stops, read the editor's error rather than
-- assuming the whole file failed.
--
-- ---------------------------------------------------------------
-- WHAT IT COSTS, MEASURED
-- ---------------------------------------------------------------
-- npm run admin-scale:verify -- --students 200000 --schools 1000 --entries 800000
--
-- 200,000 students / 1,000 schools / 800,000 entries / ~1.16 M
-- isc_entry_members rows, in pglite (single-threaded wasm, work_mem = 4MB).
-- Supabase has real statistics, parallel workers and more memory, so every
-- number below is a ceiling and not a prediction. 64 checks, exit 0.
--
--   seeded 200000 students, 1000 schools, 800000 entries in 53326 ms
--   analyzed every table in 587 ms - plans below use real statistics
--   ┌─────────┬────────────────────────────────────────────────────────────────────────┬───────┐
--   │ (index) │ name                                                                   │ ms    │
--   ├─────────┼────────────────────────────────────────────────────────────────────────┼───────┤
--   │ 0       │ 'section A: every index exists'                                        │ 2     │
--   │ 1       │ 'section A: indexes are actually used'                                 │ 4     │
--   │ 2       │ 'isc_division_for_class maps every class'                              │ 0     │
--   │ 3       │ 'division backfill'                                                    │ 682   │
--   │ 4       │ 'division trigger'                                                     │ 5     │
--   │ 5       │ 'migration is safe to run twice'                                       │ 663   │
--   │ 6       │ 'admin_isc_summary national'                                           │ 6042  │
--   │ 7       │ 'admin_isc_summary school scope'                                       │ 8     │
--   │ 8       │ 'admin_isc_summary empty scope'                                        │ 1     │
--   │ 9       │ 'admin_isc_breakdown levels'                                           │ 5765  │
--   │ 10      │ 'admin_isc_breakdown agrees with admin_isc_summary'                    │ 10710 │
--   │ 11      │ 'admin_isc_timeline'                                                   │ 2926  │
--   │ 12      │ 'ISC summaries on a hand-computed fixture'                             │ 2327  │
--   │ 13      │ 'a district without a state is refused'                                │ 89    │
--   │ 14      │ 'section C functions are admin only'                                   │ 1     │
--   │ 15      │ 'TIMING admin_isc_summary() national'                                  │ 2548  │
--   │ 16      │ 'TIMING admin_isc_breakdown() national'                                │ 2196  │
--   │ 17      │ 'TIMING admin_isc_timeline() 30 days'                                  │ 689   │
--   │ 18      │ 'admin_isc_roster pages are lossless and totally ordered'              │ 303   │
--   │ 19      │ 'admin_isc_roster: every filter filters'                               │ 9166  │
--   │ 20      │ 'admin_isc_roster: caps, edges and row contents'                       │ 10730 │
--   │ 21      │ 'admin_isc_export_chunk walks the whole set exactly once'              │ 424   │
--   │ 22      │ 'admin_isc_export_chunk: refusals and caps'                            │ 377   │
--   │ 23      │ 'admin_isc_cold_schools'                                               │ 16    │
--   │ 24      │ 'section D reads through the indexes'                                  │ 5     │
--   │ 25      │ 'TIMING admin_isc_roster() national page 1'                            │ 2833  │
--   │ 26      │ 'TIMING admin_isc_roster() one school'                                 │ 131   │
--   │ 27      │ 'TIMING admin_isc_roster() state + status'                             │ 532   │
--   │ 28      │ 'TIMING admin_isc_export_chunk() 1000 rows'                            │ 31    │
--   │ 29      │ 'TIMING admin_isc_cold_schools() national'                             │ 6     │
--   │ 30      │ 'admin_users_page pages are lossless and totally ordered'              │ 12021 │
--   │ 31      │ 'admin_users_page: filters, caps and the auth.users join'              │ 8161  │
--   │ 32      │ 'the trigram indexes fit the expressions the functions search with'    │ 2     │
--   │ 33      │ 'admin_search'                                                         │ 2929  │
--   │ 34      │ 'admin_dashboard'                                                      │ 10302 │
--   │ 35      │ 'admin_similar_schools_batch'                                          │ 9     │
--   │ 36      │ 'sections D and E are admin only'                                      │ 3     │
--   │ 37      │ 'sections D and E survive a second apply'                              │ 7501  │
--   │ 38      │ 'TIMING admin_users_page() page 1'                                     │ 297   │
--   │ 39      │ 'TIMING admin_users_page() search'                                     │ 372   │
--   │ 40      │ 'TIMING admin_search()'                                                │ 312   │
--   │ 41      │ 'TIMING admin_dashboard()'                                             │ 5083  │
--   │ 42      │ 'TIMING admin_similar_schools_batch() 20 schools'                      │ 5     │
--   │ 43      │ 'admin_coordinator_summary national'                                   │ 963   │
--   │ 44      │ 'admin_coordinator_summary scoped'                                     │ 1443  │
--   │ 45      │ 'admin_coordinator_breakdown levels and sums'                          │ 1471  │
--   │ 46      │ 'admin_coordinator_breakdown agrees with admin_coordinator_summary'    │ 7140  │
--   │ 47      │ 'admin_coordinator_trend'                                              │ 14    │
--   │ 48      │ 'admin_coordinators_page pages are lossless and totally ordered'       │ 8898  │
--   │ 49      │ 'admin_coordinators_page: filters, caps and row contents'              │ 3375  │
--   │ 50      │ 'admin_coordinators_page: the 200 cap is enforced inside the function' │ 417   │
--   │ 51      │ 'admin_coordinator_detail'                                             │ 55    │
--   │ 52      │ 'coordinator analytics on a hand-computed fixture'                     │ 3309  │
--   │ 53      │ 'section G reads through the indexes'                                  │ 4     │
--   │ 54      │ 'section G is admin only'                                              │ 1     │
--   │ 55      │ 'section G survives a second apply'                                    │ 1734  │
--   │ 56      │ 'TIMING admin_coordinator_summary() national'                          │ 522   │
--   │ 57      │ 'TIMING admin_coordinator_summary() one state'                         │ 405   │
--   │ 58      │ 'TIMING admin_coordinator_breakdown() national'                        │ 524   │
--   │ 59      │ 'TIMING admin_coordinator_trend() 30 days'                             │ 1     │
--   │ 60      │ 'TIMING admin_coordinators_page() page 1'                              │ 124   │
--   │ 61      │ 'TIMING admin_coordinators_page() search'                              │ 120   │
--   │ 62      │ 'TIMING admin_coordinator_detail()'                                    │ 2     │
--   │ 63      │ 'the day charts bucket by IST, not by the session zone'                │ 4     │
--   └─────────┴────────────────────────────────────────────────────────────────────────┴───────┘
--   all admin-scale checks passed
--
-- The rows named TIMING are bare calls with nothing else in the measurement --
-- what an admin page actually waits for. Every other row is a correctness
-- check that calls its function dozens of times against a reference query, so
-- its milliseconds are not a budget.
--
-- THREE NUMBERS WORTH KNOWING BEFORE YOU BUILD ON THIS.
--
--   1. admin_dashboard() is ~5.1 s here, and essentially all of it is the two
--      section C calls inside it: admin_isc_summary at 2.5 s and
--      admin_isc_breakdown at 2.2 s, timed on their own, account for the whole
--      5.1 s to within the run-to-run noise. Everything else in it -- eight
--      counts and a 7-day timeline -- disappears into that noise. That is why
--      /admin reads its four queue counters straight from the tables and
--      streams the championship block in behind them; do not put this
--      function on the critical path of anything.
--
--   2. A national admin_isc_roster() page is ~2.8 s and always reads all
--      800,000 rows, because `total` is count(*) over () and counting the
--      whole match set means touching it. The same call scoped to one school
--      is 131 ms. A roster screen should open on a scope, not on the nation --
--      /admin/isc does not list entries until a filter narrows it.
--
--   3. Everything else an admin page waits for is about half a second or
--      less: users page 297 ms, users search 372 ms, global search 312 ms,
--      coordinator summary 522 ms, coordinator breakdown 524 ms, coordinators
--      page 124 ms, coordinator detail 2 ms, cold schools 6 ms, similar
--      schools for 20 rows 5 ms. These are the ones you can await directly.
-- ===============================================================

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
-- B. Division on entries (Classes 5-8 = group1, 9-12 = group2)
-- ---------------------------------------------------------------
alter table isc_entries add column if not exists division text;
create index if not exists isc_entries_division_idx on isc_entries (division);

-- NOTE: deliberately no `set search_path` and no `is_admin()` gate on this one.
-- It touches no table, so it has no injection surface, it is called on the
-- student path (the insert trigger below) where an admin gate would break entry
-- creation outright, and -- the reason that matters most -- a plain immutable
-- SQL function with a single SELECT gets INLINED by the planner. Adding a SET
-- clause would block inlining and turn `isc_division_for_class(p.school_class)`
-- into a per-row function call across 200k user_profiles rows in every eligible
-- count below.
create or replace function isc_division_for_class(p_class text)
returns text language sql immutable as $$
  select case
    when p_class in ('Class 5','Class 6','Class 7','Class 8') then 'group1'
    when p_class in ('Class 9','Class 10','Class 11','Class 12') then 'group2'
    else null end
$$;

create or replace function isc_entries_set_division()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- The third predicate is what makes this idempotent. Without it, every entry
-- whose leader sits outside Classes 5-12 keeps division null, matches
-- `e.division is null` again, and is rewritten null -> null on EVERY run: about
-- 170,000 dead tuples and a long lock each time the founder re-pastes this
-- script. With it, the second run matches zero rows.
update isc_entries e
   set division = isc_division_for_class(p.school_class)
  from user_profiles p
 where p.id = e.created_by
   and e.division is null
   and isc_division_for_class(p.school_class) is not null;

-- ---------------------------------------------------------------
-- C. Championship summaries
--
-- UNITS, because they are not all the same and the UI must not mislabel them:
--   eligible / started / submitted  -> counts of STUDENTS (distinct people)
--   schools_with_entries            -> count of SCHOOLS that have >= 1 entry
--   by_track                        -> distinct STUDENTS competing in each track
--   by_division / by_status / by_language -> counts of ENTRIES
-- So by_track does NOT sum to the same total as by_status: a student in two
-- tracks is counted in both, and an entry has one status but several members.
--
-- "started" means a person actually on a team: the leader, or an invitee who
-- accepted. A pending invitee (accepted_at is null, is_leader false) is NOT
-- started -- they have been asked, not enrolled.
--
-- SCOPE, and the one asymmetry in it: entries are scoped by the school the
-- ENTRY belongs to (via schools.state / schools.district), while eligible
-- students are scoped by the denormalised user_profiles.school_state /
-- school_district. A team-mate from a neighbouring school therefore counts
-- toward the state of the entry, not their own, so summing `started` across
-- states can exceed the national figure. `eligible` does sum exactly.
-- ---------------------------------------------------------------
create or replace function admin_isc_summary(
  p_state text default null, p_district text default null, p_school_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_district is not null and p_state is null then
    raise exception '%: p_district was given without p_state. District names repeat across states (Aurangabad is in both Maharashtra and Bihar), so a district on its own silently merges them. Pass both, or neither.', 'admin_isc_summary';
  end if;
  with scoped_schools as (
    select s.id from schools s
    where (p_school_id is null or s.id = p_school_id)
      and (p_school_id is not null or p_state is null or s.state = p_state)
      and (p_school_id is not null or p_district is null or s.district = p_district)
  ),
  entries as (
    select e.status, e.division, e.submission->>'language' as language, e.school_id
    from isc_entries e
    where e.school_id in (select id from scoped_schools)
  ),
  -- Joined to isc_entries directly rather than to the `entries` CTE above: the
  -- CTE is materialised with columns this join does not need, and probing that
  -- tuplestore with 1.2M member rows costs more than re-reading the table.
  members as (
    select m.user_id, e.track, e.status = 'submitted' as sub
    from isc_entry_members m
    join isc_entries e on e.id = m.entry_id
    where e.school_id in (select id from scoped_schools)
      and m.user_id is not null and (m.is_leader or m.accepted_at is not null)
  ),
  -- One row per (student, track), then one per student. Deriving the headline
  -- numbers from these turns four large `count(distinct ...)` sorts into two
  -- hash aggregates. `sub` is the ENTRY's status, so a student counts as
  -- submitted if any entry they are on was submitted.
  per_track as (
    select track, user_id, bool_or(sub) as any_submitted from members group by track, user_id
  ),
  per_user as (
    select user_id, bool_or(any_submitted) as any_submitted from per_track group by user_id
  ),
  -- All four entry-level breakdowns in ONE pass over the entries. Four separate
  -- GROUP BYs re-scan the materialised CTE four times; a MixedAggregate over
  -- grouping sets hashes them together. Exactly one grouping() flag is 0 per row.
  dims as (
    select grouping(division) gd, grouping(status) gs, grouping(language) gl, grouping(school_id) gc,
           division, status, language, school_id, count(*) c
    from entries
    group by grouping sets ((division), (status), (language), (school_id))
  )
  select jsonb_build_object(
    'eligible', (select count(*) from user_profiles p
                 where p.role = 'student' and isc_division_for_class(p.school_class) is not null
                   and (p_school_id is null or p.school_id = p_school_id)
                   and (p_school_id is not null or p_state is null or p.school_state = p_state)
                   and (p_school_id is not null or p_district is null or p.school_district = p_district)),
    'started', (select count(*) from per_user),
    'submitted', (select count(*) from per_user where any_submitted),
    'schools_with_entries', (select count(*) from dims where gc = 0),
    -- Every list is ordered by count desc then key, so ties are stable between calls.
    'by_track', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc, k), '[]'::jsonb)
                 from (select track k, count(*) c from per_track group by track) t),
    'by_division', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc, k), '[]'::jsonb)
                 from (select coalesce(division, 'unknown') k, c from dims where gd = 0) t),
    'by_status', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc, k), '[]'::jsonb)
                 from (select status k, c from dims where gs = 0) t),
    'by_language', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc, k), '[]'::jsonb)
                 from (select coalesce(language, 'unknown') k, c from dims where gl = 0) t)
  ) into v;
  return v;
end $$;

-- Every level shares one shape: `el` counts eligible students from
-- user_profiles, `ent` is the scoped entries with their grouping key, `sch`
-- counts the schools that have entries, `mem` collapses members to one row per
-- (key, student) so `stm` can count people with a plain count(*). Written the
-- obvious way -- `count(distinct m.user_id) filter (...)` straight off the join
-- -- Postgres has to sort 1.2M wide rows on disk; this is a third faster.
create or replace function admin_isc_breakdown(p_state text default null, p_district text default null)
returns table(key text, label text, eligible bigint, started bigint, submitted bigint, schools bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_district is not null and p_state is null then
    raise exception '%: p_district was given without p_state. District names repeat across states (Aurangabad is in both Maharashtra and Bihar), so a district on its own silently merges them. Pass both, or neither.', 'admin_isc_breakdown';
  end if;
  if p_state is null then
    return query
    with el as (
      select p.school_state k, count(*) n from user_profiles p
      where p.role = 'student' and isc_division_for_class(p.school_class) is not null and p.school_state is not null
      group by p.school_state),
    ent as (
      select e.id, e.school_id, s.state k, e.status = 'submitted' as sub
      from isc_entries e join schools s on s.id = e.school_id),
    sch as (select ent.k, count(distinct ent.school_id) n from ent group by ent.k),
    mem as (
      select en.k, m.user_id, bool_or(en.sub) sub
      from ent en join isc_entry_members m on m.entry_id = en.id
      where m.user_id is not null and (m.is_leader or m.accepted_at is not null)
      group by en.k, m.user_id),
    stm as (select mem.k, count(*) started, count(*) filter (where mem.sub) submitted from mem group by mem.k),
    st as (
      select coalesce(stm.k, sch.k) k, coalesce(stm.started, 0) started,
             coalesce(stm.submitted, 0) submitted, coalesce(sch.n, 0) schools
      from sch full join stm on stm.k = sch.k)
    select coalesce(el.k, st.k), coalesce(el.k, st.k), coalesce(el.n, 0), coalesce(st.started, 0), coalesce(st.submitted, 0), coalesce(st.schools, 0)
    from el full join st on st.k = el.k order by 3 desc, 1;
  elsif p_district is null then
    return query
    with el as (
      select p.school_district k, count(*) n from user_profiles p
      where p.role = 'student' and isc_division_for_class(p.school_class) is not null and p.school_state = p_state and p.school_district is not null
      group by p.school_district),
    ent as (
      select e.id, e.school_id, s.district k, e.status = 'submitted' as sub
      from isc_entries e join schools s on s.id = e.school_id and s.state = p_state),
    sch as (select ent.k, count(distinct ent.school_id) n from ent group by ent.k),
    mem as (
      select en.k, m.user_id, bool_or(en.sub) sub
      from ent en join isc_entry_members m on m.entry_id = en.id
      where m.user_id is not null and (m.is_leader or m.accepted_at is not null)
      group by en.k, m.user_id),
    stm as (select mem.k, count(*) started, count(*) filter (where mem.sub) submitted from mem group by mem.k),
    st as (
      select coalesce(stm.k, sch.k) k, coalesce(stm.started, 0) started,
             coalesce(stm.submitted, 0) submitted, coalesce(sch.n, 0) schools
      from sch full join stm on stm.k = sch.k)
    select coalesce(el.k, st.k), coalesce(el.k, st.k), coalesce(el.n, 0), coalesce(st.started, 0), coalesce(st.submitted, 0), coalesce(st.schools, 0)
    from el full join st on st.k = el.k order by 3 desc, 1;
  else
    return query
    with sc as (select s.id, s.name from schools s where s.state = p_state and s.district = p_district),
    el as (
      select p.school_id k, count(*) n from user_profiles p
      where p.role = 'student' and isc_division_for_class(p.school_class) is not null and p.school_id in (select id from sc)
      group by p.school_id),
    ent as (
      select e.id, e.school_id k, e.status = 'submitted' as sub
      from isc_entries e where e.school_id in (select id from sc)),
    -- A school counts as 1 as soon as it has an entry, even one with no members.
    sch as (select distinct ent.k from ent),
    mem as (
      select en.k, m.user_id, bool_or(en.sub) sub
      from ent en join isc_entry_members m on m.entry_id = en.id
      where m.user_id is not null and (m.is_leader or m.accepted_at is not null)
      group by en.k, m.user_id),
    stm as (select mem.k, count(*) started, count(*) filter (where mem.sub) submitted from mem group by mem.k)
    select sc.id::text, sc.name, coalesce(el.n, 0), coalesce(stm.started, 0), coalesce(stm.submitted, 0),
           case when sch.k is null then 0::bigint else 1::bigint end
    from sc left join el on el.k = sc.id left join stm on stm.k = sc.id left join sch on sch.k = sc.id
    order by 3 desc, 2;
  end if;
end $$;

-- day is a calendar date; `started` and `submitted` here are ENTRY counts (how
-- many entries were created / submitted that day), not student counts. Every day
-- in the window is present, zero-filled, so a chart has no gaps.
--
-- THE DAY IS AN INDIAN STANDARD TIME DAY, which is what the pages drawing this
-- chart say it is (src/lib/isc/dates.ts, and the chart subtitle "by Indian
-- Standard Time"). Supabase runs the session in UTC, so `created_at::date` and
-- `current_date` would bucket by the UTC day: every entry made between 00:00 and
-- 05:29 IST would be counted on the day before the child made it, and until
-- 05:30 each morning the last column of the chart -- "today" -- would be
-- yesterday and today's work would be invisible.
create or replace function admin_isc_timeline(
  p_state text default null, p_district text default null, p_school_id uuid default null, p_days int default 30
) returns table(day date, started bigint, submitted bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_from  date := v_today - greatest(p_days, 1) + 1;
  -- The same edge as an instant: midnight IST on v_from, which is 18:30 UTC the
  -- day before. The filters below compare a timestamptz to THIS rather than
  -- bucketing first, so they stay sargable and keep using
  -- isc_entries_created_idx and isc_entries_submitted_idx.
  v_from_at timestamptz := (v_from::timestamp) at time zone 'Asia/Kolkata';
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_district is not null and p_state is null then
    raise exception '%: p_district was given without p_state. District names repeat across states (Aurangabad is in both Maharashtra and Bihar), so a district on its own silently merges them. Pass both, or neither.', 'admin_isc_timeline';
  end if;
  return query
  with scoped as (
    select e.created_at, e.submitted_at
    from isc_entries e join schools s on s.id = e.school_id
    where (p_school_id is null or e.school_id = p_school_id)
      and (p_school_id is not null or p_state is null or s.state = p_state)
      and (p_school_id is not null or p_district is null or s.district = p_district)
      and (e.created_at >= v_from_at or e.submitted_at >= v_from_at)
  ),
  c as (select (created_at at time zone 'Asia/Kolkata')::date d, count(*) n from scoped where created_at >= v_from_at group by 1),
  s as (select (submitted_at at time zone 'Asia/Kolkata')::date d, count(*) n from scoped where submitted_at >= v_from_at group by 1)
  -- Integer series, not generate_series(date, date, interval): the date/interval
  -- form is resolved to the timestamptz overload, so the day column would come
  -- back as a timestamptz needing a cast, and the boundaries would depend on the
  -- session timezone. `v_today - int` is plain date arithmetic on a day that has
  -- already been pinned to IST.
  select (v_today - g.i)::date, coalesce(c.n, 0), coalesce(s.n, 0)
  from generate_series(0, greatest(p_days, 1) - 1) g(i)
  left join c on c.d = v_today - g.i
  left join s on s.d = v_today - g.i
  order by 1;
end $$;

-- ---------------------------------------------------------------
-- D. Roster pages, export chunks, cold schools
--
-- THE PAGING CONTRACT, shared by everything in sections D and E:
--
--   * p_page is 1-BASED. 0, a negative number or null all mean page 1.
--   * p_size is clamped INSIDE the SQL -- 200 for a page, 1000 for an export
--     chunk -- so no caller can ask for the whole table in one request. A null
--     or out-of-range size becomes the default.
--   * `total` is count(*) over (): how many rows the SAME filters match in
--     total, not how many are on this page. An empty page has no rows at all
--     and therefore carries no `total` -- read "no rows" as total 0.
--   * EVERY sort key is made TOTAL by appending the primary key. Ordering by
--     created_at alone is not a total order here: 800k entries share 28
--     distinct created_at values and 200k profiles share ~9600, so a page
--     boundary landing inside a tie group would silently drop some rows and
--     repeat others. `order by created_at desc, id desc` is what makes
--     offset paging lossless.
--   * The expensive per-row work (member_count) is computed OUTSIDE the LIMIT,
--     in a select over the already-paged CTE. Written the obvious way -- the
--     subquery sitting in the same select list as `count(*) over ()` -- whether
--     it runs 50 times or 800,000 times is a COST DECISION: Postgres 17 does
--     postpone it above the sort with a Result node (measured: 50 loops), but
--     nothing makes it. Paging first and then computing makes it structural.
--
-- member_count counts MEMBER ROWS on the entry that are either the leader or an
-- accepted invitee -- the team as it actually stands. Note it does not also
-- require m.user_id is not null the way section C's `started` does: section C
-- counts distinct PEOPLE and cannot count a row with no person, while here an
-- accepted row with no user_id would still be a seat filled. The two therefore
-- disagree by exactly the number of accepted member rows with a null user_id,
-- which should be zero; query 3 in section F tells you whether it is.
-- ---------------------------------------------------------------
create or replace function admin_isc_roster(
  p_state text default null, p_district text default null, p_school_id uuid default null,
  p_track text default null, p_status text default null, p_division text default null,
  p_language text default null, p_q text default null, p_page int default 1, p_size int default 50
) returns table(
  id uuid, track text, status text, division text, language text, school_id uuid, school_name text,
  leader_id uuid, leader_name text, member_count bigint, created_at timestamptz, submitted_at timestamptz, total bigint
) language plpgsql security definer set search_path = public as $$
declare v_size int    := least(greatest(coalesce(p_size, 50), 1), 200);
        -- bigint: (p_page - 1) * v_size overflows a 32-bit int somewhere past
        -- page 10,737,419, and an overflow is an error, not an empty page.
        v_off  bigint := (greatest(coalesce(p_page, 1), 1)::bigint - 1) * v_size;
        v_q    text   := nullif(lower(trim(coalesce(p_q, ''))), '');
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_district is not null and p_state is null then
    raise exception '%: p_district was given without p_state. District names repeat across states (Aurangabad is in both Maharashtra and Bihar), so a district on its own silently merges them. Pass both, or neither.', 'admin_isc_roster';
  end if;
  return query
  with page as (
    select e.id, e.track, e.status, e.division, e.submission->>'language' as language,
           e.school_id, s.name as school_name, e.created_by as leader_id, p.full_name as leader_name,
           e.created_at, e.submitted_at, count(*) over () as n_total
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
      and (v_q is null
           or lower(coalesce(p.full_name, '')) like '%' || v_q || '%'
           or lower(s.name) like '%' || v_q || '%')
    order by e.created_at desc, e.id desc
    limit v_size offset v_off
  )
  select pg.id, pg.track, pg.status, pg.division, pg.language, pg.school_id, pg.school_name,
         pg.leader_id, pg.leader_name,
         (select count(*) from isc_entry_members m
           where m.entry_id = pg.id and (m.is_leader or m.accepted_at is not null)),
         pg.created_at, pg.submitted_at, pg.n_total
  from page pg
  order by pg.created_at desc, pg.id desc;
end $$;

-- The export walks the SAME ordering as the roster with a keyset cursor instead
-- of an offset, so a 40,000-row download is 40 requests that each cost the same
-- as the first -- an OFFSET 39950 has to count past 39,950 rows to throw them
-- away. Feed the last row of a chunk back in as (p_after_created, p_after_id)
-- and stop when a chunk comes back shorter than p_size.
--
-- Two refusals, both deliberate:
--   * A national export is REFUSED. Without a state or a school this pulls
--     800,000 rows through PostgREST one 1000-row chunk at a time and nobody
--     meant to do it.
--   * Half a cursor is REFUSED. (created_at, id) < (ts, null) is NULL for every
--     row, so a chunk with p_after_id lost would come back empty and the export
--     would look finished; an id with no timestamp would restart from the top
--     and loop forever.
create or replace function admin_isc_export_chunk(
  p_state text default null, p_district text default null, p_school_id uuid default null,
  p_track text default null, p_status text default null, p_division text default null,
  p_language text default null, p_q text default null,
  p_after_created timestamptz default null, p_after_id uuid default null, p_size int default 1000
) returns table(
  id uuid, track text, status text, division text, language text, school_id uuid, school_name text,
  leader_id uuid, leader_name text, member_count bigint, created_at timestamptz, submitted_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare v_size int  := least(greatest(coalesce(p_size, 1000), 1), 1000);
        v_q    text := nullif(lower(trim(coalesce(p_q, ''))), '');
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_district is not null and p_state is null then
    raise exception '%: p_district was given without p_state. District names repeat across states (Aurangabad is in both Maharashtra and Bihar), so a district on its own silently merges them. Pass both, or neither.', 'admin_isc_export_chunk';
  end if;
  if p_state is null and p_school_id is null then
    raise exception 'admin_isc_export_chunk: an export needs a state or a school. A national export would stream every entry in the country; pick a scope.';
  end if;
  if (p_after_created is null) <> (p_after_id is null) then
    raise exception 'admin_isc_export_chunk: the cursor is (p_after_created, p_after_id) and needs both halves or neither. Pass the created_at AND the id of the last row of the previous chunk.';
  end if;
  return query
  with page as (
    select e.id, e.track, e.status, e.division, e.submission->>'language' as language,
           e.school_id, s.name as school_name, e.created_by as leader_id, p.full_name as leader_name,
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
      and (v_q is null
           or lower(coalesce(p.full_name, '')) like '%' || v_q || '%'
           or lower(s.name) like '%' || v_q || '%')
      and (p_after_created is null or (e.created_at, e.id) < (p_after_created, p_after_id))
    order by e.created_at desc, e.id desc
    limit v_size
  )
  select pg.id, pg.track, pg.status, pg.division, pg.language, pg.school_id, pg.school_name,
         pg.leader_id, pg.leader_name,
         (select count(*) from isc_entry_members m
           where m.entry_id = pg.id and (m.is_leader or m.accepted_at is not null)),
         pg.created_at, pg.submitted_at
  from page pg
  order by pg.created_at desc, pg.id desc;
end $$;

-- Schools with eligible students and not one entry -- the outreach list.
--
-- The join to user_profiles is INNER on purpose, so a school with no eligible
-- students at all is NOT listed. That is a different problem with a different
-- fix (nobody has signed up yet), and putting a thousand zero-student schools
-- at the bottom of this list would bury the ones worth phoning. Query 4 in
-- section F counts them, if you want to see them.
create or replace function admin_isc_cold_schools(
  p_state text default null, p_district text default null, p_page int default 1, p_size int default 20
) returns table(id uuid, name text, state text, district text, eligible bigint, coordinator_status text, total bigint)
language plpgsql security definer set search_path = public as $$
declare v_size int    := least(greatest(coalesce(p_size, 20), 1), 200);
        v_off  bigint := (greatest(coalesce(p_page, 1), 1)::bigint - 1) * v_size;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_district is not null and p_state is null then
    raise exception '%: p_district was given without p_state. District names repeat across states (Aurangabad is in both Maharashtra and Bihar), so a district on its own silently merges them. Pass both, or neither.', 'admin_isc_cold_schools';
  end if;
  return query
  select s.id, s.name, s.state, s.district, count(p.id), s.coordinator_status, count(*) over ()
  from schools s
  join user_profiles p on p.school_id = s.id and p.role = 'student'
                      and isc_division_for_class(p.school_class) is not null
  where (p_state is null or s.state = p_state)
    and (p_district is null or s.district = p_district)
    and not exists (select 1 from isc_entries e where e.school_id = s.id)
  group by s.id
  -- s.id last: two schools can share a name, and without a total order the
  -- same school can appear on two pages while another appears on none.
  order by count(p.id) desc, s.name, s.id
  limit v_size offset v_off;
end $$;

-- ---------------------------------------------------------------
-- E. Users, search, dashboard, similar schools
-- ---------------------------------------------------------------
-- auth.users is LEFT joined, not joined. A profile whose auth row has gone
-- (deleted user, half-finished signup, a restore that missed auth) is exactly
-- the row an admin needs to find, and an inner join would hide it from the
-- users page entirely with no error anywhere. The price is that `email` is
-- NULLABLE in the result -- render it as "no account" rather than assuming a
-- string. Such a profile is also unfindable by email, since its email is null;
-- searching by name or phone still reaches it. Query 5 in section F counts them.
--
-- PERFORMANCE, stated here because it is a property of the design and not a
-- thing to tune later: p_q is a substring search ORed across four columns, so
-- admin_users_page WITH A QUERY IS A SEQUENTIAL SCAN of user_profiles joined to
-- a sequential scan of auth.users, at every scale. Measured at 200k profiles it
-- is ~350-410 ms, which is fine for an admin-only screen; there is no plan here
-- to be disappointed by. Section F item 6 shows the real plan.
--
-- Adding trigram indexes to phone, school_name and auth.users.email DOES NOT
-- FIX IT -- measured, 68 ms to 67 ms, the same Hash Left Join over two
-- sequential scans. A BitmapOr cannot span two tables, and one branch of the OR
-- lives on auth.users, so the whole predicate stays a filter no matter how many
-- indexes exist. Drop the u.email branch from the query and it immediately
-- becomes a BitmapOr over three Bitmap Index Scans. So the only remedy that
-- works is to put every searched value on ONE table: denormalise the email onto
-- user_profiles, or add a generated search_text column there
-- (full_name || ' ' || email || ' ' || phone || ' ' || school_name) with a
-- single gin_trgm_ops index, and search that one column.
create or replace function admin_users_page(
  p_q text default null, p_role text default null, p_onboarded boolean default null,
  p_sort text default 'created_desc', p_page int default 1, p_size int default 50
) returns table(
  id uuid, full_name text, email text, role text, school_name text, school_state text, school_class text,
  onboarding_completed boolean, created_at timestamptz, total bigint
) language plpgsql security definer set search_path = public as $$
declare v_size int    := least(greatest(coalesce(p_size, 50), 1), 200);
        v_off  bigint := (greatest(coalesce(p_page, 1), 1)::bigint - 1) * v_size;
        v_q    text   := nullif(lower(trim(coalesce(p_q, ''))), '');
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  select p.id, p.full_name, u.email, p.role, p.school_name, p.school_state, p.school_class,
         p.onboarding_completed, p.created_at, count(*) over ()
  from user_profiles p
  left join auth.users u on u.id = p.id
  where (p_role is null or p.role = p_role)
    and (p_onboarded is null or p.onboarding_completed = p_onboarded)
    and (v_q is null
         or lower(coalesce(p.full_name, '')) like '%' || v_q || '%'
         or lower(coalesce(u.email, '')) like '%' || v_q || '%'
         or coalesce(p.phone, '') like '%' || v_q || '%'
         or lower(coalesce(p.school_name, '')) like '%' || v_q || '%')
  -- An unrecognised p_sort falls through to created_desc rather than erroring.
  -- p.id last makes every one of the three orders total: user_profiles.created_at
  -- is far from unique (~9600 distinct values across 200k rows at target scale),
  -- and two students very often share a name.
  order by
    case when p_sort = 'name_asc' then lower(coalesce(p.full_name, '')) end asc,
    case when p_sort = 'created_asc' then p.created_at end asc,
    p.created_at desc,
    p.id
  limit v_size offset v_off;
end $$;

-- The admin command-bar lookup. Three independent top-N lists in one round
-- trip, so the caller gets up to 3 * p_limit rows and groups them by `kind`.
-- Under two characters it returns NOTHING, because saying so is not cheap:
-- 'a' matches most of the database, and only the schools branch is a trigram
-- scan. The student and coordinator branches OR a name, an email on auth.users
-- and a phone together, which no single index can serve (see the note above
-- admin_users_page), so each is a sequential scan of user_profiles joined to a
-- sequential scan of auth.users.
create or replace function admin_search(p_q text, p_limit int default 10)
returns table(kind text, id uuid, title text, subtitle text)
language plpgsql security definer set search_path = public as $$
declare v_q   text := lower(trim(coalesce(p_q, '')));
        v_lim int  := least(greatest(coalesce(p_limit, 10), 1), 25);
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if length(v_q) < 2 then return; end if;
  return query
  -- title is never null: a profile with no name and no auth row still shows its
  -- id, so a result is always clickable. subtitle is never null either, but
  -- concat_ws returns '' when every part is null.
  (select 'student'::text, p.id, coalesce(p.full_name, u.email, p.id::text),
          concat_ws(' - ', p.school_name, p.school_class)
   from user_profiles p
   left join auth.users u on u.id = p.id
   where p.role = 'student'
     and (lower(coalesce(p.full_name, '')) like '%' || v_q || '%'
          or lower(coalesce(u.email, '')) like '%' || v_q || '%'
          or coalesce(p.phone, '') like '%' || v_q || '%')
   order by p.full_name nulls last, p.id
   limit v_lim)
  union all
  (select 'school'::text, s.id, s.name, concat_ws(', ', s.district, s.state)
   from schools s
   where lower(s.name) like '%' || v_q || '%'
      or lower(coalesce(s.affiliation_no, '')) = v_q
   order by s.name, s.id
   limit v_lim)
  union all
  -- lateral, not a plain join to schools: a coordinator who has claimed two
  -- schools would otherwise appear twice with the same id.
  (select 'coordinator'::text, p.id, coalesce(p.full_name, u.email, p.id::text),
          coalesce(sc.name, 'No school claimed')
   from user_profiles p
   left join auth.users u on u.id = p.id
   left join lateral (select s.name from schools s where s.coordinator_id = p.id order by s.name, s.id limit 1) sc on true
   where p.role = 'coordinator'
     and (lower(coalesce(p.full_name, '')) like '%' || v_q || '%'
          or lower(coalesce(u.email, '')) like '%' || v_q || '%'
          or coalesce(p.phone, '') like '%' || v_q || '%')
   order by p.full_name nulls last, p.id
   limit v_lim);
end $$;

-- One round trip for the whole admin landing page.
--
-- admin_isc_breakdown() is the most expensive thing here and top_states and
-- stalled_states are two views of the SAME rows, so it goes in a MATERIALIZED
-- CTE and runs once. That halves the cost and, more importantly, guarantees the
-- two lists come from one snapshot -- read twice, a state could appear in
-- neither list or in both.
create or replace function admin_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  with bd as materialized (select * from admin_isc_breakdown())
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
    -- Best and worst submitted/eligible rate. The ORDER BY is repeated inside
    -- jsonb_agg because a subquery's LIMIT order is not a promise about the
    -- order rows reach an aggregate. stalled_states needs eligible >= 50: a
    -- state with three eligible students and none submitted is noise, not news.
    'top_states', (select coalesce(jsonb_agg(to_jsonb(t) order by t.submitted::numeric / t.eligible desc, t.eligible desc, t.key), '[]'::jsonb)
                   from (select * from bd where bd.eligible > 0
                         order by bd.submitted::numeric / bd.eligible desc, bd.eligible desc, bd.key
                         limit 5) t),
    'stalled_states', (select coalesce(jsonb_agg(to_jsonb(t) order by t.submitted::numeric / t.eligible asc, t.eligible desc, t.key), '[]'::jsonb)
                   from (select * from bd where bd.eligible >= 50
                         order by bd.submitted::numeric / bd.eligible asc, bd.eligible desc, bd.key
                         limit 5) t),
    'timeline', (select coalesce(jsonb_agg(to_jsonb(t) order by t.day), '[]'::jsonb)
                 from admin_isc_timeline(null, null, null, 7) t)
  ) into v;
  return v;
end $$;

-- One call for a whole page of schools instead of one call per row. Capped at
-- 200 ids, which is the largest page any function here will hand you: this runs
-- a trigram similarity join per id and an unbounded array would be a way to
-- make the admin area hang from the client side.
create or replace function admin_similar_schools_batch(p_school_ids uuid[])
returns table(school_id uuid, similar_id uuid, similar_name text, similar_address text, similar_review_status text, score real)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if coalesce(array_length(p_school_ids, 1), 0) > 200 then
    raise exception 'admin_similar_schools_batch: % ids given, at most 200 per call.', array_length(p_school_ids, 1);
  end if;
  return query
  -- distinct: duplicate ids in the array would duplicate every match.
  select s.id, f.id, f.name, f.address, f.review_status, f.score
  from (select distinct u.id from unnest(coalesce(p_school_ids, '{}'::uuid[])) u(id) where u.id is not null) s
  cross join lateral find_similar_schools(s.id) f
  order by s.id, f.score desc, f.id;
end $$;

-- ---------------------------------------------------------------
-- G. Coordinator and school analytics
--
-- WHO A COORDINATOR IS, AND WHERE THEY ARE.
--   A coordinator is a `user_profiles` row with role = 'coordinator'. A CLAIM is
--   a `schools` row whose coordinator_id points at them; `coordinator_status`
--   says where that claim stands ('none' | 'pending' | 'approved' | 'rejected').
--   A coordinator profile carries NO geography of its own -- signup asks only for
--   an email and the claim is made afterwards, so school_state / school_district
--   / school_id are null on a real coordinator row. Every state and district
--   figure below is therefore the state and district OF THE CLAIMED SCHOOL.
--
--   One consequence, stated plainly because it is the only place in this section
--   where a total does not add up: a coordinator who has claimed nothing belongs
--   to no state. They ARE counted in the national admin_coordinator_summary()
--   `coordinators`, and they appear in NO row of admin_coordinator_breakdown().
--   So `sum(state.coordinators) + <coordinators with no claim> = national
--   coordinators`, never `sum(state.coordinators) = national coordinators`.
--   Probe 7 in section F is that number. The three school and student columns of
--   the breakdown -- schools_claimed, schools_total, students_covered,
--   students_entered -- always sum exactly to the national figure. `approved`
--   counts people too, so it sums only while nobody holds claims in two states
--   (probe 9), and it is never short the way `coordinators` is: a person with no
--   claim is not approved anywhere.
--
-- COVERED means `coordinator_id is not null AND coordinator_status = 'approved'`.
--   A school that has been claimed but not yet approved is NOT covered, and
--   neither is one whose claim was rejected: nobody is running the championship
--   there yet. `schools_uncovered` is `schools_total - schools_approved` and
--   therefore includes every pending and every rejected claim as well as the
--   schools nobody has claimed at all. Both halves of the test matter: an
--   'approved' status with a null coordinator_id covers nobody, and probe 8 in
--   section F counts rows where the two disagree.
--
-- THE HEADLINE METRIC, and why THIS one is safe to render as a percentage.
--   `students` under a coordinator is EVERY student registered at their school --
--   REACH, not eligibility, so there is deliberately no Classes 5-12 filter here
--   and this number is not comparable with section C's `eligible`.
--   `students_entered` is the subset of those same people who are on at least one
--   entry as leader or accepted invitee. Numerator and denominator are both
--   scoped by the STUDENT's own school_id, so the numerator is a subset of the
--   denominator and `entered_pct` cannot exceed 100.
--
--   Contrast admin_dashboard's top_states / stalled_states, where `submitted` is
--   scoped by the ENTRY's school and `eligible` by the student's own: that ratio
--   reaches 1.39 on real data and must never be shown as a percentage. This one
--   may be. Do not copy the defensive treatment from there to here.
--
--   A student counts as entered WHATEVER SCHOOL THEIR ENTRY BELONGS TO. A pupil
--   of yours who joined a neighbouring school's team did compete, and telling
--   their coordinator otherwise would be wrong; scoping the numerator by the
--   entry's school would also be the very mixing of bases that makes the
--   state-level ratio exceed 1. Probe 11 in section F counts the people the two
--   readings actually DISAGREE about -- students who compete only at somebody
--   else's school -- which is 0 on the harness seed. It is not the count of
--   cross-school team-mates, which is 12,583 there and would badly overstate what
--   hangs on this.
--
-- UNITS, because they are not all the same:
--   coordinators / approved / pending / rejected      -> PEOPLE
--   schools_total / claimed / approved / uncovered    -> SCHOOLS
--   students_covered / students_uncovered / entered   -> STUDENTS
--   admin_coordinator_detail.entries / submitted      -> ENTRIES
--   admin_coordinator_detail.by_track                 -> ENTRIES per track
--     (section C's by_track counts distinct STUDENTS -- the two do not agree,
--      and this one sums to `entries` exactly.)
--
-- ONE CLAIM PER COORDINATOR is what the product allows (apply_as_coordinator
--   refuses a school that already has a coordinator, and the console reads
--   get_my_coordinator_school()[0]), but nothing in the schema enforces it. So
--   everything here that counts students for a person sums over EVERY school
--   they have claimed -- never silently over one of them -- while the single
--   school_* columns show their strongest claim (approved beats pending beats
--   rejected, then name, then id). BOTH admin_coordinators_page and
--   admin_coordinator_detail return `schools_claimed` beside those columns, so a
--   page can say when the numbers span more than one school without sending the
--   reader anywhere, and probe 9 in section F counts the people it is true of.
--   It should be 0.
-- ---------------------------------------------------------------

-- Not in section A: section A is finished and reviewed, and this index exists
-- only for section G. Partial, because most schools have no coordinator and a
-- `coordinator_id = <uuid>` lookup is strict, so the planner can still use it.
create index if not exists schools_coordinator_idx on schools (coordinator_id) where coordinator_id is not null;

-- Both of these changed shape after their first version: admin_coordinator_trend
-- renamed two columns and admin_coordinators_page gained one. `create or replace
-- function` CANNOT change a return type, so a database that already holds the
-- earlier section G would fail with "cannot change return type of existing
-- function" and skip every statement after it. The drops make the script safe to
-- paste over any earlier version as well as over itself; on a database that has
-- neither, they do nothing.
drop function if exists admin_coordinator_trend(text, int);
drop function if exists admin_coordinators_page(text, text, text, text, int, int);

-- The whole coordinator funnel in one round trip.
--
-- `entered` is deliberately ONE distinct-aggregate over isc_entry_members rather
-- than an EXISTS per student: at 200k students the correlated form is 200k index
-- probes, while this is a single hash aggregate that the join to the scoped
-- students then probes. Same shape as section C's `per_user`.
create or replace function admin_coordinator_summary(
  p_state text default null, p_district text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_district is not null and p_state is null then
    raise exception '%: p_district was given without p_state. District names repeat across states (Aurangabad is in both Maharashtra and Bihar), so a district on its own silently merges them. Pass both, or neither.', 'admin_coordinator_summary';
  end if;
  with sc as (
    select s.id, s.coordinator_id, s.coordinator_status,
           (s.coordinator_id is not null and s.coordinator_status = 'approved') as covered
    from schools s
    where (p_state is null or s.state = p_state)
      and (p_district is null or s.district = p_district)
  ),
  entered as (
    select distinct m.user_id uid from isc_entry_members m
    where m.user_id is not null and (m.is_leader or m.accepted_at is not null)
  ),
  -- Students are reached through the SCHOOL row, not through
  -- user_profiles.school_state: a student whose school_id matches no school is in
  -- neither students_covered nor students_uncovered. Probe 10 counts them.
  per_school as (
    select p.school_id sid, count(*) n, count(e.uid) ent
    from user_profiles p
    join sc on sc.id = p.school_id
    left join entered e on e.uid = p.id
    where p.role = 'student'
    group by p.school_id
  ),
  -- One row per coordinator with a claim in scope. `rk` ranks their strongest
  -- claim so a person is counted under exactly one status.
  per_coord as (
    select sc.coordinator_id cid,
           coalesce(sum(ps.n), 0)::bigint students,
           max(case sc.coordinator_status when 'approved' then 3 when 'pending' then 2
                                          when 'rejected' then 1 else 0 end) rk
    from sc left join per_school ps on ps.sid = sc.id
    where sc.coordinator_id is not null
    group by sc.coordinator_id
  ),
  tot as (
    select count(*) schools_total,
           count(*) filter (where sc.coordinator_id is not null) schools_claimed,
           count(*) filter (where sc.covered) schools_approved
    from sc
  ),
  st as (
    select coalesce(sum(ps.n) filter (where sc.covered), 0)::bigint cov,
           coalesce(sum(ps.n) filter (where not sc.covered), 0)::bigint unc,
           coalesce(sum(ps.ent) filter (where sc.covered), 0)::bigint cov_ent
    from sc left join per_school ps on ps.sid = sc.id
  ),
  -- The median runs over exactly the people counted in `coordinators`, zeros
  -- included -- nationally that is every coordinator, so a coordinator who has
  -- claimed nothing pulls it down, which is the honest answer to "how many
  -- students does a typical coordinator bring".
  med as (
    select coalesce(pc.students, 0) n
    from user_profiles p left join per_coord pc on pc.cid = p.id
    where p_state is null and p.role = 'coordinator'
    union all
    select pc.students from per_coord pc where p_state is not null
  )
  select jsonb_build_object(
    'coordinators', case when p_state is null
                    then (select count(*) from user_profiles p where p.role = 'coordinator')
                    else (select count(*) from per_coord) end,
    'approved',  (select count(*) from per_coord where rk = 3),
    'pending',   (select count(*) from per_coord where rk = 2),
    'rejected',  (select count(*) from per_coord where rk = 1),
    'schools_total',     (select schools_total from tot),
    'schools_claimed',   (select schools_claimed from tot),
    'schools_approved',  (select schools_approved from tot),
    'schools_uncovered', (select schools_total - schools_approved from tot),
    'students_covered',   (select cov from st),
    'students_uncovered', (select unc from st),
    'students_entered',   (select cov_ent from st),
    'median_students_per_coordinator',
      (select coalesce(round((percentile_cont(0.5) within group (order by n))::numeric, 1), 0) from med),
    -- Safe as a percentage: cov_ent counts a subset of the same people as cov.
    'entered_pct', (select case when cov = 0 then 0
                                else round(100.0 * cov_ent / cov, 1) end from st)
  ) into v;
  return v;
end $$;

-- States nationally, districts inside a state. There is no school level: a
-- school's coordinator is one person, so the school level of this table would be
-- admin_coordinators_page filtered, which is a different screen.
--
-- `coordinators` and `approved` count PEOPLE (count(distinct coordinator_id), so
-- someone with two claims in one state counts once); schools_claimed and
-- schools_total count SCHOOLS; the last two count STUDENTS.
--
-- The three school and student columns ALWAYS sum to the matching national or
-- state figure -- a school belongs to one district whoever claimed it. The two
-- PEOPLE columns sum only while nobody holds claims in two places: `coordinators`
-- additionally misses everyone who has claimed nothing (see the top of section
-- G), and both of them count a two-claim person once per district. Probe 9 in
-- section F is the number that says whether the second caveat is live; it should
-- be 0.
create or replace function admin_coordinator_breakdown(p_state text default null)
returns table(key text, label text, coordinators bigint, approved bigint,
              schools_claimed bigint, schools_total bigint,
              students_covered bigint, students_entered bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  with sc as (
    select s.id, case when p_state is null then s.state else s.district end k,
           s.coordinator_id, s.coordinator_status,
           (s.coordinator_id is not null and s.coordinator_status = 'approved') as covered
    from schools s
    where p_state is null or s.state = p_state
  ),
  entered as (
    select distinct m.user_id uid from isc_entry_members m
    where m.user_id is not null and (m.is_leader or m.accepted_at is not null)
  ),
  per_school as (
    select p.school_id sid, count(*) n, count(e.uid) ent
    from user_profiles p
    join sc on sc.id = p.school_id
    left join entered e on e.uid = p.id
    where p.role = 'student'
    group by p.school_id
  )
  select sc.k, sc.k,
         count(distinct sc.coordinator_id),
         count(distinct sc.coordinator_id) filter (where sc.coordinator_status = 'approved'),
         count(*) filter (where sc.coordinator_id is not null),
         count(*),
         coalesce(sum(ps.n)   filter (where sc.covered), 0)::bigint,
         coalesce(sum(ps.ent) filter (where sc.covered), 0)::bigint
  from sc left join per_school ps on ps.sid = sc.id
  group by sc.k
  -- k is the group key, so it is unique per row: that is the tie-break, and
  -- without it two states with the same students_covered swap places between
  -- calls and a paged UI built on this would show one of them twice.
  order by 7 desc, 1;
end $$;

-- The growth curve, zero-filled like admin_isc_timeline so a chart has no gaps.
--
-- ALL THREE SERIES ARE KEYED ON THE COORDINATOR'S SIGNUP DAY
-- (user_profiles.created_at), and that is not a shortcut -- `schools` HAS NO
-- CLAIM TIMESTAMP. It carries created_at (when the school row was imported,
-- which for a pre-loaded school has nothing to do with any claim) and
-- reviewed_at / review_notes (which belong to the SCHOOL review, not to the
-- coordinator claim). There is no coordinator_claimed_at and no
-- coordinator_reviewed_at, so "claims made on day D" is not a question this
-- database can answer.
--
-- What this returns instead is a SIGNUP COHORT: of the coordinators who signed
-- up on day D, how many have since claimed a school (`cohort_claimed`) and how
-- many of those claims are approved (`cohort_approved`). That makes the three
-- series a funnel on one axis, so
-- `coordinators >= cohort_claimed >= cohort_approved` on every single day --
-- which a true event chart would not guarantee. If the founder wants real event
-- dates, add `coordinator_claimed_at` and `coordinator_reviewed_at` to `schools`
-- and set them in apply_as_coordinator / admin_review_coordinator_claim; this
-- function is then a two-line change.
--
-- With p_state, a coordinator has no geography until they claim, so the scoped
-- `coordinators` series IS the `cohort_claimed` series. The gap between the two
-- only exists nationally.
--
-- THE COLUMNS ARE NAMED cohort_claimed / cohort_approved, NOT claims / approvals,
-- and that naming is load-bearing. On a day axis, `approvals` reads as "claims
-- approved that day" and it is not: an approval is plotted on the day its
-- coordinator SIGNED UP, so every approval of someone who signed up before the
-- window is outside the chart entirely. Measured on the harness seed, a 30-day
-- window shows 4 approvals while 19 schools are approved -- a founder reading
-- that as an event chart would conclude recruitment had stopped and cut it. The
-- column names have to make the misread impossible at the call site, because the
-- call site is all a page author sees.
--
-- The day is an INDIAN STANDARD TIME day, for the reason spelled out over
-- admin_isc_timeline: the session runs in UTC on Supabase, the chart says IST,
-- and a coordinator who signs up at 02:00 IST belongs to the day they signed up
-- on rather than the one before.
create or replace function admin_coordinator_trend(
  p_state text default null, p_days int default 30
) returns table(day date, coordinators bigint, cohort_claimed bigint, cohort_approved bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_from  date := v_today - greatest(p_days, 1) + 1;
  -- Midnight IST on v_from as an instant, so the filter stays sargable on
  -- user_profiles_created_idx instead of bucketing every row first.
  v_from_at timestamptz := (v_from::timestamp) at time zone 'Asia/Kolkata';
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  with cl as (
    select s.coordinator_id cid, bool_or(s.coordinator_status = 'approved') approved
    from schools s
    where s.coordinator_id is not null and (p_state is null or s.state = p_state)
    group by s.coordinator_id
  ),
  c as (
    select (p.created_at at time zone 'Asia/Kolkata')::date d, count(*) n,
           count(cl.cid) cohort_claimed,
           count(*) filter (where cl.approved) cohort_approved
    from user_profiles p
    left join cl on cl.cid = p.id
    where p.role = 'coordinator' and p.created_at >= v_from_at
      and (p_state is null or cl.cid is not null)
    group by 1
  )
  -- Integer series for the same reason as admin_isc_timeline: the
  -- generate_series(date, date, interval) form resolves to the timestamptz
  -- overload and would make the boundaries depend on the session timezone.
  select (v_today - g.i)::date, coalesce(c.n, 0), coalesce(c.cohort_claimed, 0), coalesce(c.cohort_approved, 0)
  from generate_series(0, greatest(p_days, 1) - 1) g(i)
  left join c on c.d = v_today - g.i
  order by 1;
end $$;

-- The coordinator directory. Same paging contract as sections D and E: p_page is
-- 1-based, p_size is clamped to 200 INSIDE the SQL, `total` is count(*) over ().
--
-- auth.users is LEFT joined for exactly the reason given above admin_users_page:
-- a coordinator whose auth row has gone is the one an admin most needs to find,
-- and an inner join would hide them with no error. `email` is therefore NULLABLE.
--
-- PERFORMANCE, stated here because it is a property of the design. `students`
-- has to be known for every matching coordinator before the LIMIT -- it is the
-- default sort key and `total` counts the whole match set anyway -- so THIS PAGE
-- READS EVERY STUDENT ROW on every call, at every scale. That is its cost:
-- measured at 200k students it is ~130 ms, which is fine for an admin screen.
-- `students_entered` is NOT a sort key, so it is computed AFTER the page, once
-- per returned row, the way section D computes member_count: at 200k students
-- that is the difference between one hash over 1.16M member rows and 50 index
-- probes, and it is why the page is 130 ms rather than 1.6 s.
--
-- p_q is a substring search ORed across three columns on three different tables,
-- so it stays a filter over the join and no trigram index can serve it -- the
-- same story as admin_users_page, and the same remedy if it ever matters. It is
-- NOT the same story for auth.users, though: `role = 'coordinator'` is selective
-- (807 of 210,807 profiles at target scale), so the planner probes users_pkey
-- per coordinator rather than reading that table whole. Section F item 6(d)
-- shows the real plan.
--
-- A coordinator with no claim is listed with nulls in school_id, school_name,
-- state and district, claim_status 'none' and zero students. Passing p_state
-- excludes them, since a claim is the only thing that gives a coordinator a
-- state.
--
-- `schools_claimed` sits beside the single school_* columns because those columns
-- show ONE claim while `students` sums over all of them: without it somebody
-- holding four schools reads as "N students" against one school's name, on the
-- very screen the founder ranks people on, with the explanation a click away on
-- the detail page. It is 1 for everybody in practice (section F probe 9); when it
-- is not, the row says so where the row is read.
create or replace function admin_coordinators_page(
  p_q text default null, p_status text default null, p_state text default null,
  p_sort text default 'students_desc', p_page int default 1, p_size int default 50
) returns table(
  id uuid, full_name text, email text, phone text, school_id uuid, school_name text,
  state text, district text, claim_status text, schools_claimed bigint,
  students bigint, students_entered bigint, joined_at timestamptz, total bigint
) language plpgsql security definer set search_path = public as $$
declare v_size int    := least(greatest(coalesce(p_size, 50), 1), 200);
        v_off  bigint := (greatest(coalesce(p_page, 1), 1)::bigint - 1) * v_size;
        v_q    text   := nullif(lower(trim(coalesce(p_q, ''))), '');
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  with sch as (
    select s.id, s.name, s.state, s.district, s.coordinator_id, s.coordinator_status
    from schools s
    where s.coordinator_id is not null and (p_state is null or s.state = p_state)
  ),
  -- The strongest claim, one row per coordinator: approved, then pending, then
  -- rejected, then by name and id so the pick never changes between calls.
  claim as (
    select distinct on (sh.coordinator_id)
           sh.coordinator_id cid, sh.id sid, sh.name, sh.state, sh.district, sh.coordinator_status st
    from sch sh
    order by sh.coordinator_id,
             case sh.coordinator_status when 'approved' then 0 when 'pending' then 1
                                        when 'rejected' then 2 else 3 end,
             sh.name, sh.id
  ),
  reach as (
    select sh.coordinator_id cid, count(*) students
    from sch sh join user_profiles p on p.school_id = sh.id and p.role = 'student'
    group by sh.coordinator_id
  ),
  -- Separate from `reach`, which is an INNER join and so has no row at all for a
  -- coordinator whose only school has no students yet.
  held as (select sh.coordinator_id cid, count(*) n from sch sh group by sh.coordinator_id),
  page as (
    select p.id, p.full_name, u.email, p.phone, c.sid, c.name as school_name,
           c.state, c.district, coalesce(c.st, 'none') as claim_status,
           coalesce(h.n, 0)::bigint as schools_claimed,
           coalesce(r.students, 0)::bigint as students, p.created_at,
           count(*) over () as n_total
    from user_profiles p
    left join auth.users u on u.id = p.id
    left join claim c on c.cid = p.id
    left join reach r on r.cid = p.id
    left join held h on h.cid = p.id
    where p.role = 'coordinator'
      and (p_state is null or c.cid is not null)
      and (p_status is null or coalesce(c.st, 'none') = p_status)
      and (v_q is null
           or lower(coalesce(p.full_name, '')) like '%' || v_q || '%'
           or lower(coalesce(u.email, '')) like '%' || v_q || '%'
           or lower(coalesce(c.name, '')) like '%' || v_q || '%')
    -- An unrecognised p_sort falls through to students_desc rather than erroring.
    -- p.id last makes all four orders TOTAL: hundreds of coordinators share a
    -- students value (every coordinator of an empty school has 0), and two people
    -- very often share a name.
    order by
      case when p_sort = 'students_asc' then coalesce(r.students, 0) end asc,
      case when p_sort = 'name_asc'     then lower(coalesce(p.full_name, '')) end asc,
      case when p_sort = 'joined_desc'  then p.created_at end desc,
      coalesce(r.students, 0) desc,
      p.id
    limit v_size offset v_off
  )
  select pg.id, pg.full_name, pg.email, pg.phone, pg.sid, pg.school_name,
         pg.state, pg.district, pg.claim_status, pg.schools_claimed, pg.students,
         (select count(*) from schools sx
            join user_profiles px on px.school_id = sx.id and px.role = 'student'
           where sx.coordinator_id = pg.id
             and (p_state is null or sx.state = p_state)
             and exists (select 1 from isc_entry_members m
                          where m.user_id = px.id and (m.is_leader or m.accepted_at is not null))),
         pg.created_at, pg.n_total
  from page pg
  order by
    case when p_sort = 'students_asc' then pg.students end asc,
    case when p_sort = 'name_asc'     then lower(coalesce(pg.full_name, '')) end asc,
    case when p_sort = 'joined_desc'  then pg.created_at end desc,
    pg.students desc,
    pg.id;
end $$;

-- One coordinator, everything about them.
--
-- Returns SQL NULL -- not a JSON object, not an empty one -- when the id is not
-- a coordinator profile, so a page opened on a deleted user renders "not found"
-- instead of 500ing. Check for null before reading any key.
--
-- students / students_entered / entries / submitted / by_track are summed over
-- EVERY school this person has claimed, and `schools_claimed` says how many that
-- is (1 in practice; probe 9 in section F checks). `school` is their strongest
-- claim, or null if they have claimed nothing.
create or replace function admin_coordinator_detail(p_coordinator_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  with cl as (
    select s.id, s.name, s.state, s.district, s.review_status,
           s.coordinator_status, s.coordinator_notes, s.board
    from schools s where s.coordinator_id = p_coordinator_id
  ),
  ent as (
    select e.track, e.status from isc_entries e where e.school_id in (select cl.id from cl)
  ),
  -- One school's worth of students, so the correlated EXISTS is the cheap form
  -- here: a few hundred index probes on isc_entry_members_user_idx, against the
  -- million-row hash aggregate the national functions above have to build.
  stu as (
    select count(*) n_students,
           count(*) filter (where exists (
             select 1 from isc_entry_members m
             where m.user_id = p.id and (m.is_leader or m.accepted_at is not null))) n_entered
    from user_profiles p
    where p.role = 'student' and p.school_id in (select cl.id from cl)
  )
  select jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', u.email,
    'phone', p.phone,
    'joined_at', p.created_at,
    'onboarding_completed', p.onboarding_completed,
    'schools_claimed', (select count(*) from cl),
    'school', (select to_jsonb(t) from (
                 select cl.id, cl.name, cl.state, cl.district, cl.review_status,
                        cl.coordinator_status as claim_status, cl.coordinator_notes as notes, cl.board
                 from cl
                 order by case cl.coordinator_status when 'approved' then 0 when 'pending' then 1
                                                     when 'rejected' then 2 else 3 end,
                          cl.name, cl.id
                 limit 1) t),
    'students', (select n_students from stu),
    'students_entered', (select n_entered from stu),
    'entered_pct', (select case when n_students = 0 then 0
                                else round(100.0 * n_entered / n_students, 1) end from stu),
    'entries', (select count(*) from ent),
    'submitted', (select count(*) from ent where ent.status = 'submitted'),
    -- ENTRIES per track, not students: it sums to `entries` exactly. Ordered
    -- count desc then key, like every list in section C.
    'by_track', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc, k), '[]'::jsonb)
                 from (select ent.track k, count(*) c from ent group by ent.track) t)
  ) into v
  from user_profiles p
  left join auth.users u on u.id = p.id
  where p.id = p_coordinator_id and p.role = 'coordinator';
  return v;
end $$;

-- ---------------------------------------------------------------
-- F. Run these on the live project before trusting any admin figure
--
-- Nothing below runs as part of the migration. Queries 1-5 (sections C-E) and
-- 7-11 (section G) are integrity probes; part 6 is the EXPLAIN pass that
-- confirms the indexes are actually being used on real data. Run them once
-- after pasting this script, and again whenever a number on an admin page looks
-- wrong. 7-11 are the ones to run before trusting a coordinator figure: each is
-- a number that section G either cannot show you or has to leave out of a total.
--
-- 1. Orphan entries -- an entry whose school_id matches no row in schools.
--    Everything that reads entries here reaches them THROUGH schools:
--      * admin_isc_summary, admin_isc_breakdown, admin_isc_timeline (C) leave
--        such an entry out of by_status, by_track, by_division, by_language,
--        started, submitted, schools_with_entries and every day of the chart;
--      * admin_isc_roster and admin_isc_export_chunk (D) inner-join schools, so
--        the entry cannot be listed, opened or exported -- the founder cannot
--        even reach it to fix it;
--      * admin_search (E) will still find the STUDENT who created it, which is
--        the only thread left to pull.
--    admin_isc_cold_schools is the one exception: it tests `not exists (... where
--    e.school_id = s.id)` without joining, and an orphan's school_id matches no
--    real school, so the cold list is unaffected.
--
--      select count(*) from isc_entries e
--      left join schools s on s.id = e.school_id
--      where s.id is null;
--
--    Anything other than 0 means that many entries are absent from every number
--    on the admin pages. Fix the rows, then add
--    `alter table isc_entries add constraint isc_entries_school_fk
--     foreign key (school_id) references schools(id)` so it cannot happen again.
--
-- 2. Eligible students with no state. admin_isc_summary().eligible counts them;
--    every row of admin_isc_breakdown() drops them, so the state table will not
--    sum to the national headline by exactly this many:
--
--      select count(*) from user_profiles
--      where role = 'student' and isc_division_for_class(school_class) is not null
--        and school_state is null;
--
-- 3. Accepted member rows with no user. These are the rows where
--    admin_isc_roster.member_count (seats filled) and admin_isc_summary.started
--    (distinct people) disagree; the answer should be 0:
--
--      select count(*) from isc_entry_members
--      where user_id is null and (is_leader or accepted_at is not null);
--
-- 4. Approved schools with no eligible student. admin_isc_cold_schools does not
--    list them -- there is nobody to phone yet -- so they are invisible on the
--    outreach page. This is the count that page is not showing you:
--
--      select count(*) from schools s
--      where s.review_status = 'approved'
--        and not exists (select 1 from isc_entries e where e.school_id = s.id)
--        and not exists (select 1 from user_profiles p where p.school_id = s.id
--                          and p.role = 'student'
--                          and isc_division_for_class(p.school_class) is not null);
--
-- 5. Profiles with no auth user. admin_users_page LEFT joins auth.users so these
--    still appear, with a null email; they cannot be found by email search and
--    they cannot sign in. Should be 0:
--
--      select count(*) from user_profiles p
--      left join auth.users u on u.id = p.id
--      where u.id is null;
--
-- 6. Index use. Each of these should show an Index Scan, an Index Only Scan or a
--    Bitmap Heap Scan -- never "Seq Scan on isc_entries" or "Seq Scan on
--    user_profiles" for a scoped query. Substitute a real school id and a name
--    that exists. The unscoped calls (a national roster page, a dashboard) DO
--    read every row by design: count(*) over () has to count everything, so
--    judge those on wall-clock time, not on the plan.
--
--      explain analyze select * from admin_isc_roster(null, null, (select id from schools limit 1), null, null, null, null, null, 1, 50);
--      explain analyze select * from admin_users_page('sharma', 'student', null, 'created_desc', 1, 50);
--      explain analyze select * from admin_search('sharma', 10);
--      explain analyze select admin_isc_summary('Haryana');
--      explain analyze select admin_dashboard();
--
--    EXPLAIN of a function call only ever prints "Function Scan", so the plans
--    that matter are the statements inside. Either set
--    `auto_explain.log_nested_statements = on`, or -- simpler -- run the bodies
--    directly, which is what the local harness asserts on:
--
--      explain analyze
--      select e.id from isc_entries e join schools s on s.id = e.school_id
--      where e.school_id = (select id from schools limit 1)
--      order by e.created_at desc, e.id desc limit 50;
--
--      explain analyze
--      select p.id, count(*) over () from user_profiles p
--      left join auth.users u on u.id = p.id
--      where p.role = 'student'
--        and (lower(coalesce(p.full_name, '')) like '%sharma%'
--             or lower(coalesce(u.email, '')) like '%sharma%'
--             or coalesce(p.phone, '') like '%sharma%'
--             or lower(coalesce(p.school_name, '')) like '%sharma%')
--      order by p.created_at desc, p.id limit 50;
--
--    That second one is the ONLY probe in the section C-E group that is SUPPOSED
--    to show a sequential scan -- two of them, on user_profiles and on
--    auth.users. That is correct and accepted for an admin-only search; see the
--    note above admin_users_page in section E for why no index can help and what
--    would. Do not shorten it to the full_name branch alone: that one predicate
--    does use user_profiles_name_trgm, and measuring it would tell you the users
--    page is index-backed when it is not.
--
--    SECTION G. Same rule, same trap: the plans that matter are the statements
--    inside, so run the bodies. Substitute a real state and a name that exists.
--
--      explain analyze select admin_coordinator_summary('Haryana');
--      explain analyze select * from admin_coordinators_page(null, null, 'Haryana', 'students_desc', 1, 50);
--      explain analyze select admin_coordinator_detail((select coordinator_id from schools where coordinator_id is not null limit 1));
--
--    (a) Every claim lookup goes through schools.coordinator_id. Index Scan on
--        schools_coordinator_idx, or the whole section is a sequential scan of
--        schools per coordinator:
--
--      explain analyze
--      select s.id from schools s
--      where s.coordinator_id = (select coordinator_id from schools where coordinator_id is not null limit 1);
--
--    (b) The per-coordinator student count, which is what `students` and the
--        default sort are built from. Bitmap Heap Scan via user_profiles_school_idx:
--
--      explain analyze
--      select count(*) from schools sx
--      join user_profiles px on px.school_id = sx.id and px.role = 'student'
--      where sx.coordinator_id = (select coordinator_id from schools where coordinator_id is not null limit 1);
--
--    (c) students_entered, once per row of a page. Index Only Scan or Bitmap Heap
--        Scan on isc_entry_members_user_idx -- 50 of these run per page, so a
--        sequential scan here costs 50 sequential scans of 1.2M rows:
--
--      explain analyze
--      select count(*) from user_profiles px
--      where px.school_id = (select id from schools where coordinator_id is not null limit 1)
--        and px.role = 'student'
--        and exists (select 1 from isc_entry_members m
--                     where m.user_id = px.id and (m.is_leader or m.accepted_at is not null));
--
--    (d) The coordinators-page search predicate, written OUT IN FULL. Like the
--        users page it ORs a name, an email on auth.users and a school name, so
--        the whole thing stays a FILTER over the join: a BitmapOr cannot span
--        three tables, no trigram index is reachable, AND THAT IS EXPECTED. Do
--        not shorten it to the full_name branch: that one uses
--        user_profiles_name_trgm and would report the directory as index-backed
--        when it is not. The remedy, if it ever matters, is the one in the note
--        above admin_users_page -- get every searched value onto one table.
--
--        Read the plan for two things. The `Filter:` line carrying all three
--        `like` branches is the point above. The other is the students-per-
--        coordinator aggregate at the bottom: a Seq Scan of user_profiles, which
--        is this page's real cost and is structural (see the note above the
--        function). What you should NOT expect is a sequential scan of
--        auth.users: unlike admin_users_page this query has a highly selective
--        `role = 'coordinator'`, so the planner walks user_profiles_role_idx and
--        probes users_pkey per coordinator once the table is big enough:
--
--      explain analyze
--      select p.id, count(*) over () from user_profiles p
--      left join auth.users u on u.id = p.id
--      left join (select distinct on (coordinator_id) coordinator_id cid, id sid, name
--                 from schools where coordinator_id is not null
--                 order by coordinator_id, name, id) c on c.cid = p.id
--      left join (select s.coordinator_id cid, count(*) students
--                 from schools s join user_profiles q on q.school_id = s.id and q.role = 'student'
--                 where s.coordinator_id is not null group by s.coordinator_id) r on r.cid = p.id
--      where p.role = 'coordinator'
--        and (lower(coalesce(p.full_name, '')) like '%sharma%'
--             or lower(coalesce(u.email, '')) like '%sharma%'
--             or lower(coalesce(c.name, '')) like '%sharma%')
--      order by coalesce(r.students, 0) desc, p.id limit 50;
--
-- 7. Coordinators who have claimed nothing. THIS IS THE GAP between the national
--    admin_coordinator_summary().coordinators and the sum of
--    admin_coordinator_breakdown().coordinators, and it is the only column of
--    that table which does not add up. A coordinator has no state of their own
--    (see the top of section G), so these people are in the national count and
--    in no state row:
--
--      select count(*) from user_profiles p
--      where p.role = 'coordinator'
--        and not exists (select 1 from schools s where s.coordinator_id = p.id);
--
--    They are still listed by admin_coordinators_page with claim_status 'none',
--    null school columns and 0 students -- unless you pass p_state, which
--    excludes them.
--
-- 8. Claims that do not line up. Both should be 0.
--
--      -- an approval nobody owns: counted as pending_coordinators by
--      -- admin_dashboard (which reads the status alone) but NOT as covered by
--      -- section G (which requires both), so the two pages disagree by this many.
--      select count(*) from schools
--      where coordinator_id is null and coordinator_status <> 'none';
--
--      -- a claim with no status: the person is counted in `coordinators` but
--      -- under none of approved / pending / rejected.
--      select count(*) from schools
--      where coordinator_id is not null and coordinator_status = 'none';
--
--      -- a claim by somebody who is not a coordinator (or not there at all).
--      -- A scoped admin_coordinator_summary().coordinators counts these, since
--      -- it counts distinct coordinator_id on schools; the national one does
--      -- not, since it counts profiles. That is the second way the two can part.
--      select count(*) from schools s
--      where s.coordinator_id is not null
--        and not exists (select 1 from user_profiles p
--                         where p.id = s.coordinator_id and p.role = 'coordinator');
--
-- 9. Coordinators holding more than one claim. Should be 0 -- the product allows
--    one -- and if it is not, admin_coordinators_page and admin_coordinator_detail
--    show these people ONE school name (their strongest claim) beside student
--    numbers summed over ALL of their schools. detail's `schools_claimed` is the
--    field that says so:
--
--      select count(*) from (
--        select coordinator_id from schools where coordinator_id is not null
--        group by coordinator_id having count(*) > 1) t;
--
-- 10. Students whose school_id matches no school. students_covered and
--     students_uncovered are both reached through the schools row, so these
--     students are in NEITHER and the two do not sum to the student total:
--
--       select count(*) from user_profiles p
--       where p.role = 'student'
--         and (p.school_id is null
--              or not exists (select 1 from schools s where s.id = p.school_id));
--
-- 11. Students who are entered ONLY at somebody else's school. `students_entered`
--     and `entered_pct` count a student as entered whatever school their entry
--     belongs to (see the top of section G), and this is the number of people
--     that decision actually changes: they compete, but never on an entry
--     belonging to their own school, so the narrower reading would report them as
--     not entered. It is not an error -- a cross-school team is legal.
--
--     The `not exists` is the whole point of the probe. WITHOUT IT this counts
--     every student who has any cross-school membership, including the many who
--     ALSO lead an entry at their own school and are counted as entered under
--     both readings. On the harness seed that difference is 12,583 against 0: a
--     probe missing this clause invites the founder to reverse a correct decision
--     over an empty set.
--
--       select count(distinct m.user_id) from isc_entry_members m
--       join isc_entries e on e.id = m.entry_id
--       join user_profiles p on p.id = m.user_id
--       where (m.is_leader or m.accepted_at is not null)
--         and p.school_id is not null and p.school_id <> e.school_id
--         and not exists (
--           select 1 from isc_entry_members m2
--           join isc_entries e2 on e2.id = m2.entry_id
--           where m2.user_id = p.id and (m2.is_leader or m2.accepted_at is not null)
--             and e2.school_id = p.school_id);
-- ---------------------------------------------------------------
