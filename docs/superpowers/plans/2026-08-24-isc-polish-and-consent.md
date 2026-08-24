# ISC 2026 Polish, Track Detail Pages and One-Time Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the working-but-plain ISC screens into pages that match the rest of the platform, give each track a real detail page before its form, add the Language field the source documents require, and move parental consent from a per-entry checkbox to one confirmation per student per season.

**Architecture:** Each track gains a visual identity (icon, gradient, tint) declared beside its existing definition, exactly as `OFFERING_TYPE_META` already does for offerings. `/isc/[track]` splits into two moments — a detail page describing the track, then an explicit "Enter this track" action that creates the draft — which also stops merely browsing from creating phantom entries. Consent moves into its own `isc_consent` table keyed by student and season, checked inside `isc_submit_entry` rather than passed in from the client.

**Tech Stack:** Next.js 16 App Router · Supabase/PostgreSQL · TypeScript · Vitest

**Spec:** `docs/superpowers/specs/2026-08-24-isc-2026-entries-design.md` — as amended by the three decisions recorded below.

## Amendments to the spec

The spec is the design this build refines. Three of its decisions changed after re-reading `ISC.pdf`, `ISC_General_Deck.pdf` and `ISC_Integration_Map.html` together, and the spec's own wording no longer describes what we are building:

| Spec said | Now | Why |
|---|---|---|
| "the parental-consent tick" on every entry form | **One confirmation per student per season**, before their first entry | The integration map gates consent on *"First ISC entry this season?"*, not per form. A student entering three tracks should not tick it three times. |
| `/isc/[track]` carries "the track brief, then the entry form" | **Detail page first**, then an explicit "Enter this track" | The integration map's journey is `Track detail page → Enter this track → form`. It also fixes a real defect: visiting a track currently creates a draft, so browsing produces phantom entries in the admin list and on the coordinator roster. |
| Per-track fields only | Every track also asks **Language — English or Hindi** | Required by the deck ("Entries are accepted in either language across all four tracks") and listed on every track's form in the integration map. |

Everything else in the spec still holds, including the non-goals: no state round, no payments, no judging, no certificates, no Puzzle Master quiz engine.

## Global Constraints

- **`AGENTS.md` applies:** this Next.js version has breaking changes from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing App Router code. `params`/`searchParams` are `Promise<{…}>`.
- **Supabase project is `bbioktywqkfvpzmakdxt` only.** Never touch `happyfleet`.
- **`supabase/` is gitignored.** Migrations are written and applied but **never** `git add`ed.
- **Migrations applied via the Management API:** `powershell -NoProfile -File <scratchpad>/sbq.ps1 -File <file.sql>`. MCP is disconnected.
- **Migration numbering continues from `0052`.**
- **All SECURITY DEFINER functions use `SET search_path = ''`** and schema-qualify every identifier.
- **Bash heredocs fail in this environment** on large quoted content, aborting with `unexpected EOF looking for matching '`. Write `.sql` files with the Write tool, then run them.
- **Do not push, and do not touch `main`.** Work stays on `feature/nikhil`.
- **`gen_random_bytes` is unavailable** under `search_path = ''` (pgcrypto lives in `extensions`). Use `gen_random_uuid()`.
- **Adding a column to a function's return type needs `DROP FUNCTION` first** — `CREATE OR REPLACE` cannot change an OUT-parameter row type.
- **Do not call `set_config('role', …)` in verification SQL** — it switches the real Postgres role and revokes access to `auth.users`. Setting `request.jwt.claims` alone is enough for `SECURITY DEFINER` RPCs.
- **Test fixtures must pick data deliberately.** A bare `LIMIT 1` has repeatedly landed on a school with one student, a school with no eligible students, or an approved-coordinator school with neither. Always filter for what the assertion needs.
- **The season is `'2026'`,** declared once as `ISC_SEASON` in `src/lib/isc/tracks.ts` and as the column default in SQL.
- **Design system:** claymorphism. `clay-card`, `clay-button`, Baloo 2 via `font-display`, Inter for body. Colours are the CSS variables `primary #7447E1`, `accent-teal #14B8A6`, `accent-pink #EC4899`, `accent-yellow #FBBF24`, `accent-purple #9333EA`. Reveal animations use the existing `<Reveal>` wrapper.

---

## File Structure

**Created:**
| Path | Responsibility |
|---|---|
| `supabase/migrations/0053_isc_consent.sql` | `isc_consent` table, RLS, consent RPCs, `isc_submit_entry` signature change, backfill. *Not committed.* |
| `src/lib/isc/__tests__/language.test.ts` | Unit tests for the language field and consent-state helpers |
| `src/components/isc/track-hero.tsx` | The detail page's hero: icon badge, format, badges, deadline |
| `src/components/isc/track-facts.tsx` | Prize summary, team rule, language note, what to prepare |
| `src/components/isc/enter-track-button.tsx` | "Enter this track" — creates the draft, routes onward |
| `src/components/isc/how-it-works.tsx` | The three-stage strip on `/isc` |
| `src/components/isc/consent-form.tsx` | The one-time guardian confirmation |
| `src/app/(platform)/isc/consent/page.tsx` | `/isc/consent` |

**Modified:**
| Path | Change |
|---|---|
| `src/lib/isc/tracks.ts` | Per-track `icon`/`gradient`/`tint`/`accent`, `prize`, `prepare`; `LANGUAGE_OPTIONS`; `ISC_SEASON`; Puzzle Master gains the same identity fields |
| `src/lib/isc/validate.ts` | `validateSubmission` also requires `language` |
| `src/components/isc/track-card.tsx` | Redesigned around a gradient icon badge |
| `src/app/(platform)/isc/page.tsx` | Richer header, how-it-works strip, no phantom drafts |
| `src/app/(platform)/isc/[track]/page.tsx` | Becomes the detail page; form only once an entry exists |
| `src/components/isc/entry-form.tsx` | Language selector added, consent checkbox removed |
| `src/app/actions/isc.ts` | `startEntryAction`, consent actions, `isc_submit_entry` call loses its consent argument |
| `src/lib/types/database.ts` | `isc_consent`, the consent RPCs, new `isc_submit_entry` signature |
| `docs/superpowers/specs/2026-08-24-isc-2026-entries-design.md` | A short amended-by note pointing here |

**Task order.** Task 1 is the data change, so everything after it can rely on consent existing. Task 2 is pure data and unit-tested. Tasks 3–4 are the visible redesign of the two existing screens. Task 5 introduces the detail/enter split, which is the structural change. Task 6 adds the consent screen that Task 1 made possible, and Task 7 removes the old checkbox — deliberately last, so the app is never in a state where consent is unenforceable.

---

### Task 1: Consent table, RPCs, and backfill

**Files:**
- Create: `supabase/migrations/0053_isc_consent.sql` (not committed)
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Consumes: `isc_entries`, `user_profiles`, `families`, `isc_is_open` (all exist).
- Produces: table `isc_consent`; `isc_has_consent() → boolean`; `isc_give_consent(p_guardian_name text) → jsonb`; `isc_submit_entry(p_entry_id uuid) → jsonb` — note the `p_consent` argument is **gone**.

