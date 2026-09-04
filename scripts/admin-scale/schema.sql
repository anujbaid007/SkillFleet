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
