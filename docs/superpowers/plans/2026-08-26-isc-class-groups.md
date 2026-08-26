# ISC Class Groups & Team Eligibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split ISC 2026 into two class-based groups (5–8 and 9–12), make teams enforceably single-group, show the group everywhere it matters (student, admin, coordinator), and give the open School-screening card a distinct color.

**Architecture:** Group is a pure derivation from `school_class`, computed identically on both sides — a new `isc_group_for_class()` SQL function mirroring the existing `isc_class_is_eligible()`, and a new `src/lib/isc/groups.ts` on the TypeScript side. Three existing RPCs (`isc_add_member`, `isc_claim_invites`, `isc_submit_entry`) gain a group check; everything else (banners, filters, panels) is presentation built on that one derivation.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + `SECURITY DEFINER` RPCs), Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-26-isc-class-groups-design.md`

## Global Constraints

- **Never push, never touch `main`.** All work stays on `feature/nikhil`.
- **Supabase project `bbioktywqkfvpzmakdxt` only.** Never the `happyfleet` project.
- **`supabase/` is gitignored.** The migration in this plan is applied to the live DB via `sbq.ps1` in the session scratchpad and is never `git add`ed.
- **Impersonation for verification sets only `request.jwt.claims`, never `set_config('role', ...)`** — the latter switches the real Postgres session role and breaks `auth.users` access.
- **Every verification query runs inside a rolled-back transaction** (`DO $$ ... RAISE EXCEPTION ...; END $$;`), so nothing written during a check survives it.
- **Never overwrite a real user's password or role to get test access.** Where a browser check needs a logged-in student, create a fresh throwaway account and delete it afterward — never touch Maya's or any other real seeded account's credentials.
- **Group derivation lives in exactly two places** — `isc_group_for_class()` (SQL) and `iscGroupForClass()` (TypeScript) — and nowhere else re-implements the class-range check.
- **Read `node_modules/next/dist/docs/` before writing App Router code** if anything about `params`/`searchParams` is unclear — both are `Promise<{…}>` in this Next.js version.
- **Type-check with `npx tsc --noEmit`** before every commit. It must be clean.
- **Tests are Vitest**, run with `npm test`. Test files live in `__tests__` beside the code.
- **Copy:** sentence case, no exclamation marks. "Group 1 (Classes 5–8)" / "Group 2 (Classes 9–12)" is the exact label format everywhere.

## File Structure

**New:**
- `src/lib/isc/groups.ts` — the single source of truth for group derivation on the TypeScript side.
- `src/lib/isc/__tests__/groups.test.ts`
- `supabase/migrations/0056_isc_groups.sql` — `isc_group_for_class()` plus the three RPC changes.

**Modified:**
- `src/app/actions/isc.ts` — `wrong_group` added to both error maps.
- `src/components/isc/team-panel.tsx` — group line + mismatch banner.
- `src/app/(platform)/isc/page.tsx` — group line on the landing page.
- `src/components/isc/how-it-works.tsx` — School-screening card gets a distinct color.
- `src/lib/isc/analytics.ts` — `AnalyticsEntry.leaderClass` + `byGroup()`.
- `src/lib/isc/__tests__/analytics.test.ts` — fixture gains `leaderClass`; `byGroup()` tests.
- `src/components/admin/isc-entry-row.tsx` — `AdminIscEntry.leaderClass`.
- `src/app/(admin)/admin/isc/page.tsx` — `leaderClass` wiring, group filter clause.
- `src/components/admin/isc-insights.tsx` — "By group" panel.
- `src/components/admin/isc-filters.tsx` — Group select.
- `src/lib/coordinator/analytics.ts` — `groupParticipation()`.
- `src/lib/coordinator/__tests__/analytics.test.ts` — `groupParticipation()` tests.
- `src/components/coordinator/coordinator-stats.tsx` — "By group" panel.
- `src/components/coordinator/school-roster.tsx` — Group filter.

---

### Task 1: Group derivation library

**Files:**
- Create: `src/lib/isc/groups.ts`
- Create: `src/lib/isc/__tests__/groups.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `type IscGroup = 'group1' | 'group2'`; `ISC_GROUPS: Record<IscGroup, { label: string; classes: string[] }>`; `iscGroupForClass(schoolClass: string | null | undefined): IscGroup | null`; `iscGroupLabel(group: IscGroup): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/isc/__tests__/groups.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { iscGroupForClass, iscGroupLabel } from '../groups'

describe('iscGroupForClass', () => {
  it('places Classes 5-8 in group1', () => {
    for (const c of ['Class 5', 'Class 6', 'Class 7', 'Class 8']) {
      expect(iscGroupForClass(c)).toBe('group1')
    }
  })

  it('places Classes 9-12 in group2', () => {
    for (const c of ['Class 9', 'Class 10', 'Class 11', 'Class 12']) {
      expect(iscGroupForClass(c)).toBe('group2')
    }
  })

  it('returns null for classes ISC does not accept', () => {
    for (const c of ['Kindergarten', 'Class 1', 'Class 4']) {
      expect(iscGroupForClass(c)).toBeNull()
    }
  })

  it('returns null for a missing or unrecognised class', () => {
    expect(iscGroupForClass(null)).toBeNull()
    expect(iscGroupForClass(undefined)).toBeNull()
    expect(iscGroupForClass('Year 9')).toBeNull()
  })
})

describe('iscGroupLabel', () => {
  it('names the group and its class range', () => {
    expect(iscGroupLabel('group1')).toBe('Group 1 (Classes 5–8)')
    expect(iscGroupLabel('group2')).toBe('Group 2 (Classes 9–12)')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/groups.test.ts`
Expected: FAIL with `Failed to resolve import "../groups"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/isc/groups.ts`:

