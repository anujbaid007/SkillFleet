# ISC Invite Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make joining an ISC team require the invited student's explicit accept — both for adding an existing account directly and for claiming an email invite after signup — instead of today's instant link.

**Architecture:** One nullable timestamp, `accepted_at`, added to `isc_entry_members` (`NULL` = pending, set = accepted), following the same idiom as `submitted_at`/`consent_given_at`/`edited_at` already in this schema. Every read that currently treats "has a `user_id`" as "is on the team" is audited and, where that assumption breaks, fixed. A new RPC lets the invitee accept or decline; a new banner on `/isc` is where they do it.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + `SECURITY DEFINER` RPCs), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-26-isc-invite-acceptance-design.md`

## Global Constraints

- **Never push, never touch `main`.** All work stays on `feature/nikhil`.
- **Supabase project `bbioktywqkfvpzmakdxt` only.** Never the `happyfleet` project.
- **`supabase/` is gitignored.** The migration in this plan is applied to the live DB via `sbq.ps1` in the session scratchpad and is never `git add`ed.
- **Impersonation for verification sets only `request.jwt.claims`, never `set_config('role', ...)`** — the latter switches the real Postgres session role and breaks `auth.users` access.
- **Every verification query runs inside a rolled-back transaction** (`DO $$ ... RAISE EXCEPTION ...; END $$;`), so nothing written during a check survives it.
- **Never overwrite a real user's password or role to get test access.** Browser checks use a fresh throwaway account, deleted afterward — never Maya's, Sara's, Rhea's, or Ananya's real credentials (their real data is only ever touched inside rolled-back SQL transactions, never logged into).
- **`isc_get_my_entries` cannot simply exclude pending rows** — the track page uses it to detect "I already have some row for this track" before deciding whether to create one; excluding pending rows there causes a redirect loop (Task 3 covers why and the fix).
- **Type-check with `npx tsc --noEmit`** before every commit. It must be clean.
- **Tests are Vitest**, run with `npm test`. This plan adds no new pure-function library — every change here is either SQL (verified live) or thin server-action/UI wiring (verified in the browser), matching how sub-project A's own UI-wiring tasks were verified.
- **Copy:** sentence case, no exclamation marks.

## File Structure

**New:**
- `supabase/migrations/0057_isc_invite_accept.sql`
- `src/components/isc/pending-invites.tsx` — the invitee's Accept/Decline banner on `/isc`.

**Modified:**
- `src/app/actions/isc.ts` — `IscMember.acceptedAt`, `MyEntry.isAccepted`, `addMemberAction`'s new state branch, new `PendingInvite`/`getMyPendingInvites`/`RespondState`/`respondToInviteAction`.
- `src/components/isc/team-panel.tsx` — three-state member row.
- `src/app/(platform)/isc/page.tsx` — render `PendingInvites`, filter `byTrack` on `isAccepted`.
- `src/app/(platform)/isc/[track]/page.tsx` — redirect a still-pending invitee back to `/isc` instead of showing them "Ready when you are."

**Unchanged, verified rather than edited:** `isc_claim_invites` (Task 1 explains why), `isc_remove_member`, `isc_is_member`, `team_full`/`already_in_track` checks inside `isc_add_member`.

---

### Task 1: Database — pending state, new RPCs, and every read that assumed instant linking

**Files:**
- Create: `supabase/migrations/0057_isc_invite_accept.sql`

**Interfaces:**
- Consumes: `isc_group_for_class(TEXT)`, `isc_is_open(TEXT)` (both from sub-project A / earlier migrations)
- Produces: `public.isc_entry_members.accepted_at TIMESTAMPTZ`; `public.isc_respond_to_invite(p_member_id UUID, p_accept BOOLEAN) RETURNS JSONB`; `public.isc_get_my_invites() RETURNS JSONB`; `isc_add_member`'s existing-account branch now returns `'state': 'awaiting_accept'` (was `'linked'`); `isc_get_my_entries()`'s rows gain an `is_accepted` boolean field, consumed by Task 2/3.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0057_isc_invite_accept.sql`:

