-- ===============================================================
-- Puzzle Master registration
--
-- Puzzle Master is played live, so there is nothing to upload. But a school
-- coordinator still needs to see who from their school is taking part, and a
-- student needs a way to say "I'm in". This lets a student register for the
-- track as an individual entry with an empty submission, which then appears
-- in the coordinator roster, the analytics and the admin pages like any other
-- entry. Safe to run more than once.
-- ===============================================================

-- A. The track is allowed on entries and on team-member rows.
ALTER TABLE public.isc_entries DROP CONSTRAINT IF EXISTS isc_entries_track_check;
ALTER TABLE public.isc_entries ADD CONSTRAINT isc_entries_track_check
  CHECK (track IN ('ai_for_impact', 'entrepreneurship', 'content_creator', 'puzzle_master'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'isc_entry_members_track_check') THEN
    ALTER TABLE public.isc_entry_members DROP CONSTRAINT isc_entry_members_track_check;
    ALTER TABLE public.isc_entry_members ADD CONSTRAINT isc_entry_members_track_check
      CHECK (track IN ('ai_for_impact', 'entrepreneurship', 'content_creator', 'puzzle_master'));
  END IF;
END $$;

-- B. The track stays open until the last round day, 31 December 2026 (IST).
INSERT INTO public.isc_config (track, screening_deadline)
VALUES ('puzzle_master', '2026-12-31T18:29:59+00:00')
ON CONFLICT (track) DO UPDATE SET screening_deadline = EXCLUDED.screening_deadline;

-- C. Individual only: a Puzzle Master entry can never gain a second member.
--    Enforced at the table so no code path, present or future, can add one.
CREATE OR REPLACE FUNCTION public.isc_puzzle_master_is_individual()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.track = 'puzzle_master' AND NOT NEW.is_leader THEN
    RAISE EXCEPTION 'Puzzle Master is entered individually' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS isc_puzzle_master_individual ON public.isc_entry_members;
CREATE TRIGGER isc_puzzle_master_individual
  BEFORE INSERT ON public.isc_entry_members
  FOR EACH ROW EXECUTE FUNCTION public.isc_puzzle_master_is_individual();

-- D. Submitting a Puzzle Master entry needs no submission: registering is the
--    whole act. Everything else in this function is exactly as it was.
CREATE OR REPLACE FUNCTION public.isc_submit_entry(p_entry_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_track text; v_leader uuid; v_school uuid; v_leader_class text; v_sub jsonb;
  v_status text; v_bad int; v_missing text;
BEGIN
  SELECT e.track, e.created_by, e.school_id, e.submission, e.status
    INTO v_track, v_leader, v_school, v_sub, v_status
    FROM public.isc_entries e WHERE e.id = p_entry_id;
  IF v_track IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_leader IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_leader');
  END IF;
  IF v_status = 'submitted' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'entry_submitted');
  END IF;
  IF NOT public.isc_is_open(v_track) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'track_closed');
  END IF;
  IF v_track <> 'puzzle_master' AND (v_sub IS NULL OR v_sub = '{}'::jsonb) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
  END IF;

  v_missing := public.isc_first_incomplete_field(v_track, v_sub);
  IF v_missing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'incomplete_submission', 'field', v_missing);
  END IF;

  SELECT count(*) INTO v_bad
    FROM public.isc_entry_members m
    JOIN public.user_profiles p ON p.id = m.user_id
   WHERE m.entry_id = p_entry_id AND p.school_id IS DISTINCT FROM v_school;
  IF v_bad > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'wrong_school'); END IF;

  SELECT p.school_class INTO v_leader_class FROM public.user_profiles p WHERE p.id = v_leader;
  SELECT count(*) INTO v_bad
    FROM public.isc_entry_members m
    JOIN public.user_profiles p ON p.id = m.user_id
   WHERE m.entry_id = p_entry_id
     AND public.isc_group_for_class(p.school_class)
         IS DISTINCT FROM public.isc_group_for_class(v_leader_class);
  IF v_bad > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'wrong_group'); END IF;

  UPDATE public.isc_entries
     SET status = 'submitted', submitted_at = now(),
         consent_given_at = now(), updated_at = now()
   WHERE id = p_entry_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