```ts
export type IscGroup = 'group1' | 'group2'

export interface IscGroupMeta {
  label: string
  classes: string[]
}

/**
 * The two ISC groups. A team can only ever contain classmates from the same
 * group — Classes 5-8 do not compete against, or team up with, Classes 9-12.
 */
export const ISC_GROUPS: Record<IscGroup, IscGroupMeta> = {
  group1: { label: 'Group 1', classes: ['Class 5', 'Class 6', 'Class 7', 'Class 8'] },
  group2: { label: 'Group 2', classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12'] },
}

/**
 * Which group a class belongs to, or null for anything outside Classes 5-12
 * (Kindergarten-4, unset, or unrecognised) — exactly the set isEligibleClass()
 * already excludes from ISC entirely, so "no group" only ever describes a
 * student who could not enter in the first place.
 */
export function iscGroupForClass(schoolClass: string | null | undefined): IscGroup | null {
  if (!schoolClass) return null
  if (ISC_GROUPS.group1.classes.includes(schoolClass)) return 'group1'
  if (ISC_GROUPS.group2.classes.includes(schoolClass)) return 'group2'
  return null
}

/** "Group 1 (Classes 5–8)" */
export function iscGroupLabel(group: IscGroup): string {
  const meta = ISC_GROUPS[group]
  const first = meta.classes[0].replace('Class ', '')
  const last = meta.classes[meta.classes.length - 1].replace('Class ', '')
  return `${meta.label} (Classes ${first}–${last})`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/isc/__tests__/groups.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no output.

```bash
git add src/lib/isc/groups.ts src/lib/isc/__tests__/groups.test.ts
git commit -m "feat: ISC class-group derivation"
```

---

### Task 2: Enforce the group rule in the database

This is the security boundary — everything in Tasks 3–9 is presentation on top of
what this task makes true at the RPC layer. `isc_add_member` refuses a
cross-group add outright; `isc_claim_invites` silently skips claiming a
cross-group invite (the same treatment a cross-school invite already gets);
`isc_submit_entry` refuses to submit while any linked teammate's group differs
from the leader's — the gate that makes Maya's existing mismatched draft
(Class 9 + Sara Khan's Class 7) genuinely un-submittable.

**Files:**
- Create: `supabase/migrations/0056_isc_groups.sql` (gitignored — never `git add`ed)

**Interfaces:**
- Consumes: nothing
- Produces: `public.isc_group_for_class(TEXT) RETURNS TEXT` (`'group1' | 'group2' | NULL`), consumed by TypeScript-side nothing (it's the SQL mirror of `iscGroupForClass`) but by the three RPCs below and by no other function.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0056_isc_groups.sql`:

```sql
-- 0056: ISC class groups (Classes 5-8 / Classes 9-12) and the team-eligibility
-- rule that comes with them — a team can only contain classmates from the
-- same group.

/**
 * Which ISC group a class belongs to. Mirrors isc_class_is_eligible()'s idiom
 * exactly: a plain, IMMUTABLE lookup, no table access, safe to call from any
 * RPC without an extra round trip.
 */
CREATE OR REPLACE FUNCTION public.isc_group_for_class(p_class TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_class IN ('Class 5','Class 6','Class 7','Class 8')    THEN 'group1'
    WHEN p_class IN ('Class 9','Class 10','Class 11','Class 12') THEN 'group2'
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.isc_group_for_class(TEXT) TO authenticated;

-- isc_add_member gains a group check right next to the existing same-school
-- check. Only the CREATE OR REPLACE body changes; the invite-by-email branch
-- (no account yet) is untouched — there is nothing to check group against
-- until the invite is claimed, exactly as it already works for school.
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

    RETURN jsonb_build_object('ok', true, 'state', 'linked', 'name', v_name);
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

-- isc_claim_invites gains the claiming student's own class, and the claimable
-- CTE gains a group match alongside the existing school match. A group
-- mismatch is left pending, silently — the same treatment a school mismatch
-- already gets. Nothing renders to the claimer either way.
CREATE OR REPLACE FUNCTION public.isc_claim_invites()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_email text; v_school uuid; v_class text; v_claimed int := 0;
BEGIN
  SELECT lower(u.email), p.school_id, p.school_class INTO v_email, v_school, v_class
    FROM auth.users u JOIN public.user_profiles p ON p.id = u.id
   WHERE u.id = auth.uid() AND p.role = 'student';

  IF v_email IS NULL OR v_school IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'claimed', 0);
  END IF;

  WITH claimable AS (
    SELECT m.id
      FROM public.isc_entry_members m
      JOIN public.isc_entries e ON e.id = m.entry_id
     WHERE m.user_id IS NULL
       AND lower(m.invited_email) = v_email
       AND e.school_id = v_school
       AND public.isc_group_for_class(v_class) = public.isc_group_for_class(
             (SELECT p2.school_class FROM public.user_profiles p2 WHERE p2.id = e.created_by)
           )
       AND NOT EXISTS (
         SELECT 1 FROM public.isc_entry_members x
          WHERE x.user_id = auth.uid() AND x.track = m.track
       )
       AND (SELECT count(*) FROM public.isc_entry_members y WHERE y.entry_id = m.entry_id) <= 3
  )
  UPDATE public.isc_entry_members m
     SET user_id = auth.uid(), invited_email = NULL, invite_token = NULL
    FROM claimable c
   WHERE m.id = c.id;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'claimed', v_claimed);
END;
$$;

-- isc_submit_entry gains the hard gate: every linked teammate must share the
-- leader's group. A team can sit mismatched as a draft indefinitely (nothing
-- here touches existing rows) — this is only what stops it being submitted.
CREATE OR REPLACE FUNCTION public.isc_submit_entry(p_entry_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_track text; v_leader uuid; v_school uuid; v_leader_class text; v_sub jsonb; v_bad int;
BEGIN
  SELECT e.track, e.created_by, e.school_id, e.submission
    INTO v_track, v_leader, v_school, v_sub
    FROM public.isc_entries e WHERE e.id = p_entry_id;
  IF v_track IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_leader IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_leader');
  END IF;
  IF NOT public.isc_is_open(v_track) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'track_closed');
  END IF;
  IF NOT public.isc_has_consent() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'consent_required');
  END IF;
  IF v_sub IS NULL OR v_sub = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
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
$$;
```