```sql
-- 0057: joining a team now requires the invitee's explicit accept. One
-- nullable timestamp does the whole job — the same idiom as submitted_at,
-- consent_given_at and edited_at elsewhere in this schema. NULL means
-- pending; set means accepted.

ALTER TABLE public.isc_entry_members ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Every row already linked under the old instant-join behaviour must not
-- retroactively look pending the moment this ships — that would knock every
-- existing confirmed teammate off every roster and track card.
UPDATE public.isc_entry_members
   SET accepted_at = created_at
 WHERE user_id IS NOT NULL AND accepted_at IS NULL;

-- isc_add_member: the existing-account branch stops linking outright. It
-- inserts with accepted_at left NULL and returns 'awaiting_accept' instead
-- of 'linked' — the leader's UI needs to tell this apart from the
-- unregistered-email 'invited' state, which still shows a shareable link.
CREATE OR REPLACE FUNCTION public.isc_add_member(p_entry_id UUID, p_email TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_track text; v_leader uuid; v_school uuid; v_email text; v_leader_class text;
  v_target uuid; v_target_school uuid; v_target_class text; v_name text;
  v_count int; v_token text;
BEGIN
  v_email := lower(btrim(coalesce(p_email, '')));
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_email');
  END IF;

  SELECT e.track, e.created_by, e.school_id INTO v_track, v_leader, v_school
    FROM public.isc_entries e WHERE e.id = p_entry_id;
  IF v_track IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_leader IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_leader');
  END IF;
  IF NOT public.isc_is_open(v_track) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'track_closed');
  END IF;

  SELECT p.school_class INTO v_leader_class FROM public.user_profiles p WHERE p.id = v_leader;

  SELECT count(*) INTO v_count FROM public.isc_entry_members m WHERE m.entry_id = p_entry_id;
  IF v_count >= 3 THEN RETURN jsonb_build_object('ok', false, 'error', 'team_full'); END IF;

  SELECT u.id INTO v_target FROM auth.users u WHERE lower(u.email) = v_email;

  IF v_target IS NOT NULL THEN
    IF v_target = auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'self_add');
    END IF;

    SELECT p.school_id, p.full_name, p.school_class INTO v_target_school, v_name, v_target_class
      FROM public.user_profiles p WHERE p.id = v_target AND p.role = 'student';
    IF v_target_school IS NULL OR v_target_school IS DISTINCT FROM v_school THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_school');
    END IF;

    IF public.isc_group_for_class(v_leader_class)
       IS DISTINCT FROM public.isc_group_for_class(v_target_class) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_group');
    END IF;

    IF EXISTS (SELECT 1 FROM public.isc_entry_members m
                WHERE m.user_id = v_target AND m.track = v_track) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_in_track');
    END IF;

    INSERT INTO public.isc_entry_members (entry_id, track, user_id)
    VALUES (p_entry_id, v_track, v_target);

    RETURN jsonb_build_object('ok', true, 'state', 'awaiting_accept', 'name', v_name);
  END IF;

  IF EXISTS (SELECT 1 FROM public.isc_entry_members m
              WHERE m.track = v_track AND lower(m.invited_email) = v_email
                AND m.user_id IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_invited');
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.isc_entry_members (entry_id, track, invited_email, invite_token)
  VALUES (p_entry_id, v_track, v_email, v_token);

  RETURN jsonb_build_object('ok', true, 'state', 'invited', 'token', v_token);
END;
$$;

-- isc_claim_invites is deliberately UNCHANGED. It already only sets user_id
-- and clears invited_email/invite_token — it never touched accepted_at
-- before this migration and still doesn't, so a claimed invite lands with
-- accepted_at NULL automatically: exactly the same "awaiting response" state
-- a direct add produces. Verified empirically in Task 1 Step 6, not just by
-- inspection.

/** Every pending invite for the caller — what the /isc banner renders. */
CREATE OR REPLACE FUNCTION public.isc_get_my_invites()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'member_id', m.id,
           'entry_id', e.id,
           'track', e.track,
           'leader_name', p.full_name
         ) ORDER BY m.created_at), '[]'::jsonb)
    FROM public.isc_entry_members m
    JOIN public.isc_entries e ON e.id = m.entry_id
    JOIN public.user_profiles p ON p.id = e.created_by
   WHERE m.user_id = auth.uid() AND m.accepted_at IS NULL AND m.is_leader = false;
$$;

/**
 * The invitee accepts or declines. Re-checks group and school as defense in
 * depth against a profile edit landing between invite and accept — on
 * failure the row is left untouched so the banner can show a real message
 * instead of the invite silently vanishing.
 */
CREATE OR REPLACE FUNCTION public.isc_respond_to_invite(p_member_id UUID, p_accept BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_entry uuid; v_track text; v_user_id uuid; v_accepted_at timestamptz;
  v_school uuid; v_leader uuid; v_leader_class text; v_my_school uuid; v_my_class text;
BEGIN
  SELECT m.entry_id, m.user_id, m.accepted_at, e.track, e.school_id, e.created_by
    INTO v_entry, v_user_id, v_accepted_at, v_track, v_school, v_leader
    FROM public.isc_entry_members m
    JOIN public.isc_entries e ON e.id = m.entry_id
   WHERE m.id = p_member_id;

  -- Same treatment whether the row does not exist or belongs to someone
  -- else: never confirm that another student's pending invite exists.
  IF v_entry IS NULL OR v_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_resolved');
  END IF;
  IF NOT public.isc_is_open(v_track) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'track_closed');
  END IF;

  IF NOT p_accept THEN
    DELETE FROM public.isc_entry_members WHERE id = p_member_id;
    RETURN jsonb_build_object('ok', true, 'action', 'declined', 'entry_id', v_entry, 'track', v_track);
  END IF;

  SELECT p.school_id, p.school_class INTO v_my_school, v_my_class
    FROM public.user_profiles p WHERE p.id = auth.uid();
  IF v_my_school IS DISTINCT FROM v_school THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_school');
  END IF;

  SELECT p.school_class INTO v_leader_class FROM public.user_profiles p WHERE p.id = v_leader;
  IF public.isc_group_for_class(v_my_class)
     IS DISTINCT FROM public.isc_group_for_class(v_leader_class) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_group');
  END IF;

  UPDATE public.isc_entry_members SET accepted_at = now() WHERE id = p_member_id;
  RETURN jsonb_build_object('ok', true, 'action', 'accepted', 'entry_id', v_entry, 'track', v_track);
END;
$$;

-- get_school_roster: a pending invite is not "entered" for the coordinator's
-- Attempt Status column.
CREATE OR REPLACE FUNCTION public.get_school_roster()
RETURNS TABLE (student_id UUID, full_name TEXT, school_class TEXT, isc_status JSONB)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT p.id, p.full_name, p.school_class,
         COALESCE((
           SELECT jsonb_object_agg(m.track, e.status)
             FROM public.isc_entry_members m
             JOIN public.isc_entries e ON e.id = m.entry_id
            WHERE m.user_id = p.id AND m.accepted_at IS NOT NULL
         ), '{}'::jsonb)
    FROM public.user_profiles p
    JOIN public.schools s
      ON s.id = p.school_id
     AND s.coordinator_id = auth.uid()
     AND s.coordinator_status = 'approved'
   WHERE p.role = 'student'
   ORDER BY p.school_class NULLS LAST, p.full_name NULLS LAST;
$$;

-- isc_get_my_entries: NOT filtered to accepted-only. The track page needs
-- this same call to know "do I already have some row for this track" (pending
-- included) before it decides whether to let a student create a new draft —
-- filtering pending rows out here would make that check silently fail and
-- send a pending invitee into a "Ready when you are" screen that loops back
-- to itself. Instead each row now says whether it is accepted, and each
-- caller decides what that means for it (Task 3).
CREATE OR REPLACE FUNCTION public.isc_get_my_entries()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'entry_id', e.id,
           'track', e.track,
           'status', e.status,
           'is_leader', m.is_leader,
           'is_accepted', (m.accepted_at IS NOT NULL),
           'submitted_at', e.submitted_at
         )), '[]'::jsonb)
    FROM public.isc_entry_members m
    JOIN public.isc_entries e ON e.id = m.entry_id
   WHERE m.user_id = auth.uid();
$$;

-- isc_get_entry: the leader's view is unchanged (still every member, pending
-- or not — the leader needs to see who hasn't responded), only gains the
-- field to tell the states apart.
CREATE OR REPLACE FUNCTION public.isc_get_entry(p_entry_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '' AS $$
DECLARE v_row jsonb;
BEGIN
  IF NOT public.isc_is_member(p_entry_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT jsonb_build_object(
           'ok', true,
           'entry_id', e.id,
           'track', e.track,
           'status', e.status,
           'submission', e.submission,
           'is_leader', (e.created_by = auth.uid()),
           'submitted_at', e.submitted_at,
           'members', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
                      'member_id', m.id,
                      'user_id', m.user_id,
                      'name', p.full_name,
                      'school_class', p.school_class,
                      'invited_email', m.invited_email,
                      'invite_token', m.invite_token,
                      'is_leader', m.is_leader,
                      'accepted_at', m.accepted_at
                    ) ORDER BY m.is_leader DESC, m.created_at)
               FROM public.isc_entry_members m
               LEFT JOIN public.user_profiles p ON p.id = m.user_id
              WHERE m.entry_id = e.id), '[]'::jsonb)
         )
    INTO v_row
    FROM public.isc_entries e WHERE e.id = p_entry_id;

  RETURN COALESCE(v_row, jsonb_build_object('ok', false, 'error', 'not_found'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.isc_get_my_invites()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.isc_respond_to_invite(UUID, BOOLEAN) TO authenticated;
```

