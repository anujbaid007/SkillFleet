# ISC Entry Edit History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin looking at an ISC entry can see how many times it was edited, when the last edit was, and exactly which fields changed each time.

**Architecture:** Every content change writes one row to a new `isc_entry_revisions` table, recorded inside `isc_save_entry` itself so nothing can edit an entry without leaving a trace. A revision stores only the fields that actually changed, as `{field: {from, to}}` — a save that changes nothing writes no row, so the edit count means what a person would expect it to mean. The admin entry row grows a history section beneath the submission it already shows.

**Tech Stack:** Next.js 16 App Router · Supabase/PostgreSQL · TypeScript · Vitest

**Spec:** No separate spec — this is the deferred item from `docs/superpowers/plans/2026-08-24-isc-polish-and-consent.md`, whose scope note records it being split out. The requirement, verbatim from the request: *"when the student edits the entry form then it should show how many times it was edited with the latest time and what was edited."*

## Decisions this plan makes

These were not specified and each changes what gets built, so they are settled here rather than during implementation:

| Question | Decision | Why |
|---|---|---|
| What counts as an edit? | Only a save that **actually changes** the submission | Pressing Save twice, or submitting without touching anything, must not inflate the count. An "edited 6 times" that includes three no-op saves is worse than no number. |
| What is stored? | Only the changed fields, as `{field: {from, to}}` | Answers "what was edited" directly. Full snapshots of seven long text fields per revision is bloat for a question nobody asked. |
| Is creating the entry an edit? | No — the first content write is revision 1, but the count is presented as "edits", and an entry never touched after creation shows "Not edited" | An entry that was filled in once and submitted has been edited once, which reads correctly. |
| Does changing status count? | No | `submitted_at` already records that. Revisions are about content. |
| Who can read revisions? | Admins, and the entry's own members | Matches the RLS shape of `isc_entries` exactly. The UI in this plan is admin-only; members having read access costs nothing and avoids a second migration if a student-facing view is ever wanted. |
| Retention | Unbounded | Editing stops at the screening deadline, so the row count is naturally bounded. |

## Non-goals

- No student-facing or coordinator-facing history view. The data supports one; this plan does not build one.
- **Two read paths exist on purpose.** `isc_get_entry_revisions` is the single-entry
  accessor and the boundary the access rule is tested through in Task 1; the admin list
  reads the table directly because it needs every entry's history in one query, and the
  same RLS policy governs both. If a single-entry view is ever built, it uses the RPC
  rather than a second bulk query.
- No revert / restore. Reading history is not the same as undoing it, and an admin restoring a student's earlier answer would be editing a submission — the read-only rule for `/admin/isc` still stands.
- No revision rows for entries edited **before** this ships. History starts from deployment; there is nothing to backfill from, because the old value was overwritten in place.

## Global Constraints

- **`AGENTS.md` applies:** this Next.js version has breaking changes from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing App Router code. `params`/`searchParams` are `Promise<{…}>`.
- **Supabase project is `bbioktywqkfvpzmakdxt` only.** Never touch `happyfleet`.
- **`supabase/` is gitignored.** Migrations are written and applied but **never** `git add`ed.
- **Migrations applied via the Management API:** `powershell -NoProfile -File <scratchpad>/sbq.ps1 -File <file.sql>`. MCP is disconnected.
- **Migration numbering continues from `0054`.**
- **All SECURITY DEFINER functions use `SET search_path = ''`** and schema-qualify every identifier.
- **Bash heredocs fail in this environment** on large quoted content, aborting with `unexpected EOF looking for matching '`. Write `.sql` files with the Write tool, then run them.
- **Do not push, and do not touch `main`.** Work stays on `feature/nikhil`.
- **`gen_random_bytes` is unavailable** under `search_path = ''` (pgcrypto lives in `extensions`). Use `gen_random_uuid()`.
- **Changing a function's return columns needs `DROP FUNCTION` first** — `CREATE OR REPLACE` cannot alter an OUT-parameter row type. Changing a *scalar-returning* function's body does not.
- **Do not call `set_config('role', …)` in verification SQL** — it switches the real Postgres role and revokes access to `auth.users`. Setting `request.jwt.claims` alone is enough for `SECURITY DEFINER` RPCs.
- **Test fixtures must pick data deliberately.** A bare `LIMIT 1` has repeatedly landed on a school with one student or no eligible students. Filter for what the assertion needs.
- **`/admin/isc` is read-only.** Nothing in this plan adds a control that mutates an entry.
- **Design system:** claymorphism — `clay-card`, `clay-button`, Baloo 2 via `font-display`. Colours are the CSS variables `primary #7447E1`, `accent-yellow #FBBF24`, `muted #64748B`.