- [ ] **Step 2: Apply the migration**

```powershell
$sp = "C:\Users\NIKHIL~1\AppData\Local\Temp\claude\c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main\eeef166a-4edc-44e6-893a-cae6860dc3e5\scratchpad"
& "$sp\sbq.ps1" -File "supabase/migrations/0056_isc_groups.sql"
```

Expected: no error output (the file is DDL only — `CREATE OR REPLACE FUNCTION` and one `GRANT`, nothing that returns rows).

- [ ] **Step 3: Verify `isc_group_for_class` directly**

```powershell
& "$sp\sbq.ps1" -Sql "SELECT public.isc_group_for_class('Class 7') AS a, public.isc_group_for_class('Class 11') AS b, public.isc_group_for_class('Class 3') AS c, public.isc_group_for_class(NULL) AS d;"
```

Expected: `{"a": "group1", "b": "group2", "c": null, "d": null}`.

- [ ] **Step 4: Verify `isc_add_member` refuses a cross-group add**

DPS Hinjawadi has Maya Sharma (Class 9, leader of the `ai_for_impact` draft
`8bc92eae-ecd0-49ab-a059-230ef1691008`) and Rhea Iyer (Class 8, a different
group, same school). Impersonate Maya and try to add Rhea:

```powershell
& "$sp\sbq.ps1" -Sql "
DO `$`$
DECLARE v_maya uuid; v_entry uuid; v_result jsonb; v_out text;
BEGIN
  v_maya := (SELECT id FROM auth.users u JOIN public.user_profiles p ON p.id = u.id
              WHERE p.full_name = 'Maya Sharma');
  v_entry := (SELECT id FROM public.isc_entries WHERE created_by = v_maya AND track = 'ai_for_impact');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_maya, 'role', 'authenticated')::text, true);

  v_result := public.isc_add_member(v_entry, (
    SELECT u.email FROM auth.users u JOIN public.user_profiles p ON p.id = u.id
     WHERE p.full_name = 'Rhea Iyer'
  ));
  v_out := 'add rhea (group2 leader adding group1 student) -> ' || v_result::text;

  RAISE EXCEPTION '%', chr(10) || v_out;
END `$`$;
"
```

Expected: the raised message shows `{"ok": false, "error": "wrong_group"}`.

- [ ] **Step 5: Verify `isc_submit_entry` refuses Maya's existing mismatched team, then accepts it once fixed**

The `entrepreneurship` draft `a0525bbb-073c-4b92-86ec-77534726083a` already has
Maya (Class 9) as leader and Sara Khan (Class 7) as a linked teammate — the
exact case this task exists to handle.

```powershell
& "$sp\sbq.ps1" -Sql "
DO `$`$
DECLARE v_maya uuid; v_entry uuid; v_result jsonb; v_out text;
BEGIN
  v_maya := (SELECT id FROM auth.users u JOIN public.user_profiles p ON p.id = u.id
              WHERE p.full_name = 'Maya Sharma');
  v_entry := 'a0525bbb-073c-4b92-86ec-77534726083a'::uuid;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_maya, 'role', 'authenticated')::text, true);

  -- Give it something to submit, so the block is only about the group rule.
  PERFORM public.isc_save_entry(v_entry, '{\"problem\":\"x\"}'::jsonb);
  v_result := public.isc_submit_entry(v_entry);
  v_out := 'submit with Sara still on the team -> ' || v_result::text;

  -- Remove Sara (the actual fix a leader would make), then try again.
  DELETE FROM public.isc_entry_members
   WHERE entry_id = v_entry
     AND user_id = (SELECT id FROM auth.users u JOIN public.user_profiles p ON p.id = u.id
                      WHERE p.full_name = 'Sara Khan');
  v_result := public.isc_submit_entry(v_entry);
  v_out := v_out || chr(10) || 'submit after removing Sara -> ' || v_result::text;

  RAISE EXCEPTION '%', chr(10) || v_out;
END `$`$;
"
```

Expected: the first line shows `{"ok": false, "error": "wrong_group"}`; the
second shows `{"ok": true}`. Because this whole block runs inside `DO $$ …
RAISE EXCEPTION`, the `RAISE EXCEPTION` at the end rolls the entire
transaction back — **including the DELETE and the two submit calls** — so
Maya's draft and Sara's membership are exactly as they were before this step
once it finishes. Confirm that directly:

```powershell
& "$sp\sbq.ps1" -Sql "SELECT status, submission FROM public.isc_entries WHERE id = 'a0525bbb-073c-4b92-86ec-77534726083a'::uuid;"
```

Expected: still `status: draft`, `submission: {}` — unchanged from before Step 5.

- [ ] **Step 6: Verify `isc_claim_invites` leaves a cross-group invite pending**

`isc_claim_invites` only matters for a pending row that predates a claim —
simulate exactly that: insert a scratch pending invite for Rhea Iyer's real
email (Class 8, group1) into Maya's `ai_for_impact` draft (group2), then
impersonate Rhea and try to claim it. Because the whole block runs inside
`DO $$ … RAISE EXCEPTION`, the INSERT is rolled back along with everything
else — Maya's entry ends the step exactly as it started.