- [ ] **Step 1: Write the migration**

Write `supabase/migrations/0053_isc_consent.sql` with the Write tool:

```sql
-- 0053: parental consent becomes one confirmation per student per season,
-- rather than a checkbox repeated on every entry form. The integration map
-- gates it on "first ISC entry this season", and a student entering three
-- tracks should not be asked three times.

CREATE TABLE IF NOT EXISTS public.isc_consent (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Without a season, next year's cycle would silently inherit this year's
  -- consent. '2026' is the inaugural cycle.
  season        TEXT NOT NULL DEFAULT '2026',
  guardian_name TEXT NOT NULL,
  given_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS isc_consent_once_per_season
  ON public.isc_consent (student_id, season);

ALTER TABLE public.isc_consent ENABLE ROW LEVEL SECURITY;

-- Read-only policy; the write goes through the SECURITY DEFINER RPC below,
-- matching every other ISC table.
DROP POLICY IF EXISTS isc_consent_read ON public.isc_consent;
CREATE POLICY isc_consent_read ON public.isc_consent FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

/** Has the caller already given consent for this season? */
CREATE OR REPLACE FUNCTION public.isc_has_consent()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.isc_consent c
     WHERE c.student_id = auth.uid() AND c.season = '2026'
  );
$$;

/**
 * Record the one-time confirmation. Idempotent: a student who lands here
 * twice keeps their original timestamp rather than resetting it.
 */
CREATE OR REPLACE FUNCTION public.isc_give_consent(p_guardian_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_role text; v_name text := NULLIF(BTRIM(COALESCE(p_guardian_name, '')), '');
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'student' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_student');
  END IF;
  IF v_name IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'guardian_name_required');
  END IF;

  INSERT INTO public.isc_consent (student_id, season, guardian_name)
  VALUES (auth.uid(), '2026', v_name)
  ON CONFLICT (student_id, season) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Backfill: entries already submitted under the old per-entry checkbox must
-- not suddenly read as un-consented. The guardian name comes from the family
-- record where there is one.
INSERT INTO public.isc_consent (student_id, season, guardian_name, given_at)
SELECT DISTINCT ON (e.created_by)
       e.created_by, '2026',
       COALESCE(f.parent_full_name, 'Recorded before consent was captured'),
       e.consent_given_at
  FROM public.isc_entries e
  LEFT JOIN public.user_profiles p ON p.id = e.created_by
  LEFT JOIN public.families f ON f.id = p.family_id
 WHERE e.consent_given_at IS NOT NULL
 ORDER BY e.created_by, e.consent_given_at
ON CONFLICT (student_id, season) DO NOTHING;

-- isc_submit_entry loses its p_consent argument: consent is now looked up,
-- not supplied by the caller. The old two-argument version must go, or both
-- overloads would exist and PostgREST could pick either.
DROP FUNCTION IF EXISTS public.isc_submit_entry(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.isc_submit_entry(p_entry_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_track text; v_leader uuid; v_school uuid; v_sub jsonb; v_bad int;
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
  -- The gate is now the student's season consent, not a client-supplied flag.
  IF NOT public.isc_has_consent() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'consent_required');
  END IF;
  IF v_sub IS NULL OR v_sub = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
  END IF;

  -- Defensive: a teammate must never have drifted out of the school. A pending
  -- invite has no user_id, so the join skips it and never blocks a submission.
  SELECT count(*) INTO v_bad
    FROM public.isc_entry_members m
    JOIN public.user_profiles p ON p.id = m.user_id
   WHERE m.entry_id = p_entry_id AND p.school_id IS DISTINCT FROM v_school;
  IF v_bad > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'wrong_school'); END IF;

  UPDATE public.isc_entries
     SET status = 'submitted', submitted_at = now(),
         -- Kept as an audit stamp of when this entry was submitted under
         -- consent; the authoritative record is now isc_consent.
         consent_given_at = now(), updated_at = now()
   WHERE id = p_entry_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.isc_has_consent()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.isc_give_consent(TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.isc_submit_entry(UUID)        TO authenticated;
```

- [ ] **Step 2: Apply the migration**

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cp supabase/migrations/0053_isc_consent.sql "$SP/m53.sql"
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/m53.sql"
```

Expected: no output.

- [ ] **Step 3: Verify the objects, the backfill, and that the old overload is gone**

Write `$SP/v53.sql`:

```sql
SELECT 'table: ' || count(*)::text AS r FROM information_schema.tables
 WHERE table_schema='public' AND table_name='isc_consent'