---

## File Structure

**Created:**
| Path | Responsibility |
|---|---|
| `supabase/migrations/0055_isc_revisions.sql` | `isc_entry_revisions` table, RLS, and the `isc_save_entry` change that writes rows. *Not committed.* |
| `src/lib/isc/revisions.ts` | Shaping a raw revision row into something displayable — field labels, truncation, "N edits" phrasing |
| `src/lib/isc/__tests__/revisions.test.ts` | Unit tests for the above |
| `src/components/admin/isc-entry-history.tsx` | The history list shown inside an expanded admin row |

**Modified:**
| Path | Change |
|---|---|
| `src/lib/types/database.ts` | `isc_entry_revisions`, and the `isc_get_entry_revisions` RPC |
| `src/app/(admin)/admin/isc/page.tsx` | Fetch edit counts for the list; pass revisions to each row |
| `src/components/admin/isc-entry-row.tsx` | Show "Edited N times" in the summary; render history when expanded |

**Task order.** Task 1 puts the recording in place, so history starts accumulating immediately even before anything displays it. Task 2 is pure formatting logic, unit-tested with no database. Task 3 is the admin display. Recording before display is deliberate: if the order were reversed, the first thing built would have nothing to show.

---

### Task 1: Record a revision on every real change

**Files:**
- Create: `supabase/migrations/0055_isc_revisions.sql` (not committed)
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Consumes: `isc_entries`, `isc_is_member`, `isc_is_open`, `is_admin()` (all exist).
- Produces: table `isc_entry_revisions`; RPC `isc_get_entry_revisions(p_entry_id uuid) → jsonb` returning `{"ok":true,"revisions":[…]}` or `{"ok":false,"error":"not_found"}`. Each revision is `{revision_id, edited_at, edited_by, editor_name, changed}` where `changed` is `{field: {from, to}}`.

- [ ] **Step 1: Write the migration**

Write `supabase/migrations/0055_isc_revisions.sql` with the Write tool:

