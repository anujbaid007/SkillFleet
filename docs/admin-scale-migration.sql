-- Admin at scale: indexes, the division column and admin-only functions.
-- Safe to run more than once. Paste into the Supabase SQL editor as one script.

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
create or replace function admin_isc_timeline(
  p_state text default null, p_district text default null, p_school_id uuid default null, p_days int default 30
) returns table(day date, started bigint, submitted bigint)
language plpgsql security definer set search_path = public as $$
declare v_from date := current_date - greatest(p_days, 1) + 1;
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
      and (e.created_at >= v_from or e.submitted_at >= v_from)
  ),
  c as (select created_at::date d, count(*) n from scoped where created_at >= v_from group by 1),
  s as (select submitted_at::date d, count(*) n from scoped where submitted_at >= v_from group by 1)
  -- Integer series, not generate_series(date, date, interval): the date/interval
  -- form is resolved to the timestamptz overload, so the day column would come
  -- back as a timestamptz needing a cast, and the boundaries would depend on the
  -- session timezone. `current_date - int` is plain date arithmetic.
  select (current_date - g.i)::date, coalesce(c.n, 0), coalesce(s.n, 0)
  from generate_series(0, greatest(p_days, 1) - 1) g(i)
  left join c on c.d = current_date - g.i
  left join s on s.d = current_date - g.i
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
-- F. Run these on the live project before trusting any admin figure
--
-- NOTE to whoever appends section E's EXPLAIN checks: they belong in THIS
-- block. Do not start a second "F." heading further down the file.
--
-- 1. Orphan entries. Every function in section C reaches isc_entries through
--    schools, so an entry whose school_id matches no schools row is missing
--    from by_status, started, submitted, schools_with_entries AND the timeline
--    -- silently, with no error anywhere.
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
-- ---------------------------------------------------------------
