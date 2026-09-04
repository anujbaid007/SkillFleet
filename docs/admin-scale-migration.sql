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

update isc_entries e
   set division = isc_division_for_class(p.school_class)
  from user_profiles p
 where p.id = e.created_by and e.division is null;