UNION ALL SELECT 'fns: ' || string_agg(p.proname, ',' ORDER BY p.proname)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('isc_has_consent','isc_give_consent')
UNION ALL SELECT 'submit_entry overloads: ' || count(*)::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='isc_submit_entry'
UNION ALL SELECT 'submit_entry args: ' || pg_get_function_identity_arguments(p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='isc_submit_entry'
UNION ALL SELECT 'backfilled consents: ' || count(*)::text FROM public.isc_consent
UNION ALL SELECT 'submitted entries: ' || count(*)::text
  FROM public.isc_entries WHERE consent_given_at IS NOT NULL;
```

Run: `powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v53.sql"`

Expected: `table: 1`; both function names; **`submit_entry overloads: 1`**; `submit_entry args: p_entry_id uuid`; and `backfilled consents` at least 1, covering every distinct student who had a submitted entry.

- [ ] **Step 4: Verify the consent gate against the live database**

Write `$SP/t53.sql`. Everything runs inside a transaction that always rolls back.

```sql
DO $$
DECLARE
  student uuid; s_id uuid; res jsonb; e_id uuid; out_txt text := '';
BEGIN
  -- A school with at least two eligible students, so later tasks reusing this
  -- fixture have somebody to add. A bare LIMIT 1 lands on single-student
  -- schools and produces confusing failures.
  SELECT p.school_id INTO s_id
    FROM public.user_profiles p
   WHERE p.role='student' AND p.school_id IS NOT NULL
     AND public.isc_class_is_eligible(p.school_class)
   GROUP BY p.school_id HAVING count(*) >= 2
   ORDER BY count(*) DESC, p.school_id LIMIT 1;

  -- Somebody with no entry in this track and no consent row yet.
  SELECT p.id INTO student FROM public.user_profiles p
   WHERE p.role='student' AND p.school_id = s_id
     AND public.isc_class_is_eligible(p.school_class)
     AND NOT EXISTS (SELECT 1 FROM public.isc_entry_members m
                      WHERE m.user_id = p.id AND m.track = 'ai_for_impact')
   ORDER BY p.id LIMIT 1;

  DELETE FROM public.isc_consent WHERE student_id = student;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', student,'role','authenticated')::text, true);

  out_txt := format('1) has_consent before = %s (want false)', public.isc_has_consent()) || chr(10);

  SELECT public.isc_start_entry('ai_for_impact') INTO res;
  e_id := (res->>'entry_id')::uuid;
  PERFORM public.isc_save_entry(e_id, '{"app_url":"https://a.example.com","language":"English"}'::jsonb);

  SELECT public.isc_submit_entry(e_id) INTO res;
  out_txt := out_txt || format('2) submit without consent -> %s (want consent_required)', res->>'error') || chr(10);

  SELECT public.isc_give_consent('   ') INTO res;
  out_txt := out_txt || format('3) blank guardian name -> %s (want guardian_name_required)', res->>'error') || chr(10);

  SELECT public.isc_give_consent('Priya Sharma') INTO res;
  out_txt := out_txt || format('4) give consent -> ok=%s (want true)', res->>'ok') || chr(10);
  out_txt := out_txt || format('5) has_consent after = %s (want true)', public.isc_has_consent()) || chr(10);

  SELECT public.isc_submit_entry(e_id) INTO res;
  out_txt := out_txt || format('6) submit with consent -> ok=%s (want true)', res->>'ok') || chr(10);

  -- Consent is per student per season, so a SECOND track needs no new consent.
  SELECT public.isc_start_entry('content_creator') INTO res;
  e_id := (res->>'entry_id')::uuid;
  PERFORM public.isc_save_entry(e_id, '{"video_url":"https://youtu.be/x","title":"t","theme_note":"n","language":"Hindi"}'::jsonb);
  SELECT public.isc_submit_entry(e_id) INTO res;
  out_txt := out_txt || format('7) second track needs no new consent -> ok=%s (want true)', res->>'ok') || chr(10);

  -- Giving consent twice keeps one row and the original timestamp.
  SELECT public.isc_give_consent('Someone Else') INTO res;
  out_txt := out_txt || format('8) consent rows for this student = %s (want 1)',
    (SELECT count(*) FROM public.isc_consent WHERE student_id = student)) || chr(10);
  out_txt := out_txt || format('9) guardian name unchanged = %s (want Priya Sharma)',
    (SELECT guardian_name FROM public.isc_consent WHERE student_id = student)) || chr(10);

  -- A coordinator is not a student and cannot consent.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT id FROM public.user_profiles WHERE role='coordinator' LIMIT 1),
                      'role','authenticated')::text, true);
  SELECT public.isc_give_consent('Anyone') INTO res;
  out_txt := out_txt || format('10) coordinator gives consent -> %s (want not_student)', res->>'error') || chr(10);

  RAISE EXCEPTION '%', chr(10) || out_txt;
END $$;
```

Run: `powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/t53.sql"`

Expected, each matching its `(want …)`: `false`; `consent_required`; `guardian_name_required`; `ok=true`; `true`; `ok=true`; **second track submits with no new consent**; exactly `1` consent row; the name still `Priya Sharma`; and `not_student` for a coordinator.

- [ ] **Step 5: Update the database types**

In `src/lib/types/database.ts`, add to `Tables`:

```ts
      isc_consent: {
        Row: {
          id: string
          student_id: string
          season: string
          guardian_name: string
          given_at: string
        }
        Insert: {
          id?: string
          student_id: string
          season?: string
          guardian_name: string
          given_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          season?: string
          guardian_name?: string
          given_at?: string
        }
        Relationships: []
      }
```

In `Functions`, add the two new entries and **change** `isc_submit_entry` to drop `p_consent`:

```ts
      isc_has_consent: { Args: Record<string, never>; Returns: boolean }
      isc_give_consent: { Args: { p_guardian_name: string }; Returns: Json }
      isc_submit_entry: { Args: { p_entry_id: string }; Returns: Json }
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`

Expected: **exactly one error**, in `src/app/actions/isc.ts`, because the existing `isc_submit_entry` call still passes `p_consent`. Leave it — Task 7 removes it. If any other file errors, stop and investigate; nothing else should reference that argument.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "feat: one-time seasonal ISC consent"
```

---

### Task 2: Track identity, prizes, language

Pure data plus one validation rule, so it is unit-testable and drives every screen that follows.

**Files:**
- Modify: `src/lib/isc/tracks.ts`
- Modify: `src/lib/isc/validate.ts`
- Test: `src/lib/isc/__tests__/language.test.ts`

**Interfaces:**
- Consumes: `IscTrack`, `TRACK_FIELDS`, `validateSubmission` (all exist).
- Produces: `ISC_SEASON: string`; `LANGUAGE_OPTIONS: string[]`; `IscTrack` gains `icon: LucideIcon`, `gradient: string`, `tint: string`, `accent: string`, `prize: string`, `prepare: string[]`; `PUZZLE_MASTER` gains the same visual fields plus `divisions: string`; `validateSubmission` now also requires a valid `language`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/isc/__tests__/language.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ISC_TRACKS, PUZZLE_MASTER, LANGUAGE_OPTIONS, ISC_SEASON } from '../tracks'
import { validateSubmission } from '../validate'

const completeAi = {
  app_url: 'https://myapp.example.com',
  demo_video_url: 'https://youtu.be/abc',
  explanation: 'x'.repeat(150),
  language: 'English',
}

describe('language', () => {
  it('offers exactly English and Hindi', () => {
    expect(LANGUAGE_OPTIONS).toEqual(['English', 'Hindi'])
  })

  it('accepts a submission that names a language', () => {
    expect(validateSubmission('ai_for_impact', completeAi)).toBeNull()
    expect(validateSubmission('ai_for_impact', { ...completeAi, language: 'Hindi' })).toBeNull()
  })

  it('rejects a submission with no language', () => {
    const { language: _omitted, ...rest } = completeAi
    expect(validateSubmission('ai_for_impact', rest)).toMatch(/language/i)
  })

  it('rejects a language that is not offered', () => {
    expect(validateSubmission('ai_for_impact', { ...completeAi, language: 'French' })).toMatch(
      /language/i
    )
  })

  it('requires a language on every track, not just AI for Impact', () => {
    expect(
      validateSubmission('content_creator', {
        video_url: 'https://youtu.be/abc',
        title: 'My entry',
        theme_note: 'y'.repeat(80),
      })
    ).toMatch(/language/i)
  })
})

describe('track identity', () => {
  it('gives every track an icon, gradient, tint and accent', () => {
    for (const t of ISC_TRACKS) {
      expect(t.icon).toBeDefined()
      expect(t.gradient).toMatch(/^from-/)
      expect(t.tint).toMatch(/^from-/)
      expect(t.accent).toMatch(/^text-/)
    }
  })

  it('gives every track a prize line and something to prepare', () => {
    for (const t of ISC_TRACKS) {
      expect(t.prize.length).toBeGreaterThan(10)
      expect(t.prepare.length).toBeGreaterThan(0)
    }
  })

  it('gives Puzzle Master the same visual identity so its card matches', () => {
    expect(PUZZLE_MASTER.icon).toBeDefined()
    expect(PUZZLE_MASTER.gradient).toMatch(/^from-/)
    expect(PUZZLE_MASTER.divisions).toMatch(/5.*8/)
  })

  it('names the season once', () => {
    expect(ISC_SEASON).toBe('2026')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/language.test.ts`
Expected: FAIL — `LANGUAGE_OPTIONS` is not exported from `../tracks`.

- [ ] **Step 3: Extend the track definitions**

In `src/lib/isc/tracks.ts`, add the import at the top:

```ts
import { Cpu, Rocket, Video, Puzzle, type LucideIcon } from 'lucide-react'
```

Add above `ISC_TRACKS`:

```ts
/** The inaugural cycle. Consent, deadlines and rankings are all season-scoped. */
export const ISC_SEASON = '2026'

/** Entries are accepted in either language, on every track. */
export const LANGUAGE_OPTIONS = ['English', 'Hindi']
```

Extend the `IscTrack` interface with the visual and informational fields:

```ts
export interface IscTrack {
  id: IscTrackId
  slug: string
  name: string
  tagline: string
  brief: string
  /** The leader occupies one of these places. */
  maxTeamSize: number
  /** Visual identity, mirroring OFFERING_TYPE_META so ISC reads like the rest
      of the platform rather than a bolt-on. */
  icon: LucideIcon
  /** two-stop gradient for a solid icon badge */
  gradient: string
  /** soft card wash */
  tint: string
  /** solid text/accent colour class */
  accent: string
  /** What a national winner receives, from the Skill Fleet deck. */
  prize: string
  /** What the student actually needs to have ready before entering. */
  prepare: string[]
}
```

Replace the three entries in `ISC_TRACKS` with these, keeping the existing `id`/`slug`/`name`/`tagline`/`brief`/`maxTeamSize` values exactly as they are and adding the new fields:

```ts
export const ISC_TRACKS: IscTrack[] = [
  {
    id: 'ai_for_impact',
    slug: 'ai-for-impact',
    name: 'AI for Impact',
    tagline: 'Build something that helps people.',
    brief:
      'Build a working app or digital tool that tackles a social problem you care about, then show us how it works.',
    maxTeamSize: 3,
    icon: Cpu,
    gradient: 'from-primary to-primary-light',
    tint: 'from-primary/[0.08]',
    accent: 'text-primary',
    prize:
      'All three national winners get enterprise-grade deployment and scalability support for their app, plus social-media visibility.',
    prepare: [
      'A working app or prototype, live on a link anyone can open',
      'A demo video of one minute or less',
      'A short written explanation of the problem and how you solved it',
    ],
  },
  {
    id: 'entrepreneurship',
    slug: 'entrepreneurship',
    name: 'Young Entrepreneurship Challenge',
    tagline: 'Turn an idea into a business.',
    brief:
      'Develop an original startup idea: the problem it solves, who it is for, and how you would actually bring it to market.',
    maxTeamSize: 3,
    icon: Rocket,
    gradient: 'from-accent-teal to-primary',
    tint: 'from-accent-teal/[0.08]',
    accent: 'text-accent-teal',
    prize: 'The national winner receives funding of up to ₹1 lakh to take the idea forward.',
    prepare: [
      'Your idea written out: problem, solution, who it is for, and why it works',
      'How it would make money',
      'A pitch video of one minute or less',
    ],
  },
  {
    id: 'content_creator',
    slug: 'content-creator',
    name: 'Content Creator Championship',
    tagline: 'Tell a story in sixty seconds.',
    brief:
      'Create an original one-minute video answering this year\u2019s theme. Your work, your voice.',
    maxTeamSize: 3,
    icon: Video,
    gradient: 'from-accent-pink to-accent-purple',
    tint: 'from-accent-pink/[0.08]',
    accent: 'text-accent-pink',
    prize:
      'The top three national winners become brand ambassadors and feature in digital campaigns for participating brands.',
    prepare: [
      'An original video of one minute or less, on a link anyone can open',
      'A title for it',
      'A short note on how it answers the theme',
    ],
  },
]
```

Replace `PUZZLE_MASTER` so its card can carry the same identity:

```ts
/**
 * Shown on /isc as a fourth card, but not enterable here: Brainweave is
 * expected to design and host the game itself. It still gets full visual
 * identity so the fourth card does not look like a broken version of the
 * other three.
 */
export const PUZZLE_MASTER = {
  name: 'Puzzle Master',
  tagline: 'Logic, speed and nerve \u2014 played live.',
  note: 'Coming soon',
  icon: Puzzle,
  gradient: 'from-accent-yellow to-accent-pink',
  tint: 'from-accent-yellow/[0.08]',
  accent: 'text-accent-yellow',
  divisions: 'Two divisions: Classes 5\u20138 and Classes 9\u201312',
  prize:
    'A shared ₹2 lakh pool across both divisions \u2014 ₹1 lakh in gifts or devices and ₹1 lakh in scholarships.',
}
```

Finally, add `language` to every track's field list. **Rename the existing `export const TRACK_FIELDS` to `const BASE_TRACK_FIELDS`** (drop the `export`), leaving its three entries untouched, then add this immediately below it:

```ts
/**
 * Every track asks the same language question, so it is declared once rather
 * than repeated three times. The deck requires entries in English or Hindi
 * across all four tracks.
 */
const LANGUAGE_FIELD: FieldSpec = {
  key: 'language',
  label: 'Language of your entry',
  kind: 'select',
  options: LANGUAGE_OPTIONS,
  help: 'Entries are accepted in English or Hindi.',
}

/**
 * Composed rather than mutated: pushing into the base object at module load
 * would append a duplicate language field every time the module re-evaluates
 * under dev hot-reload.
 */
export const TRACK_FIELDS: Record<IscTrackId, FieldSpec[]> = Object.fromEntries(
  Object.entries(BASE_TRACK_FIELDS).map(([track, specs]) => [track, [...specs, LANGUAGE_FIELD]])
) as Record<IscTrackId, FieldSpec[]>
```

And extend `FieldSpec` to know about a select:

```ts
export interface FieldSpec {
  key: string
  label: string
  kind: 'url' | 'text' | 'textarea' | 'select'
  min?: number
  max?: number
  help?: string
  /** Only for kind: 'select'. */
  options?: string[]
}
```

- [ ] **Step 4: Teach the validator about selects**

In `src/lib/isc/validate.ts`, inside `validateField`, add this branch immediately after the `url` branch and before the empty check:

```ts
  if (spec.kind === 'select') {
    if (!value) return `${spec.label}: please choose one.`
    if (spec.options && !spec.options.includes(value)) {
      return `${spec.label}: choose ${spec.options.join(' or ')}.`
    }
    return null
  }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/isc/`
Expected: PASS — the 18 existing tests plus the 9 new ones.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: still exactly the one known `isc.ts` error from Task 1, and nothing new.

```bash
git add src/lib/isc/tracks.ts src/lib/isc/validate.ts src/lib/isc/__tests__/language.test.ts
git commit -m "feat: ISC track identity, prizes and entry language"
```

---

### Task 3: Redesigned track card

**Files:**
- Modify: `src/components/isc/track-card.tsx`

**Interfaces:**
- Consumes: Task 2's `icon`, `gradient`, `tint`, `accent`.
- Produces: `TrackCard` now takes `icon`, `gradient`, `tint`, `accent` alongside its existing props; `TrackCardState` is unchanged.

- [ ] **Step 1: Rewrite the card**

Replace the whole of `src/components/isc/track-card.tsx`:

```tsx
import Link from 'next/link'
import { ArrowRight, Lock, type LucideIcon } from 'lucide-react'

export type TrackCardState = 'not_started' | 'draft' | 'submitted' | 'coming_soon' | 'closed'

const STATE_LABEL: Record<TrackCardState, string> = {
  not_started: 'Open to enter',
  draft: 'Draft saved',
  submitted: 'Submitted',
  coming_soon: 'Coming soon',
  closed: 'Entries closed',
}

const STATE_CLASS: Record<TrackCardState, string> = {
  not_started: 'bg-black/[0.05] text-muted',
  draft: 'bg-accent-yellow/15 text-accent-yellow',
  submitted: 'bg-green-50 text-green-700',
  coming_soon: 'bg-black/[0.05] text-muted',
  closed: 'bg-black/[0.05] text-muted',
}

export function TrackCard({
  name,
  tagline,
  state,
  href,
  teamNote,
  icon: Icon,
  gradient,
  tint,
  accent,
}: {
  name: string
  tagline: string
  state: TrackCardState
  href?: string
  teamNote: string
  icon: LucideIcon
  gradient: string
  tint: string
  accent: string
}) {
  const body = (
    <div className="clay-card p-0 h-full flex flex-col overflow-hidden">
      {/* Tinted head carrying the track's colour, so the four cards are told
          apart at a glance rather than by reading their titles. */}
      <div className={`relative bg-gradient-to-br ${tint} to-transparent p-5 pb-4`}>
        <div className="flex items-start justify-between gap-3">
          <span
            className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
          >
            <Icon className="w-5 h-5 text-white" />
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${STATE_CLASS[state]}`}
          >
            {STATE_LABEL[state]}
          </span>
        </div>
        <h2 className="font-display text-lg font-bold text-foreground leading-snug mt-3">{name}</h2>
      </div>

      <div className="flex flex-col flex-1 px-5 pb-5">
        <p className="text-sm text-muted flex-1">{tagline}</p>
        <div className="flex items-center justify-between gap-3 pt-3 mt-auto">
          <span className="text-xs text-muted inline-flex items-center gap-1.5">
            {state === 'coming_soon' && <Lock className="w-3 h-3" />}
            {teamNote}
          </span>
          {href && (
            <span className={`text-xs font-semibold inline-flex items-center gap-1 ${accent}`}>
              View
              <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (!href) return <div className="opacity-75">{body}</div>
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  )
}
```

Note `clay-card` already supplies its own hover lift, so the card does not add a competing transform.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: the known `isc.ts` error, **plus** errors in `src/app/(platform)/isc/page.tsx` for the four new required props. Task 4 supplies them.

- [ ] **Step 3: Commit**

```bash
git add src/components/isc/track-card.tsx
git commit -m "feat: give ISC track cards a visual identity"
```

---

### Task 4: The ISC 2026 overview page

**Files:**
- Create: `src/components/isc/how-it-works.tsx`
- Modify: `src/app/(platform)/isc/page.tsx`

**Interfaces:**
- Consumes: Task 2's track fields, Task 3's `TrackCard` props.
- Produces: `HowItWorks` — a stateless three-stage strip, no props.

- [ ] **Step 1: Write the how-it-works strip**

Create `src/components/isc/how-it-works.tsx`:

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
        <div key={s.n} className="clay-card p-5 relative">
          <span className="font-display text-2xl font-bold text-primary/25">{s.n}</span>
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

- [ ] **Step 2: Rebuild the overview page**

Replace the return block of `src/app/(platform)/isc/page.tsx`, keeping the data-fetching above it exactly as it is, and updating the imports:

```tsx
import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { ISC_TRACKS, PUZZLE_MASTER } from '@/lib/isc/tracks'
import { isEligibleClass } from '@/lib/isc/validate'
import { getMyIscEntries } from '@/app/actions/isc'
import { TrackCard, type TrackCardState } from '@/components/isc/track-card'
import { HowItWorks } from '@/components/isc/how-it-works'
```

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="International Skill Championship"
        icon={Trophy}
        title="ISC 2026"
        subtitle="Four championships, open to Classes 5 to 12. Enter as many as you like — school screening is free."
      />

      {!eligible && (
        <Reveal delay={0.05}>
          <div className="clay-card p-6 flex items-start gap-4">
            <span className="w-11 h-11 rounded-2xl bg-black/[0.05] flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-muted" />
            </span>
            <div>
              <p className="font-display font-bold text-foreground">Not open to your class yet</p>
              <p className="text-sm text-muted mt-1">
                ISC 2026 is for{' '}
                <span className="font-semibold text-foreground">Classes 5 to 12</span>.
                {profile?.school_class
                  ? ` Your profile says ${profile.school_class}, so you can’t enter this cycle — but you can still read what each championship involves.`
                  : ' Add your class to your profile to check whether you can enter.'}
              </p>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.08}>
        <HowItWorks />
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2">
        {ISC_TRACKS.map((track, i) => {
          const entry = byTrack.get(track.id)
          const state: TrackCardState = !eligible
            ? 'not_started'
            : entry?.status === 'submitted'
              ? 'submitted'
              : entry
                ? 'draft'
                : 'not_started'
          return (
            <Reveal key={track.id} delay={0.1 + i * 0.05} className="h-full">
              <TrackCard
                name={track.name}
                tagline={track.tagline}
                state={state}
                href={eligible ? `/isc/${track.slug}` : undefined}
                teamNote={`On your own or a team of up to ${track.maxTeamSize}`}
                icon={track.icon}
                gradient={track.gradient}
                tint={track.tint}
                accent={track.accent}
              />
            </Reveal>
          )
        })}

        <Reveal delay={0.25} className="h-full">
          <TrackCard
            name={PUZZLE_MASTER.name}
            tagline={PUZZLE_MASTER.tagline}
            state="coming_soon"
            teamNote="Individual only"
            icon={PUZZLE_MASTER.icon}
            gradient={PUZZLE_MASTER.gradient}
            tint={PUZZLE_MASTER.tint}
            accent={PUZZLE_MASTER.accent}
          />
        </Reveal>
      </div>
    </div>
  )
```