- [ ] **Step 2: Apply the migration**

```powershell
$sp = "C:\Users\NIKHIL~1\AppData\Local\Temp\claude\c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main\eeef166a-4edc-44e6-893a-cae6860dc3e5\scratchpad"
& "$sp\sbq.ps1" -File "supabase/migrations/0057_isc_invite_accept.sql"
```

Expected: no error output.

- [ ] **Step 3: Verify the backfill**

Every already-linked row (Maya as leader on all three of her entries, Sara on
Maya's entrepreneurship draft) must show `accepted_at` set, not `NULL`:

```powershell
& "$sp\sbq.ps1" -Sql "SELECT p.full_name, m.is_leader, (m.accepted_at IS NOT NULL) AS backfilled FROM public.isc_entry_members m JOIN public.user_profiles p ON p.id = m.user_id WHERE p.full_name IN ('Maya Sharma','Sara Khan') ORDER BY p.full_name;"
```

Expected: every row shows `backfilled: true`.

- [ ] **Step 4: Create a throwaway invitee for the remaining checks**

Every real group2 student at DPS Hinjawadi already leads all three tracks
(check this yourself before assuming otherwise —
`SELECT p.full_name, p.school_class, string_agg(m.track || CASE WHEN m.is_leader THEN ' (leader)' ELSE '' END, ', ') FROM public.user_profiles p LEFT JOIN public.isc_entry_members m ON m.user_id = p.id JOIN public.schools s ON s.id = p.school_id WHERE s.name = 'Delhi Public School Hinjawadi' AND p.role = 'student' GROUP BY p.id;`
confirms it), so inviting any of them into a *different* `ai_for_impact`
entry would immediately hit `already_in_track`, not the state this task
needs to exercise. Steps 5–6 and 8 need a same-school, same-group (Class
9–12) student with zero existing ISC activity, so create one:

```bash
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '\r')
KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2- | tr -d '\r')
curl -s -X POST "$URL/auth/v1/signup" -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"isc-invite-b-verify.test@example.invalid","password":"PlanCheck123!"}'
```

Expected: a JSON response containing an `access_token` (email confirmation
is disabled on this project, so signup returns a live session immediately —
confirms the account and its `user_profiles` row both now exist).

Complete its profile to Class 10 (group2) at DPS Hinjawadi:

```powershell
& "$sp\sbq.ps1" -Sql "UPDATE public.user_profiles p SET school_class='Class 10', school_id=s.id, school_name=s.name, school_state=s.state, school_district=s.district, city='Pune' FROM public.schools s, auth.users u WHERE s.name='Delhi Public School Hinjawadi' AND u.id=p.id AND u.email='isc-invite-b-verify.test@example.invalid' RETURNING p.school_class;"
```

Expected: `school_class: "Class 10"`.

- [ ] **Step 5: Verify `isc_add_member` now returns `awaiting_accept` and leaves `accepted_at` null**

Maya invites the throwaway (Class 10, group2 — matches Maya's group, and
has no prior entry on any track) into her `ai_for_impact` draft, which
currently has only Maya on it:

```powershell
& "$sp\sbq.ps1" -Sql "
DO `$`$
DECLARE v_maya uuid; v_entry uuid; v_result jsonb; v_pending boolean; v_out text;
BEGIN
  v_maya  := (SELECT p.id FROM public.user_profiles p WHERE p.full_name = 'Maya Sharma');
  v_entry := (SELECT id FROM public.isc_entries WHERE created_by = v_maya AND track = 'ai_for_impact');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_maya, 'role', 'authenticated')::text, true);

  v_result := public.isc_add_member(v_entry, 'isc-invite-b-verify.test@example.invalid');
  v_out := 'add result -> ' || v_result::text;

  SELECT (accepted_at IS NULL) INTO v_pending
    FROM public.isc_entry_members m JOIN auth.users u ON u.id = m.user_id
   WHERE m.entry_id = v_entry AND u.email = 'isc-invite-b-verify.test@example.invalid';
  v_out := v_out || chr(10) || 'row is pending -> ' || v_pending::text;

  RAISE EXCEPTION '%', chr(10) || v_out;
END `$`$;
"
```

Expected: `add result -> {"ok": true, "state": "awaiting_accept", "name": null}`
(`name` is `null` because the throwaway account's `full_name` was never
set — harmless; the leader's UI already falls back to *"Your classmate"*
for a null name) and `row is pending -> true`.

- [ ] **Step 6: Verify `isc_respond_to_invite` — the group re-check, decline, and idempotency**

This is one combined block, run as three isolating stages inside the same
rolled-back transaction: create the pending invite fresh (rather than relying
on Step 5's, which never survived its own rollback), attempt to accept while
the throwaway's class is temporarily moved to a different group (must
fail), move it back and accept for real (must succeed), then attempt to
accept again (must fail as `already_resolved`). A second, separate block
covers decline.

```powershell
& "$sp\sbq.ps1" -Sql "
DO `$`$
DECLARE v_maya uuid; v_invitee uuid; v_entry uuid; v_member uuid; v_result jsonb; v_out text;
BEGIN
  v_maya    := (SELECT p.id FROM public.user_profiles p WHERE p.full_name = 'Maya Sharma');
  v_invitee := (SELECT id FROM auth.users WHERE email = 'isc-invite-b-verify.test@example.invalid');
  v_entry   := (SELECT id FROM public.isc_entries WHERE created_by = v_maya AND track = 'ai_for_impact');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_maya, 'role', 'authenticated')::text, true);
  PERFORM public.isc_add_member(v_entry, 'isc-invite-b-verify.test@example.invalid');
  SELECT m.id INTO v_member FROM public.isc_entry_members m
   WHERE m.entry_id = v_entry AND m.user_id = v_invitee;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);

  UPDATE public.user_profiles SET school_class = 'Class 7' WHERE id = v_invitee;
  v_result := public.isc_respond_to_invite(v_member, true);
  v_out := 'A. accept while cross-group -> ' || v_result::text;

  UPDATE public.user_profiles SET school_class = 'Class 10' WHERE id = v_invitee;
  v_result := public.isc_respond_to_invite(v_member, true);
  v_out := v_out || chr(10) || 'B. accept back in group -> ' || v_result::text;

  v_result := public.isc_respond_to_invite(v_member, true);
  v_out := v_out || chr(10) || 'C. accept again (already resolved) -> ' || v_result::text;

  RAISE EXCEPTION '%', chr(10) || v_out;
END `$`$;
"
```

Expected: `A.` → `{"ok": false, "error": "wrong_group"}`; `B.` → `{"ok": true, "action": "accepted", ...}`; `C.` → `{"ok": false, "error": "already_resolved"}`.

```powershell
& "$sp\sbq.ps1" -Sql "
DO `$`$
DECLARE v_maya uuid; v_invitee uuid; v_entry uuid; v_member uuid; v_result jsonb; v_gone boolean;
BEGIN
  v_maya    := (SELECT p.id FROM public.user_profiles p WHERE p.full_name = 'Maya Sharma');
  v_invitee := (SELECT id FROM auth.users WHERE email = 'isc-invite-b-verify.test@example.invalid');
  v_entry   := (SELECT id FROM public.isc_entries WHERE created_by = v_maya AND track = 'ai_for_impact');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_maya, 'role', 'authenticated')::text, true);
  PERFORM public.isc_add_member(v_entry, 'isc-invite-b-verify.test@example.invalid');
  SELECT m.id INTO v_member FROM public.isc_entry_members m
   WHERE m.entry_id = v_entry AND m.user_id = v_invitee;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);
  v_result := public.isc_respond_to_invite(v_member, false);

  SELECT NOT EXISTS (SELECT 1 FROM public.isc_entry_members WHERE id = v_member) INTO v_gone;

  RAISE EXCEPTION '%', chr(10) ||
    'decline result -> ' || v_result::text || chr(10) ||
    'row deleted -> ' || v_gone::text;
END `$`$;
"
```

Expected: `decline result -> {"ok": true, "action": "declined", ...}` and `row deleted -> true`.

- [ ] **Step 7: Verify `isc_claim_invites` still lands a claimed row as pending — empirically, not just by reading the SQL**

Mirrors sub-project A's own claim-invite verification: a scratch pending
invite for Rhea Iyer's real email, claimed by impersonating Rhea, checked for
`accepted_at IS NULL` afterward.

```powershell
& "$sp\sbq.ps1" -Sql "
DO `$`$
DECLARE v_maya uuid; v_rhea uuid; v_rhea_email text; v_entry uuid; v_result jsonb; v_out text;
BEGIN
  v_maya := (SELECT p.id FROM public.user_profiles p WHERE p.full_name = 'Maya Sharma');
  v_rhea := (SELECT p.id FROM public.user_profiles p WHERE p.full_name = 'Rhea Iyer');
  v_rhea_email := (SELECT lower(email) FROM auth.users WHERE id = v_rhea);
  v_entry := (SELECT id FROM public.isc_entries WHERE created_by = v_maya AND track = 'ai_for_impact');

  INSERT INTO public.isc_entry_members (entry_id, track, invited_email, invite_token)
  VALUES (v_entry, 'ai_for_impact', v_rhea_email, 'scratch-b-verify-token');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_rhea, 'role', 'authenticated')::text, true);
  v_result := public.isc_claim_invites();
  v_out := 'claim result -> ' || v_result::text;

  v_out := v_out || chr(10) || 'row after claim -> ' || (
    SELECT 'user_id set: ' || (user_id IS NOT NULL)::text
        || ', accepted_at: ' || coalesce(accepted_at::text, 'NULL')
      FROM public.isc_entry_members
     WHERE entry_id = v_entry AND user_id = v_rhea
  );

  RAISE EXCEPTION '%', chr(10) || v_out;
END `$`$;
"
```

Expected: `claim result -> {"ok": true, "claimed": 1}` and `row after claim ->
user_id set: true, accepted_at: NULL`.

- [ ] **Step 8: Verify `get_school_roster` and `isc_get_my_entries` treat a pending row correctly**

The row exists in `isc_get_my_entries()`'s array either way (it is
deliberately not filtered — see Step 1); what must change is its
`is_accepted` field, and separately, whether it shows up in the coordinator's
roster status at all. This is the one check that genuinely needs the
throwaway's blank slate — a real student with prior activity on the track
would already show `"ai_for_impact": "draft"` from their own entry
regardless of this invite, masking the exact thing being tested:

```powershell
& "$sp\sbq.ps1" -Sql "
DO `$`$
DECLARE v_maya uuid; v_invitee uuid; v_coord uuid; v_entry uuid; v_member uuid;
        v_is_accepted_before boolean; v_is_accepted_after boolean;
        v_roster_before jsonb; v_roster_after jsonb;
BEGIN
  v_maya    := (SELECT p.id FROM public.user_profiles p WHERE p.full_name = 'Maya Sharma');
  v_invitee := (SELECT id FROM auth.users WHERE email = 'isc-invite-b-verify.test@example.invalid');
  v_coord   := (SELECT id FROM auth.users WHERE email = 'coordinator.hinjawadi.test@example.invalid');
  v_entry   := (SELECT id FROM public.isc_entries WHERE created_by = v_maya AND track = 'ai_for_impact');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_maya, 'role', 'authenticated')::text, true);
  PERFORM public.isc_add_member(v_entry, 'isc-invite-b-verify.test@example.invalid');
  SELECT m.id INTO v_member FROM public.isc_entry_members m
   WHERE m.entry_id = v_entry AND m.user_id = v_invitee;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);
  SELECT (e ->> 'is_accepted')::boolean INTO v_is_accepted_before
    FROM jsonb_array_elements(public.isc_get_my_entries()) e
   WHERE (e ->> 'track') = 'ai_for_impact';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_coord, 'role', 'authenticated')::text, true);
  SELECT isc_status INTO v_roster_before FROM public.get_school_roster()
   WHERE student_id = v_invitee;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);
  PERFORM public.isc_respond_to_invite(v_member, true);

  SELECT (e ->> 'is_accepted')::boolean INTO v_is_accepted_after
    FROM jsonb_array_elements(public.isc_get_my_entries()) e
   WHERE (e ->> 'track') = 'ai_for_impact';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_coord, 'role', 'authenticated')::text, true);
  SELECT isc_status INTO v_roster_after FROM public.get_school_roster()
   WHERE student_id = v_invitee;

  RAISE EXCEPTION '%', chr(10) ||
    'my_entries.is_accepted while pending -> ' || v_is_accepted_before::text || chr(10) ||
    'roster status while pending -> ' || coalesce(v_roster_before::text, '{}'::jsonb::text) || chr(10) ||
    'my_entries.is_accepted once accepted -> ' || v_is_accepted_after::text || chr(10) ||
    'roster status once accepted -> ' || v_roster_after::text;
END `$`$;
"
```