```sql
-- 0055: ISC entry edit history.
--
-- "How many times was this edited, when, and what changed" cannot be answered
-- from isc_entries: it holds a single updated_at that each save overwrites.
-- Recording lives inside isc_save_entry rather than in the server action, so
-- an entry cannot be changed by any route without leaving a trace.

CREATE TABLE IF NOT EXISTS public.isc_entry_revisions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id   UUID NOT NULL REFERENCES public.isc_entries(id) ON DELETE CASCADE,
  edited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Only the fields that actually changed: {"problem": {"from": "...", "to": "..."}}
  changed    JSONB NOT NULL,
  edited_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS isc_revisions_by_entry
  ON public.isc_entry_revisions (entry_id, edited_at DESC);

ALTER TABLE public.isc_entry_revisions ENABLE ROW LEVEL SECURITY;

-- Same read shape as isc_entries: members, admins, and the school's approved
-- coordinator. Writes happen only inside the SECURITY DEFINER save RPC, so
-- there is deliberately no INSERT policy.
DROP POLICY IF EXISTS isc_revisions_read ON public.isc_entry_revisions;
CREATE POLICY isc_revisions_read ON public.isc_entry_revisions FOR SELECT TO authenticated
USING (
  public.isc_is_member(entry_id)
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.isc_entries e
     WHERE e.id = entry_id AND public.isc_is_school_coordinator(e.school_id)
  )
);

/**
 * Which keys differ between two submissions, and how.
 *
 * Compares the union of both key sets, so a field being cleared or appearing
 * for the first time both register. Returns '{}' when nothing changed, which
 * is what stops a no-op save from inflating the edit count.
 */
CREATE OR REPLACE FUNCTION public.isc_submission_diff(p_before JSONB, p_after JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT COALESCE(
    jsonb_object_agg(
      k,
      jsonb_build_object(
        'from', COALESCE(p_before ->> k, ''),
        'to',   COALESCE(p_after  ->> k, '')
      )
    ),
    '{}'::jsonb
  )
  FROM (
    SELECT jsonb_object_keys(COALESCE(p_before, '{}'::jsonb)) AS k
    UNION
    SELECT jsonb_object_keys(COALESCE(p_after,  '{}'::jsonb))
  ) keys
  WHERE COALESCE(p_before ->> k, '') IS DISTINCT FROM COALESCE(p_after ->> k, '');
$$;

-- isc_save_entry gains the recording step. Everything above the UPDATE is
-- unchanged from 0049; only the diff and the insert are new.
CREATE OR REPLACE FUNCTION public.isc_save_entry(p_entry_id UUID, p_submission JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_track text; v_leader uuid; v_before jsonb; v_after jsonb; v_diff jsonb;
BEGIN
  SELECT e.track, e.created_by, e.submission INTO v_track, v_leader, v_before
    FROM public.isc_entries e WHERE e.id = p_entry_id;
  IF v_track IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_leader IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_leader');
  END IF;
  IF NOT public.isc_is_open(v_track) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'track_closed');
  END IF;

  v_after := COALESCE(p_submission, '{}'::jsonb);
  v_diff  := public.isc_submission_diff(v_before, v_after);

  -- A save that changes nothing is not an edit. Skipping the UPDATE too keeps
  -- updated_at honest, so "last edited" never moves without a real change.
  IF v_diff = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;

  UPDATE public.isc_entries
     SET submission = v_after, updated_at = now()
   WHERE id = p_entry_id;

  INSERT INTO public.isc_entry_revisions (entry_id, edited_by, changed)
  VALUES (p_entry_id, auth.uid(), v_diff);

  RETURN jsonb_build_object('ok', true, 'changed', true);
END;
$$;

/** An entry's history, newest first, for anyone allowed to read the entry. */
CREATE OR REPLACE FUNCTION public.isc_get_entry_revisions(p_entry_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '' AS $$
DECLARE v_allowed boolean; v_school uuid;
BEGIN
  SELECT e.school_id INTO v_school FROM public.isc_entries e WHERE e.id = p_entry_id;
  IF v_school IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  v_allowed := public.isc_is_member(p_entry_id)
            OR public.is_admin()
            OR public.isc_is_school_coordinator(v_school);
  IF NOT v_allowed THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'revisions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'revision_id', r.id,
               'edited_at', r.edited_at,
               'edited_by', r.edited_by,
               'editor_name', p.full_name,
               'changed', r.changed
             ) ORDER BY r.edited_at DESC)
        FROM public.isc_entry_revisions r
        LEFT JOIN public.user_profiles p ON p.id = r.edited_by
       WHERE r.entry_id = p_entry_id
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.isc_submission_diff(JSONB, JSONB)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.isc_get_entry_revisions(UUID)      TO authenticated;
```

- [ ] **Step 2: Apply the migration**

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cp supabase/migrations/0055_isc_revisions.sql "$SP/m55.sql"
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/m55.sql"
```

Expected: no output.

- [ ] **Step 3: Verify the objects landed**

Write `$SP/v55.sql`:

```sql
SELECT 'table: ' || count(*)::text AS r FROM information_schema.tables
 WHERE table_schema='public' AND table_name='isc_entry_revisions'
UNION ALL SELECT 'fns: ' || string_agg(p.proname, ',' ORDER BY p.proname)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('isc_submission_diff','isc_get_entry_revisions')
UNION ALL SELECT 'policy: ' || string_agg(policyname, ',')
  FROM pg_policies WHERE schemaname='public' AND tablename='isc_entry_revisions'
UNION ALL SELECT 'diff of identical = ' ||
  public.isc_submission_diff('{"a":"1"}'::jsonb, '{"a":"1"}'::jsonb)::text
UNION ALL SELECT 'diff of changed = ' ||
  public.isc_submission_diff('{"a":"1"}'::jsonb, '{"a":"2"}'::jsonb)::text
UNION ALL SELECT 'diff of added = ' ||
  public.isc_submission_diff('{}'::jsonb, '{"a":"2"}'::jsonb)::text
UNION ALL SELECT 'diff of cleared = ' ||
  public.isc_submission_diff('{"a":"1"}'::jsonb, '{"a":""}'::jsonb)::text;
```

Run: `powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v55.sql"`

Expected: `table: 1`; both function names; the policy; `diff of identical = {}`; `diff of changed` showing `{"a": {"to": "2", "from": "1"}}`; the added and cleared cases both producing a non-empty diff.