`Reveal` renders a `div`, so each card is wrapped rather than the grid, keeping the stagger while preserving the grid layout. It needs `className="h-full"` — without it the wrapper collapses to its content and the four cards stop lining up.

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: tsc reports only the known `isc.ts` consent error; `✓ Compiled successfully`.

- [ ] **Step 4: Look at it**

Start `npm run dev`, sign in as an eligible student (`maya@gmail.com` / `12345678`, Class 9) and open `/isc`.

Expected: four cards, each with a coloured gradient icon badge and a tinted head — AI purple, Entrepreneurship teal, Content Creator pink, Puzzle Master yellow. The three-stage strip sits above them with "Free to enter" highlighted on stage 01. Puzzle Master is dimmed with a padlock and no "View".

Take a screenshot and check it reads as part of the same product as `/catalog`.

- [ ] **Step 5: Commit**

```bash
git add src/components/isc/how-it-works.tsx "src/app/(platform)/isc/page.tsx"
git commit -m "feat: ISC overview page with stage strip and track identity"
```

---

### Task 5: Track detail page, and no more phantom drafts

The structural change: visiting a track describes it; entering is an explicit act.

**Files:**
- Create: `src/components/isc/track-hero.tsx`
- Create: `src/components/isc/track-facts.tsx`
- Create: `src/components/isc/enter-track-button.tsx`
- Modify: `src/app/(platform)/isc/[track]/page.tsx`
- Modify: `src/app/actions/isc.ts`