Expected exactly: `my_entries.is_accepted while pending -> false`; `roster
status while pending -> {}` (empty — the throwaway has no other ISC
activity); `my_entries.is_accepted once accepted -> true`; `roster status
once accepted -> {"ai_for_impact": "draft"}`.

- [ ] **Step 9: Delete the throwaway invitee**

```powershell
& "$sp\sbq.ps1" -Sql "DELETE FROM auth.users WHERE email = 'isc-invite-b-verify.test@example.invalid' RETURNING email;"
```

Expected: the row is returned once, confirming deletion. Confirm real data
is untouched:

```powershell
& "$sp\sbq.ps1" -Sql "SELECT (SELECT count(*) FROM auth.users WHERE email LIKE 'isc-invite-%') AS leftover, (SELECT count(*) FROM public.isc_entries) AS entries, (SELECT count(*) FROM public.isc_entry_members) AS members;"
```

Expected: `leftover: 0`, `entries: 10`, `members: 11` — the same counts
confirmed at the end of sub-project A.

- [ ] **Step 10: Commit**

The migration file lives in `supabase/`, which is gitignored — nothing to
`git add`. Note in your own tracking that migration `0057` has been applied.

---

### Task 2: Server actions — `respondToInviteAction`, `getMyPendingInvites`, and updated types

