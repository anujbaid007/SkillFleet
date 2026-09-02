-- ISC consent, recorded per DPDP s.5 (notice) and s.6 (specific, unbundled).
--
-- Additive only: every column is nullable with `if not exists`, so running it
-- twice is safe and nothing already stored is touched. isc_give_consent() is
-- deliberately left alone — the app calls it unchanged and then fills these in.

alter table public.isc_consent
  -- 'student' today. The column exists so that adding verifiable parental
  -- consent later is a change of actor, not a schema migration.
  add column if not exists consented_by text,

  -- Which wording was agreed to. Without this, a later change to the consent
  -- text would silently rewrite what past students are recorded as having
  -- agreed to.
  add column if not exists consent_version text,

  -- Optional and separable, so they are stored separately. Bundling them into
  -- the required consent is what s.6 prohibits.
  add column if not exists promo_use boolean,
  add column if not exists brainweave_sharing boolean;

comment on column public.isc_consent.consented_by is
  'Who performed the affirmative action: student | guardian.';
comment on column public.isc_consent.consent_version is
  'Version of the consent wording agreed to, so a later edit cannot rewrite history.';
comment on column public.isc_consent.promo_use is
  'Optional: entry may be shown in championship promotion. Refusing does not block entry.';
comment on column public.isc_consent.brainweave_sharing is
  'Optional: name and class may be shared with Brainweave, who host Puzzle Master.';