**Interfaces:**
- Consumes: Task 2's track fields; `getMyIscEntries`, `getIscEntry`, `getTrackDeadline`, `ensureIscEntry` (all exist).
- Produces: `TrackHero`; `TrackFacts`; `EnterTrackButton`; and in `src/app/actions/isc.ts` two additions — `type StartState = { error?: string } | undefined`, `startEntryAction(prev: StartState, formData: FormData) → StartState` (reads `slug` from a hidden field, creates the draft, then redirects back to the track page), and `hasIscConsent() → Promise<boolean>`.

- [ ] **Step 1: Add the deliberate start action**

`ensureIscEntry` stays as-is and is still used once an entry exists. Add this to the end of `src/app/actions/isc.ts`:

```ts
export type StartState = { error?: string } | undefined

/**
 * The "Enter this track" click. Unlike ensureIscEntry this IS a mutation, so
 * it may revalidate and redirect — the track page must never create a draft
 * during render, or merely browsing the four tracks would leave phantom
 * entries in the admin list and on the coordinator roster.
 *
 * Takes (prev, formData) like every other action in this file: passed straight
 * to useActionState, its redirect is handled by Next rather than thrown inside
 * a client closure.
 */
export async function startEntryAction(
  _prev: StartState,
  formData: FormData
): Promise<StartState> {
  const slug = ((formData.get('slug') as string) ?? '').trim()
  const track = trackBySlug(slug)
  if (!track) return { error: 'Unknown track.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_start_entry', { p_track: track.id })
  if (error) return { error: iscError(undefined) }

  const result = data as { ok: boolean; error?: string }
  if (!result?.ok) return { error: iscError(result?.error) }

  revalidatePath('/isc')
  revalidatePath(`/isc/${slug}`)
  redirect(`/isc/${slug}`)
}
```