**Files:**
- Modify: `src/app/actions/isc.ts`

**Interfaces:**
- Consumes: `isc_respond_to_invite`, `isc_get_my_invites`, `isc_add_member`'s `awaiting_accept` state, `isc_get_entry`'s `accepted_at` field, `isc_get_my_entries`'s `is_accepted` field (all Task 1)
- Produces: `IscMember.acceptedAt: string | null`; `MyEntry.isAccepted: boolean`; `interface PendingInvite { memberId: string; entryId: string; track: IscTrackId; leaderName: string | null }`; `getMyPendingInvites(): Promise<PendingInvite[]>`; `type RespondState`; `respondToInviteAction(prev, formData): Promise<RespondState>` — consumed by Task 3

- [ ] **Step 1: Update `MyEntry` and `getMyIscEntries`**

In `src/app/actions/isc.ts`, change:

```ts
export interface MyEntry {
  entryId: string
  track: string
  status: string
  isLeader: boolean
}

export async function getMyIscEntries(): Promise<MyEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('isc_get_my_entries')
  const rows = (data ?? []) as {
    entry_id: string
    track: string
    status: string
    is_leader: boolean
  }[]
  return rows.map((r) => ({
    entryId: r.entry_id,
    track: r.track,
    status: r.status,
    isLeader: r.is_leader,
  }))
}
```

to:

```ts
export interface MyEntry {
  entryId: string
  track: string
  status: string
  isLeader: boolean
  /** False while a sent invite is still awaiting this student's response. */
  isAccepted: boolean
}

export async function getMyIscEntries(): Promise<MyEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('isc_get_my_entries')
  const rows = (data ?? []) as {
    entry_id: string
    track: string
    status: string
    is_leader: boolean
    is_accepted: boolean
  }[]
  return rows.map((r) => ({
    entryId: r.entry_id,
    track: r.track,
    status: r.status,
    isLeader: r.is_leader,
    isAccepted: r.is_accepted,
  }))
}
```

- [ ] **Step 2: Add `acceptedAt` to `IscMember` and `getIscEntry`**

Change:

```ts
export interface IscMember {
  memberId: string
  userId: string | null
  name: string | null
  schoolClass: string | null
  invitedEmail: string | null
  inviteToken: string | null
  isLeader: boolean
}
```

to:

```ts
export interface IscMember {
  memberId: string
  userId: string | null
  name: string | null
  schoolClass: string | null
  invitedEmail: string | null
  inviteToken: string | null
  isLeader: boolean
  /** Null while userId is set but the invitee has not yet responded. */
  acceptedAt: string | null
}
```

In `getIscEntry`, add `accepted_at: string | null` to the inline `members`
type and `acceptedAt: m.accepted_at` to the mapped object:

```ts
    members: {
      member_id: string
      user_id: string | null
      name: string | null
      school_class: string | null
      invited_email: string | null
      invite_token: string | null
      is_leader: boolean
      accepted_at: string | null
    }[]
  } | null

  if (!r?.ok) return null
  return {
    entryId: r.entry_id,
    track: r.track,
    status: r.status,
    submission: r.submission ?? {},
    isLeader: r.is_leader,
    members: (r.members ?? []).map((m) => ({
      memberId: m.member_id,
      userId: m.user_id,
      name: m.name,
      schoolClass: m.school_class,
      invitedEmail: m.invited_email,
      inviteToken: m.invite_token,
      isLeader: m.is_leader,
      acceptedAt: m.accepted_at,
    })),
  }
```

- [ ] **Step 3: Update `addMemberAction`'s success branch**

Change:

```ts
  if (r.state === 'linked') {
    return { ok: `${r.name ?? 'Your classmate'} has been added to the team.` }
  }
```

to:

```ts
  if (r.state === 'awaiting_accept') {
    return {
      ok: `${r.name ?? 'Your classmate'} has been invited — waiting for them to accept.`,
    }
  }
```

- [ ] **Step 4: Add `getMyPendingInvites`**

Add, after `getMyIscEntries`:

```ts
export interface PendingInvite {
  memberId: string
  entryId: string
  track: IscTrackId
  leaderName: string | null
}

/** Invites this student has not yet responded to — what the /isc banner renders. */
export async function getMyPendingInvites(): Promise<PendingInvite[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('isc_get_my_invites')
  const rows = (data ?? []) as {
    member_id: string
    entry_id: string
    track: string
    leader_name: string | null
  }[]
  return rows.map((r) => ({
    memberId: r.member_id,
    entryId: r.entry_id,
    track: r.track as IscTrackId,
    leaderName: r.leader_name,
  }))
}
```

- [ ] **Step 5: Add `respondToInviteAction`**

Add, after `removeMemberAction` (so it sits alongside the other
team-membership actions):