- [ ] **Step 4: Verify recording behaviour against the live database**

Write `$SP/t55.sql`. Everything runs inside a transaction that always rolls back.

```sql
DO $$
DECLARE
  student uuid; s_id uuid; res jsonb; e_id uuid; n int; out_txt text := '';
  v_rev jsonb;
BEGIN
  -- A school with at least two eligible students, so this fixture matches the
  -- others; a bare LIMIT 1 lands on single-student schools.
  SELECT p.school_id INTO s_id
    FROM public.user_profiles p
   WHERE p.role='student' AND p.school_id IS NOT NULL
     AND public.isc_class_is_eligible(p.school_class)
   GROUP BY p.school_id HAVING count(*) >= 2
   ORDER BY count(*) DESC, p.school_id LIMIT 1;

  SELECT p.id INTO student FROM public.user_profiles p
   WHERE p.role='student' AND p.school_id = s_id
     AND public.isc_class_is_eligible(p.school_class)
     AND NOT EXISTS (SELECT 1 FROM public.isc_entry_members m
                      WHERE m.user_id = p.id AND m.track = 'ai_for_impact')
   ORDER BY p.id LIMIT 1;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', student,'role','authenticated')::text, true);

  SELECT public.isc_start_entry('ai_for_impact') INTO res;
  e_id := (res->>'entry_id')::uuid;

  SELECT count(*) INTO n FROM public.isc_entry_revisions WHERE entry_id = e_id;
  out_txt := format('1) revisions on a fresh entry = %s (want 0)', n) || chr(10);

  -- First real content: one revision.
  SELECT public.isc_save_entry(e_id, '{"app_url":"https://a.example.com"}'::jsonb) INTO res;
  SELECT count(*) INTO n FROM public.isc_entry_revisions WHERE entry_id = e_id;
  out_txt := out_txt || format('2) after first save -> changed=%s revisions=%s (want true/1)',
    res->>'changed', n) || chr(10);

  -- Saving the SAME content again must not count.
  SELECT public.isc_save_entry(e_id, '{"app_url":"https://a.example.com"}'::jsonb) INTO res;
  SELECT count(*) INTO n FROM public.isc_entry_revisions WHERE entry_id = e_id;
  out_txt := out_txt || format('3) identical re-save -> changed=%s revisions=%s (want false/1)',
    res->>'changed', n) || chr(10);

  -- A real change: second revision, recording only the field that moved.
  SELECT public.isc_save_entry(e_id, '{"app_url":"https://b.example.com"}'::jsonb) INTO res;
  SELECT count(*) INTO n FROM public.isc_entry_revisions WHERE entry_id = e_id;
  out_txt := out_txt || format('4) changed save -> revisions=%s (want 2)', n) || chr(10);

  SELECT r.changed INTO v_rev FROM public.isc_entry_revisions r
   WHERE r.entry_id = e_id ORDER BY r.edited_at DESC LIMIT 1;
  out_txt := out_txt || format('5) newest revision records only app_url -> keys=%s from=%s to=%s',
    (SELECT string_agg(k, ',') FROM jsonb_object_keys(v_rev) k),
    v_rev->'app_url'->>'from', v_rev->'app_url'->>'to') || chr(10);

  -- Adding a second field records only that field, not the untouched one.
  SELECT public.isc_save_entry(e_id,
    '{"app_url":"https://b.example.com","explanation":"why"}'::jsonb) INTO res;
  SELECT r.changed INTO v_rev FROM public.isc_entry_revisions r
   WHERE r.entry_id = e_id ORDER BY r.edited_at DESC LIMIT 1;
  out_txt := out_txt || format('6) adding a field records just it -> keys=%s (want explanation)',
    (SELECT string_agg(k, ',') FROM jsonb_object_keys(v_rev) k)) || chr(10);

  -- updated_at must not move on a no-op save.
  DECLARE v_before timestamptz; v_after timestamptz;
  BEGIN
    SELECT updated_at INTO v_before FROM public.isc_entries WHERE id = e_id;
    PERFORM pg_sleep(0.05);
    PERFORM public.isc_save_entry(e_id,
      '{"app_url":"https://b.example.com","explanation":"why"}'::jsonb);
    SELECT updated_at INTO v_after FROM public.isc_entries WHERE id = e_id;
    out_txt := out_txt || format('7) no-op save leaves updated_at alone = %s (want true)',
      v_before = v_after) || chr(10);
  END;

  -- The reader RPC.
  SELECT public.isc_get_entry_revisions(e_id) INTO res;
  out_txt := out_txt || format('8) get_revisions ok=%s count=%s (want true/3)',
    res->>'ok', jsonb_array_length(res->'revisions')) || chr(10);
  out_txt := out_txt || format('9) newest first = %s (want true)',
    (res->'revisions'->0->>'edited_at') >= (res->'revisions'->1->>'edited_at')) || chr(10);
  out_txt := out_txt || format('10) editor named = %s',
    res->'revisions'->0->>'editor_name') || chr(10);

  -- An unrelated student cannot read the history.
  DECLARE other uuid;
  BEGIN
    SELECT p.id INTO other FROM public.user_profiles p
     WHERE p.role='student' AND p.school_id IS DISTINCT FROM s_id
       AND p.school_id IS NOT NULL ORDER BY p.id LIMIT 1;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', other,'role','authenticated')::text, true);
    SELECT public.isc_get_entry_revisions(e_id) INTO res;
    out_txt := out_txt || format('11) stranger reads history -> %s (want not_found)', res->>'error') || chr(10);
  END;

  RAISE EXCEPTION '%', chr(10) || out_txt;
END $$;
```