Add `redirect` back to the imports at the top of the file:

```ts
import { redirect } from 'next/navigation'
```

- [ ] **Step 2: Write the hero**

Create `src/components/isc/track-hero.tsx`:

```tsx
import Link from 'next/link'
import { ArrowLeft, CalendarClock, Users, type LucideIcon } from 'lucide-react'

export function TrackHero({
  name,
  brief,
  icon: Icon,
  gradient,
  tint,
  maxTeamSize,
  deadlineLabel,
  daysLeft,
}: {
  name: string
  brief: string
  icon: LucideIcon
  gradient: string
  tint: string
  maxTeamSize: number
  deadlineLabel: string | null
  daysLeft: number | null
}) {
  return (
    <div className="space-y-4">
      <Link
        href="/isc"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        All tracks
      </Link>

      <div className={`clay-card p-0 overflow-hidden`}>
        <div className={`bg-gradient-to-br ${tint} to-transparent p-6`}>
          <div className="flex items-start gap-4">
            <span
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
            >
              <Icon className="w-6 h-6 text-white" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground leading-tight">
                {name}
              </h1>
              <p className="text-muted mt-1.5 max-w-2xl">{brief}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/70 text-foreground">
              <Users className="w-3.5 h-3.5" />
              On your own or a team of up to {maxTeamSize}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/70 text-foreground">
              English or Hindi
            </span>
            {deadlineLabel && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                  daysLeft !== null && daysLeft <= 7
                    ? 'bg-red-50 text-red-600'
                    : 'bg-white/70 text-foreground'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                {daysLeft !== null && daysLeft >= 0
                  ? `Closes ${deadlineLabel} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                  : `Closed ${deadlineLabel}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write the facts panel**

Create `src/components/isc/track-facts.tsx`:

```tsx
import { Check, Trophy } from 'lucide-react'