```ts
export type RespondState = { error?: string; ok?: string } | undefined

const RESPOND_ERR: Record<string, string> = {
  already_resolved: 'This invite has already been responded to.',
  wrong_school: "You're no longer eligible for this team — you must be at the same school.",
  wrong_group:
    "You're no longer eligible for this team — you must be in the same group as the rest of the team (Classes 5–8 or 9–12).",
}

export async function respondToInviteAction(
  _prev: RespondState,
  formData: FormData
): Promise<RespondState> {
  const memberId = (formData.get('member_id') as string)?.trim()
  const accept = (formData.get('intent') as string)?.trim() === 'accept'
  if (!memberId) return { error: 'Missing invite.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_respond_to_invite', {
    p_member_id: memberId,
    p_accept: accept,
  })
  if (error) return { error: iscError(undefined) }

  const r = data as { ok: boolean; error?: string; action?: string; track?: string }
  if (!r?.ok) return { error: RESPOND_ERR[r?.error ?? ''] ?? iscError(r?.error) }

  revalidatePath('/isc')
  const track = r.track ? trackById(r.track) : null
  if (track) revalidatePath(`/isc/${track.slug}`)

  return { ok: r.action === 'accepted' ? 'You joined the team.' : 'Invite declined.' }
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: errors in `src/components/isc/team-panel.tsx`, `src/app/(platform)/isc/page.tsx`, and `src/app/(platform)/isc/[track]/page.tsx` — `MyEntry` now requires `isAccepted` and `IscMember` now requires `acceptedAt`, and none of those call sites have been updated yet. That's expected; Task 3 fixes them. Confirm no *other* files are affected.

- [ ] **Step 7: Commit**

```bash
git add src/app/actions/isc.ts
git commit -m "feat: invite-accept server actions and updated ISC types"
```

---

### Task 3: UI — pending-row states, the accept/decline banner, and the redirect-loop fix

**Files:**
- Create: `src/components/isc/pending-invites.tsx`
- Modify: `src/components/isc/team-panel.tsx`
- Modify: `src/app/(platform)/isc/page.tsx`
- Modify: `src/app/(platform)/isc/[track]/page.tsx`

**Interfaces:**
- Consumes: `respondToInviteAction`, `getMyPendingInvites`, `PendingInvite`, `RespondState`, `IscMember.acceptedAt`, `MyEntry.isAccepted` (all Task 2)
- Produces: `<PendingInvites invites={PendingInvite[]} />`

- [ ] **Step 1: Three-state member row in `TeamPanel`**

In `src/components/isc/team-panel.tsx`, change the icon:

```tsx
              {m.userId ? (
                <Check className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-accent-yellow shrink-0" />
              )}
```

to:

```tsx
              {m.userId && m.acceptedAt ? (
                <Check className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-accent-yellow shrink-0" />
              )}
```

and add a new label branch right after the existing `{!m.userId && (…)}` one:

```tsx
                {!m.userId && (
                  <span className="text-accent-yellow"> · not registered yet — invite sent</span>
                )}
                {m.userId && !m.acceptedAt && (
                  <span className="text-accent-yellow"> · invited — waiting for them to accept</span>
                )}
```

- [ ] **Step 2: Build the `PendingInvites` banner**

Create `src/components/isc/pending-invites.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Trophy } from 'lucide-react'
import {
  respondToInviteAction,
  type RespondState,
  type PendingInvite,
} from '@/app/actions/isc'
import { trackById } from '@/lib/isc/tracks'

function InviteCard({ invite }: { invite: PendingInvite }) {
  const [state, action, pending] = useActionState<RespondState, FormData>(
    respondToInviteAction,
    undefined
  )
  const track = trackById(invite.track)

  return (
    <div className="clay-card p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-primary" />
        </span>
        <p className="text-sm text-foreground min-w-0">
          <span className="font-semibold">{invite.leaderName ?? 'A classmate'}</span> invited you
          to join <span className="font-semibold">{track?.name ?? invite.track}</span>
        </p>
      </div>
      <form action={action} className="flex items-center gap-2 shrink-0">
        <input type="hidden" name="member_id" value={invite.memberId} />
        <button
          type="submit"
          name="intent"
          value="decline"
          disabled={pending}
          className="px-3 h-9 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-foreground disabled:opacity-60"
        >
          Decline
        </button>
        <button
          type="submit"
          name="intent"
          value="accept"
          disabled={pending}
          className="px-4 h-9 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
        >
          Accept
        </button>
      </form>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </div>
  )
}

/** Team invites this student has not yet responded to, shown above the track
    cards on /isc — the same prominent spot the group line already occupies. */