```powershell
& "$sp\sbq.ps1" -Sql "
DO `$`$
DECLARE v_entry uuid; v_rhea uuid; v_rhea_email text; v_result jsonb; v_still_pending boolean;
BEGIN
  v_entry := '8bc92eae-ecd0-49ab-a059-230ef1691008'::uuid; -- Maya's ai_for_impact draft, group2
  v_rhea := (SELECT id FROM auth.users u JOIN public.user_profiles p ON p.id = u.id
              WHERE p.full_name = 'Rhea Iyer');
  v_rhea_email := (SELECT lower(email) FROM auth.users WHERE id = v_rhea);

  -- A pending invite that predates this rule — e.g. sent before group
  -- enforcement shipped — for a same-school, different-group student.
  INSERT INTO public.isc_entry_members (entry_id, track, invited_email, invite_token)
  VALUES (v_entry, 'ai_for_impact', v_rhea_email, 'scratch-verify-token');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_rhea, 'role', 'authenticated')::text, true);
  v_result := public.isc_claim_invites();

  SELECT (user_id IS NULL) INTO v_still_pending
    FROM public.isc_entry_members
   WHERE entry_id = v_entry AND lower(invited_email) = v_rhea_email;

  RAISE EXCEPTION '%', chr(10) ||
    'claim result -> ' || v_result::text || chr(10) ||
    'still pending (should be true) -> ' || v_still_pending::text;
END `$`$;
"
```

Expected: `claimed` in the result is `0`, and `still pending (should be
true) -> true` — Rhea's claim silently skipped the cross-group invite, the
same treatment a cross-school one already gets.

- [ ] **Step 7: Commit**

The migration file lives in `supabase/`, which is gitignored — there is
nothing to `git add`. Note in your own tracking that migration `0056` has
been applied to the live database.

---

### Task 3: Student-facing UI — group note, mismatch banner, error copy

**Files:**
- Modify: `src/app/actions/isc.ts`
- Modify: `src/components/isc/team-panel.tsx`
- Modify: `src/app/(platform)/isc/page.tsx`

**Interfaces:**
- Consumes: `iscGroupForClass`, `iscGroupLabel` from `@/lib/isc/groups` (Task 1); the `wrong_group` error code from `isc_add_member` / `isc_submit_entry` (Task 2)
- Produces: nothing new consumed by later tasks

- [ ] **Step 1: Add `wrong_group` to both error maps**

In `src/app/actions/isc.ts`, the file has two separate error maps that must
each gain their own `wrong_group` entry — `ERR` (used by `entryFormAction`,
i.e. the submit path) and `TEAM_ERR` (used by `addMemberAction`). Missing
either one leaves that path showing the generic "Something went wrong."

Add to `ERR` (around line 19, after `wrong_school`):

```ts
  wrong_school: 'Everyone on the team must be at your school.',
  wrong_group: 'A teammate is in a different group. Remove them before this can be submitted.',
```

Add to `TEAM_ERR` (around line 234, after `wrong_school`):

```ts
  wrong_school: 'Teammates must be students at your school.',
  wrong_group: 'That student is in a different group. Teammates must be from the same group as you — Classes 5–8 or 9–12.',
```

- [ ] **Step 2: Add the group note and mismatch banner to `TeamPanel`**

In `src/components/isc/team-panel.tsx`, change the import line:

```ts
import { Check, Clock, Copy, X } from 'lucide-react'
```

to:

```ts
import { AlertTriangle, Check, Clock, Copy, X } from 'lucide-react'
```

and add, right after it:

```ts
import { iscGroupForClass, iscGroupLabel } from '@/lib/isc/groups'
```

Inside the `TeamPanel` function, right after the existing `const full = members.length >= maxTeamSize` line, add:

```ts
  // The leader anchors the team's group. A pending invited-by-email member has
  // no school_class yet — their group is unknown until isc_claim_invites
  // resolves it, so they are never flagged here.
  const leader = members.find((m) => m.isLeader)
  const leaderGroup = iscGroupForClass(leader?.schoolClass)
  const mismatched = members.filter(
    (m) => !m.isLeader && m.userId && iscGroupForClass(m.schoolClass) !== leaderGroup
  )
```

Replace the header block:

```tsx
      <div>
        <h2 className="font-display font-bold text-foreground">Your team</h2>
        <p className="text-xs text-muted mt-1">
          You can enter on your own, or with up to {maxTeamSize - 1} classmates from your school.
        </p>
      </div>
```

with:

```tsx
      <div>
        <h2 className="font-display font-bold text-foreground">Your team</h2>
        <p className="text-xs text-muted mt-1">
          You can enter on your own, or with up to {maxTeamSize - 1} classmates from your school.
        </p>
        {leaderGroup && (
          <p className="text-xs text-muted mt-1">
            This team is {iscGroupLabel(leaderGroup)} — teammates must be from those classes too.
          </p>
        )}
      </div>

      {mismatched.length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            <span className="font-semibold">
              {mismatched.map((m) => m.name ?? 'A teammate').join(', ')}
            </span>{' '}
            {mismatched.length === 1 ? 'is' : 'are'} in a different group. Teams can only include
            classmates from the same group — remove them before this entry can be submitted.
          </p>
        </div>
      )}
```

- [ ] **Step 3: Add the group line to the `/isc` landing page**

In `src/app/(platform)/isc/page.tsx`, add the import:

```ts
import { iscGroupForClass, iscGroupLabel } from '@/lib/isc/groups'
```

Add one line after the existing `byTrack` computation:

```ts
  const eligible = isEligibleClass(profile?.school_class)
  const entries = eligible ? await getMyIscEntries() : []
  const byTrack = new Map(entries.map((e) => [e.track, e]))
  const group = eligible ? iscGroupForClass(profile?.school_class) : null
```

Then, right after the `<PageHeader … />` element and before the `{!eligible && (…)}` block, add:

```tsx
      {group && (
        <p className="text-sm text-muted -mt-2">
          You&apos;re in {iscGroupLabel(group)}. You can team up with classmates from those
          classes at your school.
        </p>
      )}
```

- [ ] **Step 4: Type-check and run the suite**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Verify in the browser with a throwaway account**

This needs a real logged-in student session. Rather than touching Maya's real
account (whose password is unknown and must stay that way), create a
disposable one, wire up a scratch cross-group teammate via SQL, verify, then
delete it — leaving no trace.

Start the dev server in the background, then:

1. Sign up a fresh student at `/signup` with email
   `isc-group-check.test@example.invalid`, any password, complete
   `/onboarding/details` with **Class 9** and **Delhi Public School
   Hinjawadi** (same school as the real Sara Khan — needed so the injected
   membership row is a same-school, different-group pairing, exactly like
   Maya's real case).
2. On `/isc`, confirm the new line reads: *"You're in Group 2 (Classes
   9–12). You can team up with classmates from those classes at your
   school."*
3. Open any track (e.g. `/isc/ai-for-impact`) and press "Enter this track"
   to create a draft. Confirm `TeamPanel` now reads *"This team is Group 2
   (Classes 9–12) — teammates must be from those classes too."*
4. In a second browser tab (or via `curl`), attempt to add the real Rhea
   Iyer (Class 8, Group 1) by her registered email as a teammate. Confirm
   the form shows: *"That student is in a different group. Teammates must
   be from the same group as you — Classes 5–8 or 9–12."*
5. Directly insert a scratch cross-group membership to test the banner and
   the submit block, using the throwaway leader's entry id from Step 3 and
   Sara Khan's real id:

   ```powershell
   & "$sp\sbq.ps1" -Sql "
   INSERT INTO public.isc_entry_members (entry_id, track, user_id)
   SELECT e.id, e.track, (SELECT id FROM auth.users u JOIN public.user_profiles p ON p.id = u.id WHERE p.full_name = 'Sara Khan')
     FROM public.isc_entries e
     JOIN auth.users u ON u.id = e.created_by
     JOIN public.user_profiles p ON p.id = u.id
    WHERE u.email = 'isc-group-check.test@example.invalid' AND e.track = 'ai_for_impact';
   "
   ```

6. Reload the track page. Confirm the red banner appears: *"Sara Khan is in
   a different group. Teams can only include classmates from the same group
   — remove them before this entry can be submitted."*
7. Fill the required fields with minimal valid content and press "Submit
   entry". Confirm the error reads: *"A teammate is in a different group.
   Remove them before this can be submitted."*
8. Remove Sara via the panel's own remove button. Confirm the banner
   disappears, then submit again and confirm it succeeds.
9. **Clean up** — delete the throwaway account entirely (cascades remove its
   profile, entries, and memberships):

   ```powershell
   & "$sp\sbq.ps1" -Sql "DELETE FROM auth.users WHERE email = 'isc-group-check.test@example.invalid';"
   ```

   Confirm Sara Khan's real account and Maya's real entries are untouched:

   ```powershell
   & "$sp\sbq.ps1" -Sql "SELECT count(*) FROM public.isc_entry_members m JOIN auth.users u ON u.id = m.user_id JOIN public.user_profiles p ON p.id = u.id WHERE p.full_name = 'Sara Khan';"
   ```

   Expected: `1` — Sara is back to being on exactly Maya's one entrepreneurship team, same as before this task.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/isc.ts src/components/isc/team-panel.tsx "src/app/(platform)/isc/page.tsx"
git commit -m "feat: show ISC group and block cross-group teammates on the student side"
```

---

### Task 4: School-screening card color

**Files:**
- Modify: `src/components/isc/how-it-works.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed elsewhere

- [ ] **Step 1: Give the first stage a distinct treatment**

Replace the whole of `src/components/isc/how-it-works.tsx`:

