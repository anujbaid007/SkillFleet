-- Server-side completeness check on submit.
--
-- isc_submit_entry only ever checked that the submission was not '{}'. The
-- app validates every field before calling it, but a direct RPC call could
-- submit an entry with fields missing, and a judge would open a half-empty
-- one. The function now refuses unless every required field for the track is
-- present and non-blank, and every link field starts with http(s)://.
--
-- Deliberately narrow: presence and link shape only. Length limits and the
-- language option list stay in the app, so the two cannot disagree on
-- anything a student would actually see. A unit test in the repo
-- (src/lib/isc/__tests__/submit-validation-sql.test.ts) reads this file and
-- fails if a track's field list here ever stops matching TRACK_FIELDS.

CREATE OR REPLACE FUNCTION public.isc_required_fields(p_track text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT CASE p_track
    WHEN 'ai_for_impact'    THEN ARRAY['app_url','demo_video_url','explanation','language']
    WHEN 'entrepreneurship' THEN ARRAY['problem','solution','target_audience','impact','feasibility','business_model','pitch_video_url','language']
    WHEN 'content_creator'  THEN ARRAY['video_url','title','theme_note','language']
    ELSE ARRAY[]::text[]
  END
$function$;

CREATE OR REPLACE FUNCTION public.isc_link_fields(p_track text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT CASE p_track
    WHEN 'ai_for_impact'    THEN ARRAY['app_url','demo_video_url']
    WHEN 'entrepreneurship' THEN ARRAY['pitch_video_url']
    WHEN 'content_creator'  THEN ARRAY['video_url']
    ELSE ARRAY[]::text[]
  END
$function$;

-- The first field that is missing, blank, or (for a link) not http(s)://,
-- or NULL when the submission is complete.
CREATE OR REPLACE FUNCTION public.isc_first_incomplete_field(p_track text, p_sub jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
DECLARE k text; v text;
BEGIN
  FOREACH k IN ARRAY public.isc_required_fields(p_track) LOOP
    v := btrim(coalesce(p_sub ->> k, ''));
    IF v = '' THEN RETURN k; END IF;
    IF k = ANY (public.isc_link_fields(p_track)) AND v !~* '^https?://' THEN RETURN k; END IF;
  END LOOP;
  RETURN NULL;
END;
$function$;

-- isc_submit_entry, unchanged except for the one block marked NEW.
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
  IF v_sub IS NULL OR v_sub = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
  END IF;

  -- NEW: every required field present, every link an http(s) URL.
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