export function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  if (invites.length === 0) return null
  return (
    <div className="space-y-2">
      {invites.map((inv) => (
        <InviteCard key={inv.memberId} invite={inv} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Wire the banner into `/isc`, and stop pending rows from driving track-card state**

In `src/app/(platform)/isc/page.tsx`, change the import line:

```ts
import { getMyIscEntries } from '@/app/actions/isc'
```

to:

```ts
import { getMyIscEntries, getMyPendingInvites } from '@/app/actions/isc'
import { PendingInvites } from '@/components/isc/pending-invites'
```

Change:

```ts
  const eligible = isEligibleClass(profile?.school_class)
  const entries = eligible ? await getMyIscEntries() : []
  const byTrack = new Map(entries.map((e) => [e.track, e]))
  const group = eligible ? iscGroupForClass(profile?.school_class) : null
```

to:

```ts
  const eligible = isEligibleClass(profile?.school_class)
  const entries = eligible ? await getMyIscEntries() : []
  // A pending invite is not one of "my championships" yet — it must not make
  // a track card read as draft/submitted before the student has agreed to join.
  const byTrack = new Map(entries.filter((e) => e.isAccepted).map((e) => [e.track, e]))
  const invites = eligible ? await getMyPendingInvites() : []
  const group = eligible ? iscGroupForClass(profile?.school_class) : null
```

Render the banner right after `PageHeader` and before the group line —
dropping the group line's `-mt-2` since it was tuned assuming nothing sits
between it and the header, which is no longer guaranteed:

```tsx
      <PageHeader
        eyebrow="International Skill Championship"
        icon={Trophy}
        title="ISC 2026"
        subtitle="Four championships, open to Classes 5 to 12. Enter as many as you like — school screening is free."
      />

      <PendingInvites invites={invites} />

      {group && (
        <p className="text-sm text-muted">
          You&apos;re in {iscGroupLabel(group)}. You can team up with classmates from those classes
          at your school.
        </p>
      )}
```

- [ ] **Step 4: Redirect a still-pending invitee off the track page**

In `src/app/(platform)/isc/[track]/page.tsx`, change:

```ts
  const mine = await getMyIscEntries()
  const existing = mine.find((e) => e.track === track.id)
  const entry = existing ? await getIscEntry(existing.entryId) : null
```

to:

```ts
  const mine = await getMyIscEntries()
  const existing = mine.find((e) => e.track === track.id)
  // A pending invite has a row here but isn't joined yet — send them back to
  // /isc to respond on the banner rather than showing a half-formed team page,
  // and critically, rather than falling through to "Ready when you are",
  // which would try to create a second entry for a track they already have
  // a (pending) row on and loop back to this exact redirect.
  if (existing && !existing.isAccepted) redirect('/isc')
  const entry = existing ? await getIscEntry(existing.entryId) : null
```

`redirect` is already imported in this file (used earlier for the
not-logged-in and not-eligible cases).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm test`
Expected: all existing tests still pass (this task touches no pure library function).

- [ ] **Step 6: Verify end-to-end in the browser with two throwaway accounts**

Neither account is a real seeded one — both are created fresh for this check
and deleted afterward, so no real password is ever touched.

1. Sign up `isc-invite-leader.test@example.invalid`, complete profile as
   **Class 9** at **Delhi Public School Hinjawadi** (via SQL, same shortcut
   used in sub-project A — the cascading school picker isn't what's under
   test here).
2. Sign up `isc-invite-student.test@example.invalid`, complete profile as
   **Class 10** at the same school (same group as the leader).
3. As the leader: give consent, enter `ai-for-impact`, invite the second
   account's email. Confirm the message reads *"… has been invited —
   waiting for them to accept."* Confirm `TeamPanel` shows the invitee with
   a clock icon and *"invited — waiting for them to accept."*
4. As the invitee: open `/isc`. Confirm the banner reads *"{leader's name}
   invited you to join AI for Impact"* with Accept/Decline. Confirm the AI
   for Impact track card still reads **"Open to enter"** — a pending invite
   must not make it look joined.
5. Navigate the invitee directly to `/isc/ai-for-impact` by URL. Confirm
   they're redirected straight back to `/isc` (the loop-bug fix) rather than
   seeing "Ready when you are" or an error.
6. Back on `/isc`, press **Decline**. Confirm the banner disappears and the
   track card is unaffected (still "Open to enter", nothing pending).
7. As the leader, re-invite the same email. Confirm it succeeds again (the
   declined row is really gone, not blocking a re-invite).
8. As the invitee, press **Accept** this time. Confirm the banner disappears,
   the track card now reads **"Draft"**, and `/isc/ai-for-impact` now loads
   normally showing the shared team.
9. As the leader, reload `TeamPanel`. Confirm the invitee now shows a green
   check with no "waiting" label.
10. **Clean up:**

    ```powershell
    & "$sp\sbq.ps1" -Sql "DELETE FROM auth.users WHERE email IN ('isc-invite-leader.test@example.invalid','isc-invite-student.test@example.invalid');"
    ```

    Confirm real data is untouched:

    ```powershell
    & "$sp\sbq.ps1" -Sql "SELECT (SELECT count(*) FROM auth.users WHERE email LIKE 'isc-invite-%') AS leftover, (SELECT count(*) FROM public.isc_entries) AS entries, (SELECT count(*) FROM public.isc_entry_members) AS members;"
    ```

    Expected: `leftover: 0`, and `entries`/`members` back to their
    pre-verification counts (10 and 11, per the last confirmed state at the
    end of sub-project A).

- [ ] **Step 7: Commit**

```bash
git add src/components/isc/pending-invites.tsx src/components/isc/team-panel.tsx "src/app/(platform)/isc/page.tsx" "src/app/(platform)/isc/[track]/page.tsx"
git commit -m "feat: invite accept/decline UI and the pending-invite redirect fix"
```

---

## Verification checklist

Run once, after Task 3.

- [ ] `npx tsc --noEmit` is clean
- [ ] `npm test` passes (unchanged count — this plan adds no new pure-function library)
- [ ] `npm run lint` reports no new errors
- [ ] Migration `0057` applied — `SELECT column_name FROM information_schema.columns WHERE table_name = 'isc_entry_members' AND column_name = 'accepted_at';` returns one row
- [ ] Every pre-existing linked row (Maya's three entries, Sara's membership) still shows `accepted_at` set — the backfill held
- [ ] The two throwaway accounts from Task 3 no longer exist; `isc_entries`/`isc_entry_members` counts match their pre-verification values
- [ ] A pending invite never appears as "entered" on the coordinator roster or as a draft/submitted track card on the student's own `/isc`
- [ ] Visiting the track page directly with a pending invite redirects to `/isc` rather than looping
- [ ] `git status` shows nothing staged under `supabase/`
