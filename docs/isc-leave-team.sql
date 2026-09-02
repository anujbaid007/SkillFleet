-- A teammate leaves an entry they accepted.
--
-- Until now only the leader could change a team: isc_leave_entry is
-- leader-only and deletes the whole entry, and isc_remove_member is
-- leader-only too. A student who accepted an invite therefore had no way out
-- except asking their leader. This is the mirror image of isc_remove_member,
-- acting on the caller's own membership row.
--
-- Mirrors the sibling functions exactly: SECURITY DEFINER with an empty
-- search_path, the caller identified only through auth.uid(), and the same
-- refusals — nothing after submission, nothing after the deadline.

CREATE OR REPLACE FUNCTION public.isc_leave_team(p_entry_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_track text; v_leader uuid; v_member_id uuid;
BEGIN
  SELECT e.track, e.created_by INTO v_track, v_leader
    FROM public.isc_entries e WHERE e.id = p_entry_id;
  IF v_track IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  -- The leader has isc_leave_entry, which handles the whole entry.
  IF v_leader = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'is_leader');
  END IF;

  -- Only the caller's own accepted, non-leader membership. A pending invite
  -- is declined through isc_respond_to_invite instead.
  SELECT m.id INTO v_member_id
    FROM public.isc_entry_members m
   WHERE m.entry_id = p_entry_id
     AND m.user_id = auth.uid()
     AND m.is_leader = false
     AND m.accepted_at IS NOT NULL;
  IF v_member_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  -- A submitted entry's team is the team the judges see; it cannot change.
  IF public.isc_entry_is_final(p_entry_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'entry_submitted');
  END IF;
  IF NOT public.isc_is_open(v_track) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'track_closed');
  END IF;

  DELETE FROM public.isc_entry_members WHERE id = v_member_id;
  RETURN jsonb_build_object('ok', true, 'track', v_track);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.isc_leave_team(uuid) TO authenticated;
