-- Consent recorded at registration, per DPDP s.5 (notice) and s.6 (consent
-- before processing, specific and unbundled).
--
-- Additive and idempotent: every column is nullable with `if not exists`, so
-- running it twice is safe and no existing profile is altered. Accounts made
-- before this simply have null, which is honest — they were created before the
-- consent step existed and must not be recorded as having agreed to it.

alter table public.user_profiles
  add column if not exists terms_agreed_at       timestamptz,
  add column if not exists terms_version         text,
  -- Optional and separable. Marketing is sent to the parent's email and
  -- WhatsApp number only: DPDP s.9(3) forbids advertising directed at a child
  -- outright, so no consent could authorise sending it to the student.
  add column if not exists marketing_skillfleet  boolean,
  add column if not exists marketing_brainweave  boolean;

comment on column public.user_profiles.terms_agreed_at is
  'When the parent or account holder agreed to the privacy notice.';
comment on column public.user_profiles.terms_version is
  'Which version of the notice was agreed to, so a later edit to the wording cannot rewrite what past users accepted.';
comment on column public.user_profiles.marketing_skillfleet is
  'Optional: Skill Fleet may contact the parent with news and offers.';
comment on column public.user_profiles.marketing_brainweave is
  'Optional: parent contact details may be shared with Brainweave, who run Puzzle Master.';