```tsx
const STAGES = [
  {
    n: '01',
    title: 'School screening',
    body: 'Enter online, free. Skill Fleet judges every entry centrally.',
    note: 'Free to enter',
  },
  {
    n: '02',
    title: 'State championship',
    body: 'The top three in each track from your school go through to the state round.',
    note: 'Opens later',
  },
  {
    n: '03',
    title: 'National finals',
    body: 'The top three in each track from every state meet in person.',
    note: 'April 2027',
  },
]

/** The three stages from the Skill Fleet deck, so a student can see where
    entering actually leads rather than just filling a form. */
export function HowItWorks() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {STAGES.map((s, i) => (
        <div
          key={s.n}
          className={
            i === 0
              ? // The only stage actually open right now — a gradient wash and
                // a matching border make it read as "live" against the two
                // plain, not-yet-open stages beside it.
                'clay-card p-5 relative bg-gradient-to-br from-primary/[0.06] to-accent-teal/[0.08] border-2 border-primary/20'
              : 'clay-card p-5 relative'
          }
        >
          <span
            className={`font-display text-2xl font-bold ${i === 0 ? 'text-primary/40' : 'text-primary/25'}`}
          >
            {s.n}
          </span>
          <h3 className="font-display font-bold text-foreground mt-1">{s.title}</h3>
          <p className="text-xs text-muted mt-1">{s.body}</p>
          <span
            className={`inline-block mt-3 text-[10px] font-bold px-2 py-1 rounded-full ${
              i === 0 ? 'bg-green-50 text-green-700' : 'bg-black/[0.05] text-muted'
            }`}
          >
            {s.note}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Verify in the browser**

Open `/isc` while signed in as any student. Confirm the "School screening"
card has a visible purple-to-teal tinted background and border, clearly
distinct from the plain white "State championship" and "National finals"
cards beside it.

- [ ] **Step 4: Commit**

```bash
git add src/components/isc/how-it-works.tsx
git commit -m "feat: distinguish the open School-screening card by color"
```

---

### Task 5: Admin analytics — `leaderClass` and `byGroup()`

**Files:**
- Modify: `src/lib/isc/analytics.ts`
- Modify: `src/lib/isc/__tests__/analytics.test.ts`

**Interfaces:**
- Consumes: `iscGroupForClass`, `iscGroupLabel`, `IscGroup` from `@/lib/isc/groups` (Task 1)
- Produces: `AnalyticsEntry.leaderClass: string | null`; `interface GroupRow { group: IscGroup; label: string; entries: number; submitted: number; students: number }`; `byGroup(entries: AnalyticsEntry[]): GroupRow[]`

- [ ] **Step 1: Write the failing test**

In `src/lib/isc/__tests__/analytics.test.ts`, add `leaderClass` to the `entry()` fixture helper (find the existing `function entry(over: Partial<AnalyticsEntry> = {}): AnalyticsEntry {` block) so its returned object includes:

```ts
    studentIds: ['u1'],
    leaderClass: 'Class 9',
    ...over,
```

(This one-line addition to the fixture is required before the new tests below can run — every existing test in this file already calls `entry()`, and `AnalyticsEntry` is about to require `leaderClass`, so leaving it out would break every existing test in this file, not just the new ones.)

Add this new `describe` block at the end of the file:

```ts
describe('byGroup', () => {
  it('counts entries, submissions and students per group, from the leader\'s class', () => {
    const rows = byGroup([
      entry({ entryId: 'a', leaderClass: 'Class 9', studentIds: ['u1', 'u2'] }),
      entry({ entryId: 'b', leaderClass: 'Class 7', status: 'draft', studentIds: ['u3'] }),
    ])
    expect(rows).toEqual([
      { group: 'group1', label: 'Group 1 (Classes 5–8)', entries: 1, submitted: 0, students: 1 },
      { group: 'group2', label: 'Group 2 (Classes 9–12)', entries: 1, submitted: 1, students: 2 },
    ])
  })

  it('omits an entry whose leader has no derivable group rather than guessing', () => {
    const rows = byGroup([entry({ leaderClass: null })])
    expect(rows).toEqual([])
  })

  it('counts a student once per group even if they appear on two entries in it', () => {
    const rows = byGroup([
      entry({ entryId: 'a', leaderClass: 'Class 9', studentIds: ['u1'] }),
      entry({ entryId: 'b', leaderClass: 'Class 10', studentIds: ['u1'] }),
    ])
    expect(rows[0].students).toBe(1)
  })
})
```

Add `byGroup` to the existing import line from `'../analytics'` at the top of the file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/analytics.test.ts`
Expected: FAIL — `leaderClass` missing from fixture usages is a type error under `tsc`, and at runtime `byGroup is not a function` / `Property 'leaderClass' does not exist`.

- [ ] **Step 3: Implement**

In `src/lib/isc/analytics.ts`, add the import:

```ts
import { iscGroupForClass, iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
```

Add `leaderClass` to the `AnalyticsEntry` interface, right after `studentIds`:

```ts
  /** Everyone on the entry with an account — the leader plus linked teammates. */
  studentIds: string[]
  /** The team leader's class, for deriving which ISC group the entry is in. */
  leaderClass: string | null
```

Add `GroupRow` next to the other row interfaces (after `TimelinePoint`):

```ts
export interface GroupRow {
  group: IscGroup
  label: string
  entries: number
  submitted: number
  students: number
}
```

Add `byGroup` at the end of the file:

```ts
/**
 * Entries, submissions and participating students per group, derived from
 * each entry's leader. An entry whose leader has no derivable group (should
 * not happen — entering ISC already requires an eligible class) is skipped
 * rather than guessed at.
 */
export function byGroup(entries: AnalyticsEntry[]): GroupRow[] {
  const acc = new Map<IscGroup, GroupRow & { studentSet: Set<string> }>()

  for (const e of entries) {
    const group = iscGroupForClass(e.leaderClass)
    if (!group) continue
    let row = acc.get(group)
    if (!row) {
      row = { group, label: iscGroupLabel(group), entries: 0, submitted: 0, students: 0, studentSet: new Set<string>() }
      acc.set(group, row)
    }
    row.entries += 1
    if (isSubmitted(e)) row.submitted += 1
    for (const id of e.studentIds) row.studentSet.add(id)
  }

  return (['group1', 'group2'] as IscGroup[])
    .filter((g) => acc.has(g))
    .map((g) => {
      const { studentSet, ...row } = acc.get(g) as GroupRow & { studentSet: Set<string> }
      return { ...row, students: studentSet.size }
    })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/isc/__tests__/analytics.test.ts`
Expected: PASS, 17 tests (14 existing + 3 new).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no output. A `leaderClass` missing-property error anywhere means a call site building an `AnalyticsEntry` was not updated — that happens in Task 6, so it is expected to surface there and get fixed in that task.

```bash
git add src/lib/isc/analytics.ts src/lib/isc/__tests__/analytics.test.ts
git commit -m "feat: group aggregation for ISC admin analytics"
```

---

### Task 6: Admin UI — group filter and panel

**Files:**
- Modify: `src/components/admin/isc-entry-row.tsx`
- Modify: `src/app/(admin)/admin/isc/page.tsx`
- Modify: `src/components/admin/isc-insights.tsx`
- Modify: `src/components/admin/isc-filters.tsx`

**Interfaces:**
- Consumes: `byGroup`, `GroupRow` from `@/lib/isc/analytics` (Task 5); `iscGroupForClass`, `iscGroupLabel`, `ISC_GROUPS`, `IscGroup` from `@/lib/isc/groups` (Task 1)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add `leaderClass` to the list-row type**

In `src/components/admin/isc-entry-row.tsx`, add one field to the `AdminIscEntry` interface, right after `schoolDistrict: string`:

```ts
  leaderClass: string | null
```

- [ ] **Step 2: Populate `leaderClass` on both the list rows and the analytics rows**

In `src/app/(admin)/admin/isc/page.tsx`, add the import:

```ts
import { iscGroupForClass } from '@/lib/isc/groups'
```

In the `enriched` map, add one line right after `schoolDistrict: schoolById.get(r.school_id)?.district ?? '',`:

```ts
    leaderClass: classByStudent.get(r.created_by) ?? null,
```

In the `analytics` array (the `AnalyticsEntry[]` map), add the same field right after `studentIds: studentsByEntry.get(r.id) ?? [],`:

```ts
    leaderClass: classByStudent.get(r.created_by) ?? null,
```

- [ ] **Step 3: Add the filter clause and pass the group data through**

In the `rows` filter, add one clause after `if (params.district && …) return false`:

```ts
    if (params.group && iscGroupForClass(e.leaderClass) !== params.group) return false
```

Widen the `searchParams` type to include `group?: string`, alongside the existing `state?: string; district?: string;`.

- [ ] **Step 4: Render the "By group" panel**

In `src/components/admin/isc-insights.tsx`, add `byGroup` to the existing import from `@/lib/isc/analytics`:

```ts
import {
  topSchools,
  byState,
  byBoard,
  byGroup,
  classDistribution,
  submissionTimeline,
  staleDrafts,
  type AnalyticsEntry,
  type CountRow,
} from '@/lib/isc/analytics'
```

Inside `IscInsights`, add right after `const boards = byBoard(entries)`:

```ts
  const groups = byGroup(entries)
```

Change the row-2 grid from three columns to four, and add the new panel as
the third card in that row (before "Submissions per day"). Replace:

```tsx
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="By class" sub="Students taking part, not entries">
```

with:

```tsx
      <div className="grid gap-3 lg:grid-cols-4">
        <Panel title="By class" sub="Students taking part, not entries">
```

and, right after the closing `</Panel>` of the "By board" panel and before the "Submissions per day" `<Panel>`, insert:

```tsx
        <Panel title="By group" sub="Group 1: Classes 5–8 · Group 2: Classes 9–12">
          {groups.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.group} className="rounded-xl bg-black/[0.02] p-3">
                  <p className="text-xs font-semibold text-foreground">{g.label}</p>
                  <p className="text-xs text-muted mt-1">
                    {g.entries} {g.entries === 1 ? 'entry' : 'entries'} · {g.submitted} submitted ·{' '}
                    {g.students} {g.students === 1 ? 'student' : 'students'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
```

- [ ] **Step 5: Add the Group select to `IscFilters`**

In `src/components/admin/isc-filters.tsx`, add the import:

```ts
import { ISC_GROUPS, iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
```

Widen the `active` filter-key list, adding `'group'`:

```ts
  const active = ['track', 'status', 'state', 'district', 'group', 'school', 'language', 'q'].filter(
    (k) => params.get(k)
  )
```

Insert a new select right after the status select and before the state select:

```tsx
        <select
          value={params.get('group') ?? ''}
          onChange={(e) => set('group', e.target.value)}
          aria-label="Filter by group"
          className={SELECT}
        >
          <option value="">Any group</option>
          {(Object.keys(ISC_GROUPS) as IscGroup[]).map((g) => (
            <option key={g} value={g}>
              {iscGroupLabel(g)}
            </option>
          ))}
        </select>
```

- [ ] **Step 6: Type-check, test, and verify in the browser**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm test`
Expected: all tests pass.

Sign in as `admin@skillfleet.test` and open `/admin/isc`. Confirm: a "By
group" panel appears in the second insights row with two rows, whose entry
counts sum to the same total as "By track"; the Group filter narrows the list
and updates "Showing N of M" without losing scroll position (the existing
`{ scroll: false }` behavior); clearing filters restores the full list.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/isc-entry-row.tsx "src/app/(admin)/admin/isc/page.tsx" src/components/admin/isc-insights.tsx src/components/admin/isc-filters.tsx
git commit -m "feat: group filter and breakdown on admin ISC analytics"
```

---

### Task 7: Coordinator analytics — `groupParticipation()`

**Files:**
- Modify: `src/lib/coordinator/analytics.ts`
- Modify: `src/lib/coordinator/__tests__/analytics.test.ts`

**Interfaces:**
- Consumes: `iscGroupForClass`, `iscGroupLabel`, `IscGroup` from `@/lib/isc/groups` (Task 1)
- Produces: `interface GroupParticipation { group: IscGroup; label: string; students: number; entered: number }`; `groupParticipation(students: RosterEntryStatus[]): GroupParticipation[]`

This intentionally has a **different shape** from admin's `byGroup()` (Task
5): the coordinator page already counts students, not entries — `entered` /
`students`, exactly like the existing `classParticipation()` — so
`groupParticipation()` is that same function bucketed one level coarser, not
a copy of the admin one.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/coordinator/__tests__/analytics.test.ts`:

```ts
describe('groupParticipation', () => {
  it('buckets eligible students into their group, counting entered vs total', () => {
    const rows = groupParticipation([
      student({ studentId: 'a', schoolClass: 'Class 9', iscStatus: { ai_for_impact: 'draft' } }),
      student({ studentId: 'b', schoolClass: 'Class 10' }),
      student({ studentId: 'c', schoolClass: 'Class 6', iscStatus: { content_creator: 'submitted' } }),
    ])
    expect(rows).toEqual([
      { group: 'group1', label: 'Group 1 (Classes 5–8)', students: 1, entered: 1 },
      { group: 'group2', label: 'Group 2 (Classes 9–12)', students: 2, entered: 1 },
    ])
  })

  it('excludes students too young to enter, same as classParticipation', () => {
    expect(groupParticipation([student({ schoolClass: 'Class 3' })])).toEqual([])
  })

  it('omits a group with no eligible students in it rather than showing a zero row', () => {
    const rows = groupParticipation([student({ schoolClass: 'Class 9' })])
    expect(rows).toEqual([
      { group: 'group2', label: 'Group 2 (Classes 9–12)', students: 1, entered: 0 },
    ])
  })
})
```

Add `groupParticipation` to the existing import line from `'../analytics'` at the top of the file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/coordinator/__tests__/analytics.test.ts`
Expected: FAIL — `groupParticipation is not a function`.