Run: `powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/t55.sql"`

Expected, each matching its `(want …)`: `0` revisions on a fresh entry; first save `changed=true` with `1`; **identical re-save `changed=false`, still `1`**; a real change gives `2`; the newest revision names only `app_url` with the right from/to; adding a field records only `explanation`; `updated_at` unchanged by a no-op; the reader returns `3` newest-first with the editor named; and a stranger gets `not_found`.

- [ ] **Step 5: Add the database types**

In `src/lib/types/database.ts`, add to `Tables`:

```ts
      isc_entry_revisions: {
        Row: {
          id: string
          entry_id: string
          edited_by: string | null
          changed: Json
          edited_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          edited_by?: string | null
          changed: Json
          edited_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          edited_by?: string | null
          changed?: Json
          edited_at?: string
        }
        Relationships: []
      }
```

And to `Functions`:

```ts
      isc_get_entry_revisions: { Args: { p_entry_id: string }; Returns: Json }
```

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: exit 0. `isc_save_entry`'s TypeScript signature is unchanged — only its body and its returned payload gained a field, and the extra `changed` key is ignored by every existing caller.

```bash
git add src/lib/types/database.ts
git commit -m "feat: record ISC entry revisions on every real change"
```

---

### Task 2: Shaping a revision for display

Pure functions, no database, so the phrasing and truncation rules are unit-tested rather than eyeballed.

**Files:**
- Create: `src/lib/isc/revisions.ts`
- Test: `src/lib/isc/__tests__/revisions.test.ts`

**Interfaces:**
- Consumes: `TRACK_FIELDS`, `IscTrackId` from `@/lib/isc/tracks`.
- Produces: `interface RevisionChange { key: string; label: string; from: string; to: string }`; `interface EntryRevision { revisionId: string; editedAt: string; editorName: string | null; changes: RevisionChange[] }`; `parseRevisions(track: IscTrackId, raw: unknown): EntryRevision[]`; `editCountLabel(n: number): string`; `truncate(value: string, max?: number): string`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/isc/__tests__/revisions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseRevisions, editCountLabel, truncate } from '../revisions'

const raw = [
  {
    revision_id: 'r2',
    edited_at: '2026-09-02T10:00:00Z',
    editor_name: 'Maya Sharma',
    changed: { app_url: { from: 'https://a.example.com', to: 'https://b.example.com' } },
  },
  {
    revision_id: 'r1',
    edited_at: '2026-09-01T10:00:00Z',
    editor_name: 'Maya Sharma',
    changed: { app_url: { from: '', to: 'https://a.example.com' } },
  },
]