export function TrackFacts({
  prize,
  prepare,
  accent,
}: {
  prize: string
  prepare: string[]
  accent: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="clay-card p-5">
        <h2 className="font-display font-bold text-foreground inline-flex items-center gap-2">
          <Trophy className={`w-4 h-4 ${accent}`} />
          What the winners get
        </h2>
        <p className="text-sm text-muted mt-2">{prize}</p>
        <p className="text-xs text-muted mt-3">
          Everyone who enters receives a digital participation certificate.
        </p>
      </div>

      <div className="clay-card p-5">
        <h2 className="font-display font-bold text-foreground">What you’ll need</h2>
        <ul className="mt-2 space-y-2">
          {prepare.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted">
              <Check className={`w-4 h-4 mt-0.5 shrink-0 ${accent}`} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write the enter button**

Create `src/components/isc/enter-track-button.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { startEntryAction, type StartState } from '@/app/actions/isc'

export function EnterTrackButton({ slug, needsConsent }: { slug: string; needsConsent: boolean }) {
  const [state, action, pending] = useActionState<StartState, FormData>(
    startEntryAction,
    undefined
  )

  // Consent is a one-time step for the season, so it is asked before the first
  // entry rather than on every form. Sending them there first means the draft
  // is only created once they have actually agreed.
  if (needsConsent) {
    return (
      <Link
        href={`/isc/consent?next=${encodeURIComponent(`/isc/${slug}`)}`}
        className="clay-button bg-cta text-white px-6 h-12 text-sm font-semibold inline-flex items-center gap-2"
      >
        Enter this track
        <ArrowRight className="w-4 h-4" />
      </Link>
    )
  }

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white px-6 h-12 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
      >
        {pending ? 'Opening…' : 'Enter this track'}
        <ArrowRight className="w-4 h-4" />
      </button>
      {state?.error && <p className="text-sm text-red-600 mt-2">{state.error}</p>}
    </form>
  )
}
```

- [ ] **Step 5: Add the consent read the page needs**

Append to `src/app/actions/isc.ts`. It must exist before the page below imports it:

```ts
/** Has this student already given consent for the season? */
export async function hasIscConsent(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('isc_has_consent')
  return data === true
}
```

- [ ] **Step 6: Rebuild the track page**

Replace `src/app/(platform)/isc/[track]/page.tsx` entirely:

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { trackBySlug } from '@/lib/isc/tracks'
import { isEligibleClass, isTrackLocked } from '@/lib/isc/validate'
import { getMyIscEntries, getIscEntry, getTrackDeadline, hasIscConsent } from '@/app/actions/isc'
import { EntryForm } from '@/components/isc/entry-form'
import { TeamPanel } from '@/components/isc/team-panel'
import { TrackHero } from '@/components/isc/track-hero'
import { TrackFacts } from '@/components/isc/track-facts'
import { EnterTrackButton } from '@/components/isc/enter-track-button'

export default async function IscTrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track: slug } = await params
  const track = trackBySlug(slug)
  if (!track) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('school_class')
    .eq('id', user.id)
    .single()
  if (!isEligibleClass(profile?.school_class)) redirect('/isc')

  // Read-only: browsing a track must not create anything. The draft is made
  // only when the student presses "Enter this track".
  const mine = await getMyIscEntries()
  const existing = mine.find((e) => e.track === track.id)
  const entry = existing ? await getIscEntry(existing.entryId) : null

  const deadline = await getTrackDeadline(track.id)
  const locked = isTrackLocked(deadline ?? '', new Date())
  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null
  const daysLeft = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
    : null

  const consentGiven = await hasIscConsent()

  return (
    <div className="space-y-6">
      <TrackHero
        name={track.name}
        brief={track.brief}
        icon={track.icon}
        gradient={track.gradient}
        tint={track.tint}
        maxTeamSize={track.maxTeamSize}
        deadlineLabel={deadlineLabel}
        daysLeft={daysLeft}
      />

      <TrackFacts prize={track.prize} prepare={track.prepare} accent={track.accent} />

      {!entry ? (
        <div className="clay-card p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="font-display font-bold text-foreground">
              {locked ? 'Entries have closed' : 'Ready when you are'}
            </p>
            <p className="text-sm text-muted mt-1">
              {locked
                ? 'The screening deadline for this track has passed.'
                : 'Nothing is submitted until you say so — you can save a draft and come back.'}
            </p>
          </div>
          {!locked && <EnterTrackButton slug={track.slug} needsConsent={!consentGiven} />}
        </div>
      ) : (
        <>
          <TeamPanel
            entryId={entry.entryId}
            slug={track.slug}
            members={entry.members}
            maxTeamSize={track.maxTeamSize}
            canEdit={entry.isLeader && !locked}
          />

          <EntryForm
            entryId={entry.entryId}
            track={entry.track}
            submission={entry.submission}
            status={entry.status}
            locked={locked}
            canEdit={entry.isLeader}
          />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: only the known `isc.ts` consent-argument error remains; `✓ Compiled successfully`.

- [ ] **Step 8: Confirm browsing creates nothing**

Note the current entry count:

Write `$SP/count-isc.sql`:

```sql
SELECT 'entries: ' || count(*)::text AS r FROM public.isc_entries;
```

Run it, then in the browser as an eligible student visit `/isc/ai-for-impact` and `/isc/entrepreneurship` **without pressing anything**, then run it again.

Expected: **the count is unchanged.** Before this task, each visit created a draft. Also expected on screen: the coloured hero with team/language/deadline badges, the prize and "what you'll need" panels, and a "Ready when you are" card with the button — no form yet.

- [ ] **Step 9: Commit**

```bash
git add src/components/isc/track-hero.tsx src/components/isc/track-facts.tsx src/components/isc/enter-track-button.tsx "src/app/(platform)/isc/[track]/page.tsx" src/app/actions/isc.ts
git commit -m "feat: ISC track detail page; entering is now deliberate"
```

---

### Task 6: The consent screen

**Files:**
- Create: `src/components/isc/consent-form.tsx`
- Create: `src/app/(platform)/isc/consent/page.tsx`
- Modify: `src/app/actions/isc.ts`

**Interfaces:**
- Consumes: Task 1's `isc_give_consent`; `get_my_family` (exists).
- Produces: `giveConsentAction(prev, formData) → ConsentState` where `type ConsentState = { error?: string } | undefined`; `ConsentForm`; route `/isc/consent`.

- [ ] **Step 1: Add the action**

Append to `src/app/actions/isc.ts`:

```ts
export type ConsentState = { error?: string } | undefined

const CONSENT_ERR: Record<string, string> = {
  not_student: 'Only student accounts can enter ISC.',
  guardian_name_required: 'Please give your parent or guardian’s name.',
}

export async function giveConsentAction(
  _prev: ConsentState,
  formData: FormData
): Promise<ConsentState> {
  const guardianName = ((formData.get('guardian_name') as string) ?? '').trim()
  const next = ((formData.get('next') as string) ?? '/isc').trim()
  if (!guardianName) return { error: CONSENT_ERR.guardian_name_required }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_give_consent', {
    p_guardian_name: guardianName,
  })
  if (error) return { error: iscError(undefined) }

  const r = data as { ok: boolean; error?: string }
  if (!r?.ok) return { error: CONSENT_ERR[r?.error ?? ''] ?? iscError(r?.error) }

  revalidatePath('/isc')
  // Only ever an internal path: `next` comes from our own links, but refuse
  // anything that could send a student off-site.
  redirect(next.startsWith('/isc') ? next : '/isc')
}
```

- [ ] **Step 2: Write the form**

Create `src/components/isc/consent-form.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { giveConsentAction, type ConsentState } from '@/app/actions/isc'

export function ConsentForm({
  guardianName,
  next,
}: {
  guardianName: string
  next: string
}) {
  const [state, action, pending] = useActionState<ConsentState, FormData>(
    giveConsentAction,
    undefined
  )

  return (
    <form action={action} className="clay-card p-6 sm:p-8 space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            One thing before you enter
          </h1>
          <p className="text-sm text-muted mt-1">
            ISC is open to students under 18, so a parent or guardian needs to agree once before
            your first entry. You won’t be asked again this season.
          </p>
        </div>
      </div>

      <ul className="space-y-2 text-sm text-muted rounded-xl bg-black/[0.02] p-4">
        <li>• They agree to you taking part in ISC 2026.</li>
        <li>• They agree to Skill Fleet showing your entry for the championship and its promotion.</li>
        <li>• Your work stays yours — you keep ownership of everything you submit.</li>
        <li>• If you win, they agree to your name being announced.</li>
      </ul>

      <div>
        <label htmlFor="guardian_name" className="block text-sm font-medium text-foreground mb-1">
          Parent or guardian’s name
        </label>
        <input
          id="guardian_name"
          name="guardian_name"
          required
          defaultValue={guardianName}
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
        />
        <p className="text-xs text-muted mt-1">
          {guardianName
            ? 'Taken from your family details — change it if someone else is agreeing.'
            : 'The adult giving permission for you to take part.'}
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'My parent or guardian agrees'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Write the page**

Create `src/app/(platform)/isc/consent/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isEligibleClass } from '@/lib/isc/validate'
import { hasIscConsent } from '@/app/actions/isc'
import { ConsentForm } from '@/components/isc/consent-form'

export default async function IscConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const target = next && next.startsWith('/isc') ? next : '/isc'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('school_class')
    .eq('id', user.id)
    .single()
  if (!isEligibleClass(profile?.school_class)) redirect('/isc')

  // Already agreed this season — nothing to ask.
  if (await hasIscConsent()) redirect(target)

  // Pre-fill from the family record rather than asking for something we hold.
  const { data: familyRows } = await supabase.rpc('get_my_family')
  const guardianName = (familyRows ?? [])[0]?.parent_full_name ?? ''

  return (
    <div className="max-w-xl mx-auto">
      <ConsentForm guardianName={guardianName} next={target} />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: the known `isc.ts` consent-argument error only; `✓ Compiled successfully`; `/isc/consent` in the route list.

- [ ] **Step 5: Walk it**

Pick a student who has not consented. Clear their consent first:

Write `$SP/clear-consent.sql`:

```sql
DELETE FROM public.isc_consent
 WHERE student_id = (SELECT id FROM auth.users WHERE email = 'maya@gmail.com');
SELECT 'consent rows for maya: ' || count(*)::text AS r
  FROM public.isc_consent
 WHERE student_id = (SELECT id FROM auth.users WHERE email = 'maya@gmail.com');
```

Run it, then as that student open `/isc/ai-for-impact` and press **Enter this track**.

Expected: you land on `/isc/consent?next=/isc/ai-for-impact`, the guardian name is pre-filled from the family record, and the four bullet points are shown. Agreeing returns you to the track page, now showing the team panel and form.

Visit `/isc/consent` again directly. Expected: it redirects straight to `/isc` — already agreed, nothing to ask.

- [ ] **Step 6: Commit**

```bash
git add src/components/isc/consent-form.tsx "src/app/(platform)/isc/consent" src/app/actions/isc.ts
git commit -m "feat: one-time ISC guardian consent screen"
```

---

### Task 7: Language in the form, consent out of it

Deliberately last: until this lands the old checkbox is still there, so consent is never unenforceable in between.

**Files:**
- Modify: `src/components/isc/entry-form.tsx`
- Modify: `src/app/actions/isc.ts`

**Interfaces:**
- Consumes: Task 2's `kind: 'select'` and `options`; Task 1's one-argument `isc_submit_entry`.
- Produces: nothing new.

- [ ] **Step 1: Render the select and drop the checkbox**

In `src/components/isc/entry-form.tsx`, replace the field-rendering ternary so it handles three kinds:

```tsx
            {spec.kind === 'textarea' ? (
              <textarea
                id={spec.key}
                name={spec.key}
                defaultValue={value}
                rows={5}
                maxLength={spec.max}
                disabled={readOnly}
                className={`${INPUT} resize-y disabled:opacity-70`}
              />
            ) : spec.kind === 'select' ? (
              <select
                id={spec.key}
                name={spec.key}
                defaultValue={value}
                disabled={readOnly}
                className={`${INPUT} disabled:opacity-70`}
              >
                <option value="">Choose one</option>
                {(spec.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={spec.key}
                name={spec.key}
                type={spec.kind === 'url' ? 'url' : 'text'}
                defaultValue={value}
                maxLength={spec.max}
                disabled={readOnly}
                placeholder={spec.kind === 'url' ? 'https://' : undefined}
                className={`${INPUT} disabled:opacity-70`}
              />
            )}
```

Delete the consent block entirely — this whole element goes:

```tsx
      {!readOnly && (
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input type="checkbox" name="consent" className="mt-1" />
          <span>
            My parent or guardian agrees to my taking part, and to Skill Fleet showing this entry
            for the championship. The work stays mine.
          </span>
        </label>
      )}
```

and in its place, so the student can still see that consent is on file:

```tsx
      {!readOnly && (
        <p className="text-xs text-muted">
          Your parent or guardian already agreed to you entering ISC 2026.
        </p>
      )}
```

- [ ] **Step 2: Drop consent from the action**

In `src/app/actions/isc.ts`, inside `entryFormAction`, delete this line from the `intent === 'submit'` branch:

```ts
    if (formData.get('consent') !== 'on') return { error: iscError('consent_required') }
```

and change the submit call to the one-argument form:

```ts
  const { data, error } = await supabase.rpc('isc_submit_entry', {
    p_entry_id: entryId,
  })
```

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: **tsc now exits 0** — the known error from Task 1 is resolved. All tests pass. `✓ Compiled successfully`.

- [ ] **Step 4: Submit an entry end to end**

As a consented student, open a track, press **Enter this track**, fill every field including **Language**, and press **Submit entry**.

Expected: it submits with no consent checkbox anywhere on the form, and the language is stored. Confirm:

Write `$SP/v-lang.sql`:

```sql
SELECT e.track || ' | ' || e.status
       || ' | language=' || COALESCE(e.submission->>'language','MISSING')
       || ' | consent_row=' || EXISTS (
            SELECT 1 FROM public.isc_consent c WHERE c.student_id = e.created_by
          )::text AS r
  FROM public.isc_entries e
 ORDER BY e.updated_at DESC LIMIT 3;
```

Expected on the newest row: `submitted`, a real language, and `consent_row=true`.

Then try submitting with Language left unchosen. Expected: an inline error naming the language, and nothing submitted.

- [ ] **Step 5: Note the amendment on the spec**

Add this immediately below the `**Scope:**` line in `docs/superpowers/specs/2026-08-24-isc-2026-entries-design.md`, so the spec does not quietly contradict what shipped:

```markdown
> **Amended 2026-08-24** by `docs/superpowers/plans/2026-08-24-isc-polish-and-consent.md`:
> parental consent is now one confirmation per student per season rather than a
> tick on every entry form; `/isc/[track]` is a detail page with an explicit
> "Enter this track" step rather than going straight to the form; and every
> track additionally asks for the entry's language (English or Hindi).
```

- [ ] **Step 6: Commit**

```bash
git add src/components/isc/entry-form.tsx src/app/actions/isc.ts docs/superpowers/specs/2026-08-24-isc-2026-entries-design.md
git commit -m "feat: entry language; consent moves off the form"
```

---

## Done when

- The four track cards each carry their own colour and icon, and `/isc` reads as part of the same product as `/catalog`.
- `/isc` explains the three stages — free school screening, state round, national finals — rather than only listing tracks.
- Opening a track shows what it involves, what winners receive, what to prepare, and when entries close, with an explicit **Enter this track**.
- **Browsing tracks creates nothing.** The entry count is unchanged after visiting every track page.
- A student is asked for guardian consent **once per season**, before their first entry, and never again — not even when they enter a second or third track.
- Every entry records its language, and a submission without one is refused.
- Entries submitted before this change still count as consented, via the backfill.
- `npx tsc --noEmit`, `npx vitest run` and `npx next build` are all clean.