- [ ] **Step 3: Implement**

In `src/lib/coordinator/analytics.ts`, add the import:

```ts
import { iscGroupForClass, iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
```

Add `GroupParticipation` next to `ClassParticipation`:

```ts
export interface GroupParticipation {
  group: IscGroup
  label: string
  students: number
  entered: number
}
```

Add `groupParticipation` right after `classParticipation`:

```ts
/**
 * The same eligible-student set classParticipation() counts, bucketed one
 * level coarser — by group instead of by individual class.
 */
export function groupParticipation(students: RosterEntryStatus[]): GroupParticipation[] {
  const acc = new Map<IscGroup, GroupParticipation>()

  for (const s of students) {
    if (!eligible(s)) continue
    const group = iscGroupForClass(s.schoolClass)
    if (!group) continue
    const row = acc.get(group) ?? { group, label: iscGroupLabel(group), students: 0, entered: 0 }
    row.students += 1
    if (hasEntered(s)) row.entered += 1
    acc.set(group, row)
  }

  return (['group1', 'group2'] as IscGroup[]).filter((g) => acc.has(g)).map((g) => acc.get(g) as GroupParticipation)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/coordinator/__tests__/analytics.test.ts`
Expected: PASS, 17 tests (14 existing + 3 new).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no output.

```bash
git add src/lib/coordinator/analytics.ts src/lib/coordinator/__tests__/analytics.test.ts
git commit -m "feat: group participation aggregation for the coordinator dashboard"
```