describe('parseRevisions', () => {
  it('turns raw rows into displayable revisions', () => {
    const revisions = parseRevisions('ai_for_impact', raw)
    expect(revisions).toHaveLength(2)
    expect(revisions[0].revisionId).toBe('r2')
    expect(revisions[0].editorName).toBe('Maya Sharma')
  })

  it('labels each changed field with the label the student saw', () => {
    const [newest] = parseRevisions('ai_for_impact', raw)
    expect(newest.changes).toHaveLength(1)
    expect(newest.changes[0].key).toBe('app_url')
    expect(newest.changes[0].label).toBe('Link to your app or prototype')
    expect(newest.changes[0].from).toBe('https://a.example.com')
    expect(newest.changes[0].to).toBe('https://b.example.com')
  })

  it('falls back to the raw key for a field the track no longer has', () => {
    const [rev] = parseRevisions('ai_for_impact', [
      { revision_id: 'r', edited_at: '2026-09-01T10:00:00Z', editor_name: null, changed: { retired_field: { from: 'a', to: 'b' } } },
    ])
    expect(rev.changes[0].label).toBe('retired_field')
  })

  it('survives malformed input rather than throwing', () => {
    expect(parseRevisions('ai_for_impact', null)).toEqual([])
    expect(parseRevisions('ai_for_impact', 'nonsense')).toEqual([])
    expect(parseRevisions('ai_for_impact', [{}])).toEqual([])
  })

  it('sorts changed fields in the order the form shows them', () => {
    const [rev] = parseRevisions('ai_for_impact', [
      {
        revision_id: 'r',
        edited_at: '2026-09-01T10:00:00Z',
        editor_name: null,
        // Deliberately out of form order.
        changed: {
          explanation: { from: '', to: 'x' },
          app_url: { from: '', to: 'y' },
        },
      },
    ])
    expect(rev.changes.map((c) => c.key)).toEqual(['app_url', 'explanation'])
  })
})

describe('editCountLabel', () => {
  it('reads naturally at every count', () => {
    expect(editCountLabel(0)).toBe('Not edited')
    expect(editCountLabel(1)).toBe('Edited once')
    expect(editCountLabel(2)).toBe('Edited twice')
    expect(editCountLabel(5)).toBe('Edited 5 times')
  })
})

describe('truncate', () => {
  it('leaves short values alone', () => {
    expect(truncate('hello')).toBe('hello')
  })

  it('shortens long values with an ellipsis', () => {
    const out = truncate('x'.repeat(300), 120)
    expect(out).toHaveLength(121)
    expect(out.endsWith('…')).toBe(true)
  })

  it('shows a placeholder for an empty value, so a cleared field is visible', () => {
    expect(truncate('')).toBe('(empty)')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/revisions.test.ts`
Expected: FAIL — `Cannot find module '../revisions'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/isc/revisions.ts`:

```ts
import { TRACK_FIELDS, type IscTrackId } from '@/lib/isc/tracks'

export interface RevisionChange {
  key: string
  /** The label the student saw on the form, so history reads like the form. */
  label: string
  from: string
  to: string
}

export interface EntryRevision {
  revisionId: string
  editedAt: string
  editorName: string | null
  changes: RevisionChange[]
}

/** Long answers are shown abbreviated; the full text lives on the entry itself. */
export function truncate(value: string, max = 120): string {
  if (!value) return '(empty)'
  return value.length <= max ? value : `${value.slice(0, max)}…`
}

/** "Edited 1 times" reads badly enough to be worth three special cases. */
export function editCountLabel(n: number): string {
  if (n <= 0) return 'Not edited'
  if (n === 1) return 'Edited once'
  if (n === 2) return 'Edited twice'
  return `Edited ${n} times`
}

interface RawRevision {
  revision_id?: unknown
  edited_at?: unknown
  editor_name?: unknown
  changed?: unknown
}

/**
 * Shape the RPC's payload for display.
 *
 * Defensive throughout: this renders on an admin screen, and a malformed row
 * should cost one missing history entry, not a blank page.
 */
export function parseRevisions(track: IscTrackId, raw: unknown): EntryRevision[] {
  if (!Array.isArray(raw)) return []

  // Field order comes from the form, so a revision touching several fields
  // lists them the way the student encountered them.
  const order = new Map(TRACK_FIELDS[track].map((spec, i) => [spec.key, i]))
  const labels = new Map(TRACK_FIELDS[track].map((spec) => [spec.key, spec.label]))

  const out: EntryRevision[] = []

  for (const row of raw as RawRevision[]) {
    if (!row || typeof row !== 'object') continue
    const revisionId = typeof row.revision_id === 'string' ? row.revision_id : null
    const editedAt = typeof row.edited_at === 'string' ? row.edited_at : null
    if (!revisionId || !editedAt) continue

    const changedRaw = row.changed
    if (!changedRaw || typeof changedRaw !== 'object') continue

    const changes: RevisionChange[] = Object.entries(
      changedRaw as Record<string, { from?: unknown; to?: unknown }>
    )
      .map(([key, delta]) => ({
        key,
        // A field the track no longer defines still deserves to be shown.
        label: labels.get(key) ?? key,
        from: typeof delta?.from === 'string' ? delta.from : '',
        to: typeof delta?.to === 'string' ? delta.to : '',
      }))
      .sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999))

    if (changes.length === 0) continue

    out.push({
      revisionId,
      editedAt,
      editorName: typeof row.editor_name === 'string' ? row.editor_name : null,
      changes,
    })
  }

  return out
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/isc/__tests__/revisions.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/lib/isc/revisions.ts src/lib/isc/__tests__/revisions.test.ts
git commit -m "feat: shape ISC entry revisions for display"
```

---

### Task 3: Show the history on the admin entry

**Files:**
- Create: `src/components/admin/isc-entry-history.tsx`
- Modify: `src/app/(admin)/admin/isc/page.tsx`
- Modify: `src/components/admin/isc-entry-row.tsx`

**Interfaces:**
- Consumes: Task 1's `isc_entry_revisions` table, Task 2's `parseRevisions`, `editCountLabel`, `truncate`, `EntryRevision`.
- Produces: `IscEntryHistory` component; `AdminIscEntry` gains `editCount: number` and `revisions: EntryRevision[]`.

- [ ] **Step 1: Write the history component**

Create `src/components/admin/isc-entry-history.tsx`:

```tsx
import { ArrowRight, History } from 'lucide-react'
import { truncate, type EntryRevision } from '@/lib/isc/revisions'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * What changed, when, and by whom — newest first.
 *
 * Read-only like the rest of /admin/isc: seeing an earlier value is not an
 * invitation to restore it.
 */
export function IscEntryHistory({ revisions }: { revisions: EntryRevision[] }) {
  if (revisions.length === 0) {
    return (
      <p className="text-xs text-muted">
        No edits recorded. History starts from the first change after this feature shipped.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide inline-flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        Edit history
      </h3>

      <ol className="space-y-3">
        {revisions.map((rev) => (
          <li key={rev.revisionId} className="rounded-xl bg-white/70 p-3">
            <p className="text-xs text-muted">
              {fmt(rev.editedAt)}
              {rev.editorName && ` · ${rev.editorName}`}
              {' · '}
              {rev.changes.length} field{rev.changes.length === 1 ? '' : 's'} changed
            </p>

            <ul className="mt-2 space-y-2">
              {rev.changes.map((c) => (
                <li key={c.key}>
                  <p className="text-xs font-semibold text-foreground">{c.label}</p>
                  <p className="text-xs text-muted flex items-start gap-1.5 mt-0.5 flex-wrap">
                    <span className="line-through opacity-70 break-words">
                      {truncate(c.from)}
                    </span>
                    <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="text-foreground break-words">{truncate(c.to)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

- [ ] **Step 2: Fetch revisions on the admin page**

In `src/app/(admin)/admin/isc/page.tsx`, add the import (`IscTrackId` is already imported on line 5):

```tsx
import { parseRevisions, type EntryRevision } from '@/lib/isc/revisions'
```

Immediately **after** `leaderById` is built — editor names are resolved from it — fetch every revision in one query:

```tsx
  // One query for the whole page. The admin list already loads every entry, and
  // the screening set is a few thousand rows at most; a query per row would be
  // hundreds of round trips for a panel most rows never expand.
  const { data: revisionRows } = all.length
    ? await supabase
        .from('isc_entry_revisions')
        .select('id, entry_id, edited_by, changed, edited_at')
        .in(
          'entry_id',
          all.map((r) => r.id)
        )
        .order('edited_at', { ascending: false })
    : { data: [] }
```

Then group by entry and parse **once per entry**, not once per revision — `parseRevisions`
builds a label and ordering map from `TRACK_FIELDS` on every call, so calling it per row
would rebuild those maps thousands of times:

```tsx
  const trackByEntry = new Map(all.map((e) => [e.id, e.track as IscTrackId]))

  const rawByEntry = new Map<string, unknown[]>()
  for (const row of revisionRows ?? []) {
    const list = rawByEntry.get(row.entry_id) ?? []
    list.push({
      revision_id: row.id,
      edited_at: row.edited_at,
      // Only the leader can edit, so the editor is always the entry's
      // created_by and leaderById already covers them. A future rule change
      // that lets teammates edit would need a wider name lookup here.
      editor_name: row.edited_by ? (leaderById.get(row.edited_by) ?? null) : null,
      changed: row.changed,
    })
    rawByEntry.set(row.entry_id, list)
  }

  const revisionsByEntry = new Map<string, EntryRevision[]>()
  for (const [entryId, rows] of rawByEntry) {
    const track = trackByEntry.get(entryId)
    // An orphan revision cannot be labelled without knowing its track; skipping
    // beats guessing a track and mislabelling every field in it.
    if (!track) continue
    revisionsByEntry.set(entryId, parseRevisions(track, rows))
  }
```

Add both fields where `enriched` is built, alongside `language`:

```tsx
    language: (r.submission?.language as string) ?? null,
    editCount: (revisionsByEntry.get(r.id) ?? []).length,
    revisions: revisionsByEntry.get(r.id) ?? [],
```

- [ ] **Step 3: Show it on the row**

In `src/components/admin/isc-entry-row.tsx`, add the imports:

```tsx
import { editCountLabel, type EntryRevision } from '@/lib/isc/revisions'
import { IscEntryHistory } from '@/components/admin/isc-entry-history'
```

Extend the interface:

```tsx
  language: string | null
  editCount: number
  revisions: EntryRevision[]
  submission: Record<string, unknown>
```

Replace the second summary line — the one currently reading `Submitted … · last edited …` — so the edit count sits beside the dates:

```tsx
          <span className="block text-xs text-muted">
            {entry.submittedAt
              ? `Submitted ${new Date(entry.submittedAt).toLocaleDateString('en-IN')}`
              : 'Not submitted'}
            {' · '}
            {editCountLabel(entry.editCount)}
            {entry.editCount > 0 &&
              ` · last edit ${new Date(entry.updatedAt).toLocaleDateString('en-IN')}`}
          </span>
```

Then render the history inside the expanded panel, immediately after the closing `</dl>`:

```tsx
          <div className="mt-4 rounded-xl bg-black/[0.02] p-4">
            <IscEntryHistory revisions={entry.revisions} />
          </div>
```

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: tsc exit 0; `✓ Compiled successfully`.

- [ ] **Step 5: Generate real history and read it in the browser**

Start `npm run dev`. Sign in as an eligible student who leads an entry (`maya@gmail.com` / `12345678`), open one of their tracks, and make **three distinct saves**: change the video link, then the explanation, then press Save again without changing anything.

Then sign in as an admin and open `/admin/isc`.

Expected on that entry's summary line: **"Edited twice"** — not three times, because the unchanged save is not an edit. Expanding the row shows both revisions newest first, each naming the field by the label the student saw, with the old value struck through and the new value beside it.

Confirm the count against the database. Write `$SP/v-rev.sql`:

```sql
SELECT e.track || ' | edits=' ||
       (SELECT count(*) FROM public.isc_entry_revisions r WHERE r.entry_id = e.id)::text
       || ' | last=' || to_char(e.updated_at, 'DD Mon HH24:MI') AS r
  FROM public.isc_entries e
 ORDER BY e.updated_at DESC LIMIT 3;
```

Expected: the edit count matches what the page displays.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/isc-entry-history.tsx "src/app/(admin)/admin/isc/page.tsx" src/components/admin/isc-entry-row.tsx
git commit -m "feat: show ISC entry edit history to admins"
```

---

## Done when

- Editing an entry records a revision naming only the fields that actually changed, with their before and after values.
- **Saving without changing anything records nothing**, and leaves `updated_at` untouched — so both the edit count and "last edit" mean what they say.
- An admin sees "Edited once / twice / N times" on every entry row, and the full history when they expand it, newest first.
- Each change is labelled with the wording the student saw on the form.
- An entry with no recorded edits says so plainly rather than showing an empty list.
- Only members, admins and the school's approved coordinator can read an entry's history; a stranger gets `not_found`.
- Nothing on `/admin/isc` can alter an entry.
- `npx tsc --noEmit`, `npx vitest run` and `npx next build` are all clean.