---

### Task 8: Coordinator UI — group panel and roster filter

**Files:**
- Modify: `src/components/coordinator/coordinator-stats.tsx`
- Modify: `src/components/coordinator/school-roster.tsx`

**Interfaces:**
- Consumes: `groupParticipation` from `@/lib/coordinator/analytics` (Task 7); `iscGroupForClass`, `ISC_GROUPS`, `iscGroupLabel`, `IscGroup` from `@/lib/isc/groups` (Task 1)
- Produces: nothing consumed elsewhere

- [ ] **Step 1: Add the "By group" panel to `CoordinatorStats`**

In `src/components/coordinator/coordinator-stats.tsx`, add `groupParticipation` to the existing import from `@/lib/coordinator/analytics`:

```ts
import {
  rosterSummary,
  entryCounts,
  classParticipation,
  groupParticipation,
  type RosterEntryStatus,
} from '@/lib/coordinator/analytics'
```

Inside `CoordinatorStats`, add right after `const classes = classParticipation(students)`:

```ts
  const groups = groupParticipation(students)
```

Change the two-column grid to three columns, and add the group panel as the
third card. Replace:

```tsx
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">By championship</h2>
```

with:

```tsx
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">By championship</h2>
```

and, right after the closing `</div>` of the "Class by class" card (the last
`</div>` before the grid's own closing `</div>`), insert a third card:

```tsx
        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">By group</h2>
          <p className="text-xs text-muted mt-0.5">Group 1: Classes 5–8 · Group 2: Classes 9–12</p>
          {groups.length === 0 ? (
            <p className="text-xs text-muted mt-3">No eligible students yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {groups.map((g) => (
                <li key={g.group}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{g.label}</span>
                    <span className="text-muted">
                      {g.entered} of {g.students} entered
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-teal"
                      style={{ width: `${(g.entered / Math.max(1, g.students)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
```

- [ ] **Step 2: Add the Group filter to `SchoolRoster`**

In `src/components/coordinator/school-roster.tsx`, add the import:

```ts
import { ISC_GROUPS, iscGroupForClass, iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
```

Add a new `groupFilter` state right after `const [onlyEntered, setOnlyEntered] = useState(false)`:

```ts
  const [groupFilter, setGroupFilter] = useState<IscGroup | ''>('')
```

Add a clause to the `visible` filter, right after the `classFilter` check:

```ts
      if (groupFilter && iscGroupForClass(s.schoolClass) !== groupFilter) return false
```

Update `filtering` to include it:

```ts
  const filtering = Boolean(query.trim() || classFilter || groupFilter || onlyEntered)
```

Add the select right after the existing class `<select>`, before the "Only students who have entered" checkbox label:

```tsx
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value as IscGroup | '')}
            aria-label="Filter by group"
            className={control}
          >
            <option value="">All groups</option>
            {(Object.keys(ISC_GROUPS) as IscGroup[]).map((g) => (
              <option key={g} value={g}>
                {iscGroupLabel(g)}
              </option>
            ))}
          </select>
```

Add `setGroupFilter('')` to the Clear-filters button's `onClick`:

```tsx
              onClick={() => {
                setQuery('')
                setClassFilter('')
                setGroupFilter('')
                setOnlyEntered(false)
              }}
```

- [ ] **Step 3: Type-check, test, and verify in the browser**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm test`
Expected: all tests pass.

Sign in as `coordinator.hinjawadi.test@example.invalid` and open `/coordinator`.
Confirm: a "By group" card appears next to "Class by class", and its two
`entered`/`students` totals summed equal "Have entered" / the eligible count
shown in the top tiles; picking a group in the roster narrows to only that
group's classes and the "Showing N of M" count updates; Clear filters resets
it along with the other filters.

- [ ] **Step 4: Commit**

```bash
git add src/components/coordinator/coordinator-stats.tsx src/components/coordinator/school-roster.tsx
git commit -m "feat: group panel and roster filter on the coordinator dashboard"
```

---

## Verification checklist

Run once, after Task 8.

- [ ] `npx tsc --noEmit` is clean
- [ ] `npm test` passes, including the new `groups`, extended `analytics` (isc), and extended `analytics` (coordinator) suites
- [ ] `npm run lint` reports no new errors
- [ ] Migration `0056_isc_groups.sql` applied to the live database (Task 2) — confirm with `SELECT proname FROM pg_proc WHERE proname = 'isc_group_for_class';` returning one row
- [ ] Maya's real `entrepreneurship` draft (`a0525bbb-…`) still shows `status: draft`, Sara Khan still a member — Task 2's verification transaction rolled back cleanly
- [ ] The throwaway account `isc-group-check.test@example.invalid` no longer exists — `SELECT count(*) FROM auth.users WHERE email = 'isc-group-check.test@example.invalid';` returns `0`
- [ ] `/admin/isc` as admin: Group filter and "By group" panel both present, numbers reconcile against "By track"
- [ ] `/coordinator` as the DPS Hinjawadi coordinator: "By group" panel present, roster Group filter works
- [ ] `/isc` as any eligible student: group line under the header, School-screening card visually distinct
- [ ] `git status` shows nothing staged under `supabase/`
