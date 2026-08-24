# Coordinator Signup & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher can sign up as a school coordinator, claim their school, get admin-approved, and see a roster of every student already linked to that school.

**Architecture:** Signup is two steps, mirroring how student signup already works — an account-creation step the `handle_new_user()` trigger handles from metadata, then a school-selection step once logged in (`resolveSchoolId()` needs `auth.uid()` to defend against a tampered submission, which doesn't exist yet during `signUp()`). Admin review extends the existing `/admin/schools` queue rather than adding a new page. The dashboard ships real roster data today; its two status columns are wired for data that doesn't exist until later ISC work lands.

**Tech Stack:** Next.js 16 App Router · Supabase/PostgreSQL · TypeScript · Vitest

**Spec:** `docs/superpowers/specs/2026-08-22-coordinator-signup-design.md`

## Global Constraints

- **`AGENTS.md` applies:** this Next.js version has breaking changes from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing App Router code. `params`/`searchParams` are `Promise<{…}>`.
- **Supabase project is `bbioktywqkfvpzmakdxt` only.** Never touch `happyfleet`.
- **`supabase/` is gitignored.** Migrations are written and applied but **never** `git add`ed.
- **Migrations applied via the Management API:** `powershell -NoProfile -File <scratchpad>/sbq.ps1 -File <file.sql>`. MCP is disconnected.
- **Migration numbering continues from `0046`.**
- **All SECURITY DEFINER functions use `SET search_path = ''`** and schema-qualify every identifier.
- **Do not push, and do not touch `main`.** Work stays on `feature/nikhil`.
- **One coordinator per school for v1.** A second claim on an already-claimed school is refused, not queued.
- **A rejected coordinator claim resets cleanly** — `coordinator_id = NULL`, `coordinator_status = 'none'` — so the school can be claimed again by anyone, including the same person corrected.
- **Board pre-fills from the school, but the coordinator's submission always wins** — it is not merely a fallback for a blank field.
- **Rejecting a coordinator claim requires a reason,** same rule as rejecting a school.

---

## File Structure

**Created:**
| Path | Responsibility |
|---|---|
| `supabase/migrations/0047_coordinators.sql` | Role widened, `schools` gains 4 columns, `board` backfilled, 3 new RPCs, `handle_new_user()` branches for coordinators. *Not committed.* |
| `src/lib/coordinator/validate.ts` | Board/student-count option lists and validation — shared by the server action and the UI. |
| `src/app/(auth)/signup/coordinator/page.tsx` | Step 1: name, email, password, phone. |
| `src/app/actions/coordinator.ts` | Server actions: signup, school application, dashboard reads. |
| `src/app/onboarding/coordinator/page.tsx` | Step 2: school, board, student count. |
| `src/components/coordinator/coordinator-details-form.tsx` | The step-2 form. |
| `src/components/coordinator/school-board-field.tsx` | Board `SearchableSelect`, pre-filled from the picked school. |
| `src/app/(coordinator)/layout.tsx` | Guards on `role === 'coordinator'`; own sidebar. |
| `src/app/(coordinator)/coordinator/page.tsx` | The three states: pending / rejected / roster. |
| `src/components/coordinator/coordinator-nav.tsx` | Sidebar nav, mirrors `VendorNav`. |
| `src/components/coordinator/school-roster.tsx` | The approved-state roster table. |

**Modified:**
| Path | Change |
|---|---|
| `src/lib/types/database.ts` | 4 new `schools` columns; 3 new RPC signatures. |
| `src/app/actions/schools.ts` | `SchoolOption` gains `board`; `getSchoolsAction` selects it. |
| `src/app/(admin)/admin/schools/actions.ts` | New `reviewCoordinatorClaimAction`. |
| `src/app/(admin)/admin/schools/page.tsx` | Fetch and pass through coordinator claims (both cases). |
| `src/components/admin/school-review-row.tsx` | Renders an inline claim block when one is attached (Case A). |
| `src/components/admin/coordinator-claim-row.tsx` *(new)* | One claim on an already-approved school (Case B). |
| `src/app/(platform)/layout.tsx` | Redirect `coordinator` role to `/coordinator`. |
| `src/app/(auth)/login/page.tsx` | Add the coordinator-signup link. |

**Task order.** Tasks 1–3 are additive and invisible to users (schema, RPCs, the `SchoolOption.board` change — which also benefits nothing yet since no UI reads it). Task 4 is the two-step signup. Task 5 extends the admin queue. Task 6 is the coordinator's own dashboard. Task 7 wires the platform-layout redirect and the login-page link **last**, since only then can a real signup actually reach `/coordinator` end to end.

---

### Task 1: Schema, backfill, and the three RPCs

**Files:**
- Create: `supabase/migrations/0047_coordinators.sql` (not committed)
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Consumes: `public.schools`, `public.is_admin()`, `public.resolveSchoolId`'s underlying tables (both already exist).
- Produces: columns `schools.coordinator_id uuid`, `schools.coordinator_status text`, `schools.board text`, `schools.student_count_range text`; RPCs `apply_as_coordinator(p_school_id uuid, p_board text, p_student_count_range text) → text`, `admin_review_coordinator_claim(p_school_id uuid, p_decision text, p_notes text) → text`, `get_my_coordinator_school() → TABLE(school_id uuid, school_name text, coordinator_status text, review_notes text)`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0047_coordinators.sql`:

```sql
-- 0047: Coordinator signup — role, school claims, and the RPCs that drive them.
-- Every student already links to a real schools.id (0045/0046), so a coordinator
-- just needs to be linked to the same row; no join code is needed.

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role = ANY (ARRAY['student', 'admin', 'vendor', 'coordinator']));

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS coordinator_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coordinator_status  TEXT NOT NULL DEFAULT 'none'
                           CHECK (coordinator_status IN ('none', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS board                TEXT,
  ADD COLUMN IF NOT EXISTS student_count_range  TEXT;

-- The whole CBSE register is, by definition, CBSE. A coordinator's form
-- pre-fills from this instead of asking a question we already know the
-- answer to.
UPDATE public.schools SET board = 'CBSE' WHERE source = 'cbse' AND board IS NULL;

-- Signup writes role='student' unconditionally today. This branch keeps that
-- path byte-for-byte identical and adds a second one for coordinators, who
-- skip family creation entirely (family_id stays NULL — every function that
-- reads it already treats NULL as "not in a family").
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_dob          date;
  v_parent_email text;
  v_family_id    uuid;
  v_status       text := 'active';
BEGIN
  IF NEW.raw_user_meta_data->>'signup_type' = 'coordinator' THEN
    INSERT INTO public.user_profiles (id, role, full_name, phone, onboarding_completed)
    VALUES (
      NEW.id, 'coordinator',
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      true  -- the student-only onboarding quiz does not apply here
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;

  BEGIN
    v_dob := NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date;
  EXCEPTION WHEN others THEN
    v_dob := NULL;
  END;

  v_parent_email := lower(NULLIF(trim(NEW.raw_user_meta_data->>'parent_email'), ''));

  IF v_parent_email IS NOT NULL THEN
    SELECT f.id INTO v_family_id FROM public.families f
     WHERE lower(f.parent_email) = v_parent_email;

    IF v_family_id IS NULL THEN
      INSERT INTO public.families (parent_full_name, parent_email, parent_phone)
      VALUES (
        NULLIF(trim(NEW.raw_user_meta_data->>'parent_full_name'), ''),
        v_parent_email,
        NULLIF(trim(NEW.raw_user_meta_data->>'parent_phone'), '')
      )
      RETURNING id INTO v_family_id;
      v_status := 'active';
    ELSE
      v_status := 'pending';
    END IF;
  END IF;

  INSERT INTO public.user_profiles (
    id, role, full_name, date_of_birth, phone, onboarding_completed, family_id, family_status
  )
  VALUES (
    NEW.id, 'student',
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    v_dob,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    false, v_family_id, v_status
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

/**
 * Claim a school for ISC coordination, or update your own still-pending claim.
 * p_school_id must already be resolved (via resolveSchoolId, same as students
 * use) — this function trusts it, the same way every other RPC in this
 * project trusts a resolved id rather than re-deriving it from raw text.
 */
CREATE OR REPLACE FUNCTION public.apply_as_coordinator(
  p_school_id          UUID,
  p_board              TEXT,
  p_student_count_range TEXT
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role      text;
  v_existing  uuid;
  v_status    text;
  v_board     text := NULLIF(BTRIM(COALESCE(p_board, '')), '');
  v_count     text := NULLIF(BTRIM(COALESCE(p_student_count_range, '')), '');
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'coordinator' THEN RETURN 'forbidden'; END IF;
  IF v_board IS NULL OR v_count IS NULL THEN RETURN 'board_and_count_required'; END IF;

  SELECT coordinator_id, coordinator_status INTO v_existing, v_status
    FROM public.schools WHERE id = p_school_id;
  IF NOT FOUND THEN RETURN 'school_not_found'; END IF;

  IF v_status IN ('pending', 'approved') AND v_existing IS DISTINCT FROM auth.uid() THEN
    RETURN 'already_has_coordinator';
  END IF;

  UPDATE public.schools
     SET coordinator_id = auth.uid(),
         coordinator_status = 'pending',
         board = v_board,
         student_count_range = v_count
   WHERE id = p_school_id;

  RETURN 'pending';
END;
$$;

/** Approve or reject a pending coordinator claim. Mirrors admin_review_school. */
CREATE OR REPLACE FUNCTION public.admin_review_coordinator_claim(
  p_school_id UUID,
  p_decision  TEXT,   -- 'approve' | 'reject'
  p_notes     TEXT DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_notes TEXT := NULLIF(BTRIM(COALESCE(p_notes, '')), '');
BEGIN
  IF NOT public.is_admin() THEN RETURN 'forbidden'; END IF;

  IF p_decision = 'approve' THEN
    UPDATE public.schools SET coordinator_status = 'approved'
     WHERE id = p_school_id AND coordinator_status = 'pending';
    IF NOT FOUND THEN RETURN 'not_pending'; END IF;
    RETURN 'approved';

  ELSIF p_decision = 'reject' THEN
    IF v_notes IS NULL THEN RETURN 'notes_required'; END IF;
    UPDATE public.schools
       SET coordinator_id = NULL, coordinator_status = 'none'
     WHERE id = p_school_id AND coordinator_status = 'pending';
    IF NOT FOUND THEN RETURN 'not_pending'; END IF;
    RETURN 'rejected';
  END IF;

  RETURN 'bad_decision';
END;
$$;

/** The caller's own coordinator claim, in whichever state it is in. */
CREATE OR REPLACE FUNCTION public.get_my_coordinator_school()
RETURNS TABLE (school_id UUID, school_name TEXT, coordinator_status TEXT, review_notes TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT s.id, s.name, s.coordinator_status, s.review_notes
    FROM public.schools s
   WHERE s.coordinator_id = auth.uid();
$$;

/**
 * Every student at an approved coordinator's school, grouped for the roster.
 * role = 'student' is explicit rather than assumed — nothing else sets
 * school_id today, but this should not depend on that staying true by luck.
 */
CREATE OR REPLACE FUNCTION public.get_school_roster()
RETURNS TABLE (student_id UUID, full_name TEXT, school_class TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT p.id, p.full_name, p.school_class
    FROM public.user_profiles p
    JOIN public.schools s
      ON s.id = p.school_id
     AND s.coordinator_id = auth.uid()
     AND s.coordinator_status = 'approved'
   WHERE p.role = 'student'
   ORDER BY p.school_class NULLS LAST, p.full_name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.apply_as_coordinator(UUID, TEXT, TEXT)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_coordinator_claim(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_coordinator_school()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_roster()                           TO authenticated;
```

- [ ] **Step 2: Apply the migration**

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cp supabase/migrations/0047_coordinators.sql "$SP/m47.sql"
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/m47.sql"
```

Expected: no output.

- [ ] **Step 3: Verify the objects exist and the backfill landed**

```bash
cat > "$SP/v47.sql" <<'SQL'
SELECT 'role check: ' || pg_get_constraintdef(oid) AS r
  FROM pg_constraint WHERE conrelid='public.user_profiles'::regclass AND conname='user_profiles_role_check'
UNION ALL SELECT 'fns: ' || string_agg(p.proname, ',' ORDER BY p.proname)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
   AND p.proname IN ('apply_as_coordinator','admin_review_coordinator_claim','get_my_coordinator_school','get_school_roster')
UNION ALL SELECT 'schools cols: ' || string_agg(column_name, ',' ORDER BY column_name)
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='schools'
   AND column_name IN ('coordinator_id','coordinator_status','board','student_count_range')
UNION ALL SELECT 'cbse without board: ' || count(*)::text FROM public.schools WHERE source='cbse' AND board IS NULL
UNION ALL SELECT 'cbse with board: ' || count(*)::text FROM public.schools WHERE source='cbse' AND board='CBSE';
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v47.sql"
```

Expected: the role check includes `coordinator`; all four function names; all four column names; `cbse without board: 0`; `cbse with board: 32882` (or whatever the current CBSE-sourced count is).

- [ ] **Step 4: Verify the coordinator signup branch, both cases of the claim flow, and the roster gate — against the live database**

Everything below runs inside one transaction, rolled back at the end.

```bash
cat > "$SP/t47.sql" <<'SQL'
DO $$
DECLARE
  coord1 uuid := gen_random_uuid();
  coord2 uuid := gen_random_uuid();
  a_school uuid; res text; n int; out_txt text := '';
BEGIN
  -- Simulate the trigger's coordinator branch directly, the same way
  -- Supabase's own signUp() would invoke it.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', coord1, 'authenticated', 'authenticated',
    'coordtest1@example.invalid', 'x', now(), now(), now(), '{}'::jsonb,
    jsonb_build_object('signup_type','coordinator','full_name','Test Coordinator','phone','9999999999'),
    '', '', '', ''
  );
  SELECT role INTO out_txt FROM public.user_profiles WHERE id = coord1;
  out_txt := format('1) trigger branch role = %s (want coordinator)', out_txt) || E'\n';

  SELECT id INTO a_school FROM public.schools
   WHERE state='Maharashtra' AND district='Pune' AND review_status='approved' LIMIT 1;

  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', coord1,'role','authenticated')::text, true);

  SELECT public.apply_as_coordinator(a_school, 'CBSE', '301-600') INTO res;
  out_txt := out_txt || format('2) first claim -> %s (want pending)', res) || E'\n';

  -- Same coordinator resubmitting updates in place rather than being refused.
  SELECT public.apply_as_coordinator(a_school, 'CBSE', '601-1000') INTO res;
  out_txt := out_txt || format('3) resubmit own pending claim -> %s (want pending)', res) || E'\n';

  -- A student cannot apply.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT id FROM auth.users WHERE email='maya@gmail.com'),'role','authenticated')::text, true);
  SELECT public.apply_as_coordinator(a_school, 'CBSE', '1-100') INTO res;
  out_txt := out_txt || format('4) a student applies -> %s (want forbidden)', res) || E'\n';

  -- Roster is empty while the claim is only pending.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', coord1,'role','authenticated')::text, true);
  SELECT count(*) INTO n FROM public.get_school_roster();
  out_txt := out_txt || format('5) roster while pending = %s (want 0)', n) || E'\n';

  -- Admin approves. Roster now shows real students (Maya + Arjun are both Pune).
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT id FROM public.user_profiles WHERE role='admin' LIMIT 1),'role','authenticated')::text, true);
  SELECT public.admin_review_coordinator_claim(a_school, 'approve') INTO res;
  out_txt := out_txt || format('6) admin approves -> %s (want approved)', res) || E'\n';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', coord1,'role','authenticated')::text, true);
  SELECT count(*) INTO n FROM public.get_school_roster();
  out_txt := out_txt || format('7) roster once approved >= 1 = %s', n >= 1) || E'\n';

  -- A second coordinator cannot claim the same, already-approved school.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', coord2, 'authenticated', 'authenticated',
    'coordtest2@example.invalid', 'x', now(), now(), now(), '{}'::jsonb,
    jsonb_build_object('signup_type','coordinator','full_name','Second Coordinator'),
    '', '', '', ''
  );
  PERFORM set_config('request.jwt.claims', json_build_object('sub', coord2,'role','authenticated')::text, true);
  SELECT public.apply_as_coordinator(a_school, 'CBSE', '1-100') INTO res;
  out_txt := out_txt || format('8) second coordinator claims approved school -> %s (want already_has_coordinator)', res) || E'\n';

  -- Reject a fresh claim on a different school; must reset cleanly and not
  -- lock the school from a later, different applicant.
  DECLARE b_school uuid;
  BEGIN
    SELECT id INTO b_school FROM public.schools
     WHERE state='Karnataka' AND district='Bengaluru Urban' AND review_status='approved' LIMIT 1;
    SELECT public.apply_as_coordinator(b_school, 'CBSE', '1-100') INTO res;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', (SELECT id FROM public.user_profiles WHERE role='admin' LIMIT 1),'role','authenticated')::text, true);
    SELECT public.admin_review_coordinator_claim(b_school, 'reject', 'Could not verify affiliation') INTO res;
    out_txt := out_txt || format('9) reject -> %s (want rejected)', res) || E'\n';

    PERFORM set_config('request.jwt.claims', json_build_object('sub', coord2,'role','authenticated')::text, true);
    SELECT public.apply_as_coordinator(b_school, 'CBSE', '1-100') INTO res;
    out_txt := out_txt || format('10) different coordinator claims the rejected school -> %s (want pending)', res) || E'\n';
  END;

  RAISE EXCEPTION E'\n%', out_txt;
END $$;
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/t47.sql"
```

Expected, each matching its `(want …)`: trigger role `coordinator`; first claim `pending`; resubmit `pending`; student applies `forbidden`; roster while pending `0`; admin approves `approved`; roster once approved `true`; second coordinator on an approved school `already_has_coordinator`; reject `rejected`; a different coordinator claiming the now-reset school `pending`.

The `RAISE EXCEPTION` rolls every bit of this back — no test data persists.

- [ ] **Step 5: Add the database types**

In `src/lib/types/database.ts`, add to the `schools` `Row`/`Insert`/`Update` blocks: `coordinator_id: string | null`, `coordinator_status: string`, `board: string | null`, `student_count_range: string | null` (as `?` optional on Insert/Update).

Add to `Functions`:

```ts
      apply_as_coordinator: {
        Args: { p_school_id: string; p_board: string; p_student_count_range: string }
        Returns: string
      }
      admin_review_coordinator_claim: {
        Args: { p_school_id: string; p_decision: string; p_notes?: string | null }
        Returns: string
      }
      get_my_coordinator_school: {
        Args: Record<string, never>
        Returns: { school_id: string; school_name: string; coordinator_status: string; review_notes: string | null }[]
      }
      get_school_roster: {
        Args: Record<string, never>
        Returns: { student_id: string; full_name: string | null; school_class: string | null }[]
      }
```

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/lib/types/database.ts
git commit -m "feat: coordinator role, school claims, and their RPCs"
```

---

### Task 2: Board on `SchoolOption`

The board pre-fill needs the search results to actually carry the value — otherwise the coordinator's form has no way to know a picked school is already CBSE without a second round trip.

**Files:**
- Modify: `src/app/actions/schools.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `SchoolOption` gains `board: string | null`.

- [ ] **Step 1: Add the field**

In `src/app/actions/schools.ts`:

```ts
export interface SchoolOption {
  id: string
  name: string
  address: string | null
  pincode: string | null
  board: string | null
}
```

And in `getSchoolsAction`, add `board` to the selected columns:

```ts
    .select('id, name, address, pincode, board')
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: exit 0 (nothing consumes `board` yet — that's Task 3).

```bash
git add src/app/actions/schools.ts
git commit -m "feat: expose a school's board in search results"
```

---

### Task 3: Coordinator server actions

**Files:**
- Create: `src/lib/coordinator/validate.ts`
- Test: `src/lib/coordinator/__tests__/validate.test.ts`
- Create: `src/app/actions/coordinator.ts`

**Interfaces:**
- Consumes: `resolveSchoolId`, `SchoolOption` (Task 2); `parseSchoolSelection`, `validateSchoolSelection`, `SchoolSelection` (existing, unchanged).
- Produces: `BOARD_OPTIONS: string[]`, `STUDENT_COUNT_OPTIONS: string[]`, `validateCoordinatorApplication(board: string, studentCountRange: string) → string | null` (an error message, or `null` when valid); `signupCoordinatorAction(prev, formData) → AuthFormState`; `applyAsCoordinatorAction(prev, formData) → ApplyState` where `type ApplyState = { error?: string; success?: boolean } | undefined`; `interface MyCoordinatorSchool { schoolId: string; schoolName: string; status: string; reviewNotes: string | null }`; `getMyCoordinatorSchool(): Promise<MyCoordinatorSchool | null>`; `getSchoolRoster(): Promise<{ studentId: string; fullName: string | null; schoolClass: string | null }[]>`.

The board/student-count validation is pulled into its own tiny module rather than living inline in the server action — the same reasoning `src/lib/schools/validate.ts` already follows, and it's what makes this rule unit-testable without mocking Supabase.

- [ ] **Step 1: Write the failing test**

Create `src/lib/coordinator/__tests__/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateCoordinatorApplication, BOARD_OPTIONS, STUDENT_COUNT_OPTIONS } from '../validate'

describe('validateCoordinatorApplication', () => {
  it('accepts a listed board and a listed student count', () => {
    expect(validateCoordinatorApplication('CBSE', '301-600')).toBeNull()
  })

  it('accepts "Other" with a non-empty custom board', () => {
    expect(validateCoordinatorApplication('Deccan Board (custom)', '1-100')).toBeNull()
  })

  it('rejects an empty board', () => {
    expect(validateCoordinatorApplication('', '1-100')).toBe('Please select your board.')
  })

  it('rejects a missing student count', () => {
    expect(validateCoordinatorApplication('CBSE', '')).toBe('Please select the number of students.')
  })

  it('rejects a student count outside the fixed list', () => {
    expect(validateCoordinatorApplication('CBSE', '5000+')).toBe('Please select the number of students.')
  })

  it('exposes the options the UI renders from', () => {
    expect(BOARD_OPTIONS).toContain('CBSE')
    expect(STUDENT_COUNT_OPTIONS).toEqual(['1-100', '101-300', '301-600', '601-1000', '1000+'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/coordinator/__tests__/validate.test.ts`
Expected: FAIL — `Cannot find module '../validate'`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/coordinator/validate.ts`:

```ts
export const BOARD_OPTIONS = [
  'CBSE',
  'ICSE / ISC',
  'State Board',
  'IB (International Baccalaureate)',
  'IGCSE / Cambridge',
  'NIOS',
  'Other',
]

export const STUDENT_COUNT_OPTIONS = ['1-100', '101-300', '301-600', '601-1000', '1000+']

/**
 * Board accepts any non-empty string — "Other" reveals a free-text field
 * client-side (same escape-hatch shape as district/school), so the server
 * only rejects a blank submission, not an unrecognised value. Student count
 * is a fixed list with no escape hatch, so it must match exactly.
 */
export function validateCoordinatorApplication(board: string, studentCountRange: string): string | null {
  if (!board.trim()) return 'Please select your board.'
  if (!STUDENT_COUNT_OPTIONS.includes(studentCountRange)) return 'Please select the number of students.'
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/coordinator/__tests__/validate.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the server actions**

Create `src/app/actions/coordinator.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validatePassword } from '@/lib/validation/password'
import { validateMobile } from '@/lib/validation/mobile'
import { parseSchoolSelection, validateSchoolSelection } from '@/lib/schools/validate'
import { validateCoordinatorApplication } from '@/lib/coordinator/validate'
import { resolveSchoolId } from '@/app/actions/schools'
import type { AuthFormState } from '@/app/actions/auth'

function buildAuthRedirect(next: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`
}

/** Step 1 of coordinator signup: the account only. Mirrors signupAction's shape. */
export async function signupCoordinatorAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!email || !password || !fullName) {
    return { error: 'Name, email and password are all required.' }
  }
  const mobileError = validateMobile(phone ?? '')
  if (mobileError) return { error: mobileError }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const supabase = await createClient()
  const next = '/onboarding/coordinator'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { signup_type: 'coordinator', full_name: fullName, phone },
      emailRedirectTo: buildAuthRedirect(next),
    },
  })

  if (error) return { error: error.message }
  if (!data.session) {
    return { success: `We've sent a confirmation link to ${email}. Click it to finish creating your account, then sign in.` }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

  redirect(next)
}

export type ApplyState = { error?: string; success?: boolean } | undefined

/** Step 2: school, board, student count -> a pending claim. */
export async function applyAsCoordinatorAction(
  _prev: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  const selection = parseSchoolSelection(formData)
  const selectionError = validateSchoolSelection(selection)
  if (selectionError) return { error: selectionError }

  const board = (formData.get('board') as string)?.trim() ?? ''
  const studentCountRange = (formData.get('student_count_range') as string)?.trim() ?? ''
  const applicationError = validateCoordinatorApplication(board, studentCountRange)
  if (applicationError) return { error: applicationError }

  const resolved = await resolveSchoolId(selection)
  if ('error' in resolved) return { error: resolved.error }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('apply_as_coordinator', {
    p_school_id: resolved.schoolId,
    p_board: board,
    p_student_count_range: studentCountRange,
  })

  if (error) return { error: 'Could not submit your application. Please try again.' }
  if (data !== 'pending') return { error: 'Could not submit your application. Please try again.' }

  revalidatePath('/coordinator')
  return { success: true }
}

export interface MyCoordinatorSchool {
  schoolId: string
  schoolName: string
  status: string
  reviewNotes: string | null
}

export async function getMyCoordinatorSchool(): Promise<MyCoordinatorSchool | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_my_coordinator_school')
  const row = (
    (data ?? []) as { school_id: string; school_name: string; coordinator_status: string; review_notes: string | null }[]
  )[0]
  if (!row) return null
  return {
    schoolId: row.school_id,
    schoolName: row.school_name,
    status: row.coordinator_status,
    reviewNotes: row.review_notes,
  }
}

export async function getSchoolRoster() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_school_roster')
  return (
    (data ?? []) as { student_id: string; full_name: string | null; school_class: string | null }[]
  ).map((r) => ({ studentId: r.student_id, fullName: r.full_name, schoolClass: r.school_class }))
}
```

- [ ] **Step 6: Typecheck and run the full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc exit 0; all tests pass, including the 6 new ones.

- [ ] **Step 7: Verify signup and the application flow through the server actions against the live database**

This exercises the actions as real HTTP calls would, not just the RPCs directly.

```bash
cat > "$SP/t47b.sql" <<'SQL'
SELECT 'coordinators today: ' || count(*)::text AS r FROM public.user_profiles WHERE role='coordinator';
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/t47b.sql"
```

Expected: `coordinators today: 0` — confirms no coordinator accounts exist yet, a clean baseline before Task 4's browser walkthrough creates the first real one.

- [ ] **Step 8: Commit**

```bash
git add src/lib/coordinator/validate.ts src/lib/coordinator/__tests__/validate.test.ts src/app/actions/coordinator.ts
git commit -m "feat: coordinator signup and dashboard server actions"
```

---

### Task 4: The two-step signup UI

**Files:**
- Create: `src/app/(auth)/signup/coordinator/page.tsx`
- Create: `src/components/coordinator/school-board-field.tsx`
- Create: `src/components/coordinator/coordinator-details-form.tsx`
- Create: `src/app/onboarding/coordinator/page.tsx`

**Interfaces:**
- Consumes: `signupCoordinatorAction`, `applyAsCoordinatorAction`, `MyCoordinatorSchool`, `getMyCoordinatorSchool` (Task 3); `BOARD_OPTIONS`, `STUDENT_COUNT_OPTIONS` (Task 3, `src/lib/coordinator/validate.ts` — reused here rather than redeclared, so the UI's option list can never drift from what the server accepts); `SchoolLocationFields`, `getSchoolStates` (existing); `PasswordField`, `CheckEmailNotice` (existing).
- Produces: routes `/signup/coordinator`, `/onboarding/coordinator`.

- [ ] **Step 1: Write the signup page (step 1)**

Create `src/app/(auth)/signup/coordinator/page.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { School } from 'lucide-react'
import { signupCoordinatorAction } from '@/app/actions/coordinator'
import type { AuthFormState } from '@/app/actions/auth'
import { PasswordField } from '@/components/auth/password-field'
import { CheckEmailNotice } from '@/components/auth/check-email-notice'

/**
 * Coordinator signup collects the account only. School, board and student
 * count are asked afterward on /onboarding/coordinator, once logged in —
 * resolving or creating a school needs auth.uid(), which does not exist yet
 * during signUp(). Exactly the shape student signup already uses for the
 * same reason (school selection is a separate step there too).
 */
export default function CoordinatorSignupPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signupCoordinatorAction,
    undefined
  )

  const inputClass =
    'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      {state?.success ? (
        <CheckEmailNotice message={state.success} />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <School className="w-4 h-4 text-primary" />
            </span>
            <h1 className="font-display text-2xl font-bold text-foreground">Coordinator sign-up</h1>
          </div>
          <p className="text-muted text-sm mb-6">
            You&apos;ll add your school on the next step, once your account is created.
          </p>

          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
                Your full name
              </label>
              <input id="full_name" name="full_name" required className={inputClass} placeholder="Anita Rao" />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email <span className="text-muted font-normal">(used to sign in)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@school.edu"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                Mobile number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                required
                className={inputClass}
                placeholder="10-digit mobile number"
              />
            </div>

            <PasswordField placeholder="Create a strong password" />

            {state?.error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? 'Creating account…' : 'Continue'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Already applied?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Write the board field**

Create `src/components/coordinator/school-board-field.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { SearchableSelect, type SelectOption } from '@/components/ui/searchable-select'
import { BOARD_OPTIONS as BOARD_VALUES } from '@/lib/coordinator/validate'

const BOARD_OPTIONS: SelectOption[] = BOARD_VALUES.map((v) => ({ value: v, label: v }))

const OTHER = 'Other'

/**
 * Pre-fills from the picked school's known board (every CBSE-register school
 * already has one), but stays fully editable — the coordinator is the
 * authoritative human, and any correction they make is visible to the admin
 * reviewing the claim regardless.
 */
export function SchoolBoardField({
  className,
  knownBoard,
}: {
  className: string
  knownBoard: string | null
}) {
  const initial = knownBoard && BOARD_OPTIONS.some((o) => o.value === knownBoard) ? knownBoard : ''
  const [board, setBoard] = useState(initial)
  const [customBoard, setCustomBoard] = useState(
    knownBoard && !BOARD_OPTIONS.some((o) => o.value === knownBoard) ? knownBoard : ''
  )

  // The picked school can change after this field first renders (the parent
  // form re-fetches on each new selection); keep the pre-fill in step.
  useEffect(() => {
    const next = knownBoard && BOARD_OPTIONS.some((o) => o.value === knownBoard) ? knownBoard : ''
    setBoard(next)
  }, [knownBoard])

  const isOther = board === OTHER

  return (
    <div>
      <label htmlFor="board_input" className="block text-sm font-medium text-foreground mb-1">
        Board of School
      </label>
      <SearchableSelect
        inputId="board_input"
        ariaLabel="Board of School"
        className={className}
        options={BOARD_OPTIONS}
        value={board}
        onChange={setBoard}
        placeholder="Search or select the board"
      />
      {isOther && (
        <input
          type="text"
          value={customBoard}
          onChange={(e) => setCustomBoard(e.target.value)}
          required
          placeholder="Type the board"
          className={`${className} mt-2`}
        />
      )}
      <input type="hidden" name="board" value={isOther ? customBoard : board} />
    </div>
  )
}
```

- [ ] **Step 3: Write the step-2 form**

Create `src/components/coordinator/coordinator-details-form.tsx`:

```tsx
'use client'

import { useActionState, useState } from 'react'
import { motion } from 'motion/react'
import { applyAsCoordinatorAction, type ApplyState } from '@/app/actions/coordinator'
import { STUDENT_COUNT_OPTIONS } from '@/lib/coordinator/validate'
import { SchoolLocationFields } from '@/components/onboarding/school-location-fields'
import { SchoolBoardField } from '@/components/coordinator/school-board-field'
import type { SchoolOption } from '@/app/actions/schools'

const INPUT_CLASS =
  'w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors'

export function CoordinatorDetailsForm({ states }: { states: string[] }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(
    applyAsCoordinatorAction,
    undefined
  )
  // SchoolLocationFields does not expose the picked school's own data today —
  // the board pre-fill is a coordinator-only need, so this form tracks it
  // itself via the same schools search used to render the picked option.
  const [knownBoard, setKnownBoard] = useState<string | null>(null)

  return (
    <motion.form
      action={action}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8 space-y-4"
    >
      <SchoolLocationFields
        className={INPUT_CLASS}
        states={states}
        onSchoolPicked={(school: SchoolOption | null) => setKnownBoard(school?.board ?? null)}
      />

      <SchoolBoardField className={INPUT_CLASS} knownBoard={knownBoard} />

      <div>
        <label htmlFor="student_count_range" className="block text-sm font-medium text-foreground mb-1">
          Total number of students
        </label>
        <select id="student_count_range" name="student_count_range" required defaultValue="" className={INPUT_CLASS}>
          <option value="" disabled>
            Select a range
          </option>
          {STUDENT_COUNT_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Submitting…' : 'Submit for review'}
      </button>
    </motion.form>
  )
}
```

- [ ] **Step 4: Give `SchoolLocationFields` the `onSchoolPicked` hook this form needs**

`SchoolLocationFields` already fetches `SchoolOption[]` internally (Task 2 added `board` to that type) but never surfaces the picked option to its parent — only a plain `schoolId`. Add an optional callback prop.

In `src/components/onboarding/school-location-fields.tsx`, add to `Props`:

```tsx
  /** Fires with the full picked school (or null) whenever the selection changes. */
  onSchoolPicked?: (school: SchoolOption | null) => void
```

Add the import: `import type { SchoolOption } from '@/app/actions/schools'` (it is already imported as a value for `getSchoolsAction`'s return type — add `type` alongside the existing import instead of a second import line).

Wherever `setSchoolId(s.id)` is called (the option-click handler) and wherever `setSchoolId('')`/`setSchoolId(MANUAL_SENTINEL)` are called, add a matching call: `onSchoolPicked?.(s ?? null)` on pick, `onSchoolPicked?.(null)` on every clear (state change, manual entry, district change). Concretely, in the function that handles clicking a result:

```tsx
                      onClick={() => { setSchoolId(s.id); setQuery(s.name); setOpen(false); onSchoolPicked?.(s) }}
```

And in `pickState` and `pickDistrict`, after each `setSchoolId('')`/`setSchoolId(MANUAL_SENTINEL)`, add `onSchoolPicked?.(null)`.

- [ ] **Step 5: Write the onboarding page**

Create `src/app/onboarding/coordinator/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSchoolStates } from '@/app/actions/schools'
import { getMyCoordinatorSchool } from '@/app/actions/coordinator'
import { CoordinatorDetailsForm } from '@/components/coordinator/coordinator-details-form'

export default async function CoordinatorOnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (profile.role !== 'coordinator') redirect('/dashboard')

  // Already applied? The coordinator's own dashboard is where they track it.
  const existing = await getMyCoordinatorSchool()
  if (existing) redirect('/coordinator')

  const states = await getSchoolStates()
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Which school, {firstName}?</h1>
          <p className="text-muted mt-2">
            We&apos;ll review your application before you can see your school&apos;s roster.
          </p>
        </div>
        <CoordinatorDetailsForm states={states} />
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: tsc exit 0; `✓ Compiled successfully`; `/signup/coordinator` and `/onboarding/coordinator` in the route list.

- [ ] **Step 7: Walk the full signup in the browser**

Start the app: `npm run dev`

Visit `/signup/coordinator`. Fill in a real name/email/password/phone, submit.

Expected: redirected to `/onboarding/coordinator` (or shown "check your email" if confirmation is required — confirm, then log in, and you land there anyway).

Pick **Maharashtra → Pune → Delhi Public School Hinjawadi** — a real, already-approved school. Expected: the Board field pre-fills to **CBSE** the moment the school is picked, with no visible flicker or second load. Change the total-students range to `301-600`. Submit.

Expected: the RPC returns `pending`, and you're redirected toward `/coordinator` (Task 6 builds what's actually there — for now, confirming the submission succeeds is enough).

- [ ] **Step 8: Verify the claim landed correctly**

```bash
cat > "$SP/v47c.sql" <<'SQL'
SELECT name || ' | coordinator_status=' || coordinator_status || ' | board=' || COALESCE(board,'NULL')
       || ' | students=' || COALESCE(student_count_range,'NULL') AS r
  FROM public.schools WHERE name = 'Delhi Public School Hinjawadi';
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v47c.sql"
```

Expected: `coordinator_status=pending`, `board=CBSE`, `students=301-600`.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(auth)/signup/coordinator" src/components/coordinator/school-board-field.tsx src/components/coordinator/coordinator-details-form.tsx src/app/onboarding/coordinator src/components/onboarding/school-location-fields.tsx
git commit -m "feat: two-step coordinator signup"
```

---

### Task 5: Admin review — extending the existing queue

**Files:**
- Modify: `src/app/(admin)/admin/schools/actions.ts`
- Modify: `src/app/(admin)/admin/schools/page.tsx`
- Modify: `src/components/admin/school-review-row.tsx`
- Create: `src/components/admin/coordinator-claim-row.tsx`

**Interfaces:**
- Consumes: `admin_review_coordinator_claim` (Task 1).
- Produces: `reviewCoordinatorClaimAction(prev, formData) → SchoolReviewState`; `CoordinatorClaimRow` component.

- [ ] **Step 1: Add the review action**

In `src/app/(admin)/admin/schools/actions.ts`, extend the maps and add the new action:

```ts
const ERR: Record<string, string> = {
  forbidden: 'Admins only.',
  not_pending: 'That school has already been reviewed.',
  notes_required: 'Give a reason when rejecting a school.',
  merge_target_required: 'Choose which school to merge into.',
  merge_target_missing: 'That school no longer exists.',
  merge_target_not_approved: 'You can only merge into an approved school — approve it first.',
  merge_into_self: 'A school cannot be merged into itself.',
  bad_decision: 'Unknown action.',
  // Coordinator-claim outcomes reuse this same lookup.
}

const DONE: Record<string, string> = {
  approved: 'School approved — students can now find it.',
  rejected: 'School rejected.',
  merged: 'Merged. Any students on the duplicate now point at the real school.',
}
```

Then, after `reviewSchoolAction`:

```ts
const CLAIM_DONE: Record<string, string> = {
  approved: 'Coordinator approved.',
  rejected: 'Coordinator application rejected.',
}

export async function reviewCoordinatorClaimAction(
  _prev: SchoolReviewState,
  formData: FormData
): Promise<SchoolReviewState> {
  const schoolId = (formData.get('school_id') as string)?.trim()
  const decision = (formData.get('decision') as string)?.trim()
  const notes = ((formData.get('notes') as string) ?? '').trim() || null

  if (!schoolId || !decision) return { error: 'Missing school or action.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_review_coordinator_claim', {
    p_school_id: schoolId,
    p_decision: decision,
    p_notes: notes,
  })

  if (error) return { error: 'Something went wrong. Please try again.' }

  const status = (data as string) ?? ''
  if (!CLAIM_DONE[status]) return { error: ERR[status] ?? 'Could not complete that.' }

  revalidatePath('/admin/schools')
  return { ok: CLAIM_DONE[status] }
}
```

- [ ] **Step 2: Write the standalone claim row (Case B — claim on an already-approved school)**

Create `src/components/admin/coordinator-claim-row.tsx`:

```tsx
'use client'

import { useActionState, useState } from 'react'
import { reviewCoordinatorClaimAction } from '@/app/(admin)/admin/schools/actions'
import type { SchoolReviewState } from '@/app/(admin)/admin/schools/actions'

export interface CoordinatorClaim {
  schoolId: string
  schoolName: string
  applicantName: string
  applicantEmail: string
  board: string | null
  studentCountRange: string | null
}

/** A coordinator claiming a school that is already approved — nothing school-level
    to review, so this is its own row rather than living inside SchoolReviewRow. */
export function CoordinatorClaimRow({ claim }: { claim: CoordinatorClaim }) {
  const [state, action, pending] = useActionState<SchoolReviewState, FormData>(
    reviewCoordinatorClaimAction,
    undefined
  )
  const [rejecting, setRejecting] = useState(false)

  if (state?.ok) {
    return <div className="px-5 py-4 text-sm text-green-700 bg-green-50">{state.ok}</div>
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{claim.applicantName}</p>
          <p className="text-xs text-muted">
            {claim.applicantEmail} · applying to coordinate <span className="font-medium">{claim.schoolName}</span>
            {claim.board && ` · ${claim.board}`}
            {claim.studentCountRange && ` · ${claim.studentCountRange} students`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <form action={action}>
            <input type="hidden" name="school_id" value={claim.schoolId} />
            <input type="hidden" name="decision" value="approve" />
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Approve'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setRejecting((v) => !v)}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-red-600"
          >
            Reject
          </button>
        </div>
      </div>

      {rejecting && (
        <form action={action} className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="school_id" value={claim.schoolId} />
          <input type="hidden" name="decision" value="reject" />
          <input
            name="notes"
            required
            placeholder="Why is this being rejected?"
            className="flex-1 min-w-[220px] h-9 px-3 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="px-4 h-9 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            Confirm reject
          </button>
        </form>
      )}

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Add the inline claim block to `SchoolReviewRow` (Case A)**

In `src/components/admin/school-review-row.tsx`, extend the `PendingSchool` interface and render an inline block when a claim is attached. Add to the imports:

```tsx
import { reviewCoordinatorClaimAction } from '@/app/(admin)/admin/schools/actions'
```

Extend `PendingSchool`:

```tsx
export interface PendingSchool {
  id: string
  name: string
  state: string
  district: string
  created_at: string
  submittedBy: string
  similar: SimilarSchool[]
  coordinatorClaim: {
    applicantName: string
    applicantEmail: string
    board: string | null
    studentCountRange: string | null
  } | null
}
```

Inside `SchoolReviewRow`, add a second `useActionState` for the claim (the existing one already handles the school's own approve/reject/merge — this is deliberately a separate hook, since the two decisions are independent):

```tsx
  const [claimState, claimAction, claimPending] = useActionState<SchoolReviewState, FormData>(
    reviewCoordinatorClaimAction,
    undefined
  )
```

And render, immediately after the existing `{mergeable.length > 0 && (...)}` block and before the closing `{state?.error && ...}`:

```tsx
      {school.coordinatorClaim && !claimState?.ok && (
        <div className="rounded-xl bg-primary/[0.05] border border-primary/20 p-3 space-y-2">
          <p className="text-xs text-foreground">
            <span className="font-semibold">{school.coordinatorClaim.applicantName}</span>
            {' '}({school.coordinatorClaim.applicantEmail}) has applied to coordinate this school
            {school.coordinatorClaim.board && ` · ${school.coordinatorClaim.board}`}
            {school.coordinatorClaim.studentCountRange && ` · ${school.coordinatorClaim.studentCountRange} students`}
          </p>
          <div className="flex items-center gap-2">
            <form action={claimAction}>
              <input type="hidden" name="school_id" value={school.id} />
              <input type="hidden" name="decision" value="approve" />
              <button
                type="submit"
                disabled={claimPending}
                className="px-3 h-8 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
              >
                Approve coordinator
              </button>
            </form>
            <form action={claimAction}>
              <input type="hidden" name="school_id" value={school.id} />
              <input type="hidden" name="decision" value="reject" />
              <input type="hidden" name="notes" value="Not approved alongside the school" />
              <button
                type="submit"
                disabled={claimPending}
                className="px-3 h-8 rounded-lg text-xs font-semibold border border-black/10 text-muted hover:text-red-600 disabled:opacity-60"
              >
                Reject coordinator
              </button>
            </form>
          </div>
          {claimState?.error && <p className="text-xs text-red-600">{claimState.error}</p>}
        </div>
      )}

      {school.coordinatorClaim && claimState?.ok && (
        <p className="text-xs text-green-700">{claimState.ok}</p>
      )}
```

- [ ] **Step 4: Wire the page — fetch claims for both cases**

In `src/app/(admin)/admin/schools/page.tsx`, add the import:

```tsx
import { CoordinatorClaimRow, type CoordinatorClaim } from '@/components/admin/coordinator-claim-row'
```

After the existing `withSimilar` construction, add a fetch for every pending or approved-school coordinator claim, then split it into the two cases:

```tsx
  interface RawClaim {
    coordinator_id: string
    schools_id: string
    school_name: string
    school_review_status: string
    board: string | null
    student_count_range: string | null
  }

  const { data: rawClaims } = (await supabase
    .from('schools')
    .select('coordinator_id, id, name, review_status, board, student_count_range')
    .eq('coordinator_status', 'pending')) as unknown as {
    data: { coordinator_id: string; id: string; name: string; review_status: string; board: string | null; student_count_range: string | null }[] | null
  }

  const claimants = rawClaims ?? []
  const applicantIds = [...new Set(claimants.map((c) => c.coordinator_id))]
  const { data: applicantProfiles } = applicantIds.length
    ? await supabase.from('user_profiles').select('id, full_name').in('id', applicantIds)
    : { data: [] }
  const applicantNameById = new Map((applicantProfiles ?? []).map((p) => [p.id, p.full_name]))

  // Emails live on auth.users, not user_profiles — the account page and every
  // other admin screen that shows an applicant's email reads it the same way.
  const { data: authUsers } = applicantIds.length
    ? await supabase.auth.admin.listUsers()
    : { data: { users: [] } }
  const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? '']))

  function claimFor(schoolId: string) {
    const c = claimants.find((c) => c.id === schoolId)
    if (!c) return null
    return {
      applicantName: applicantNameById.get(c.coordinator_id) ?? 'Unknown',
      applicantEmail: emailById.get(c.coordinator_id) ?? '',
      board: c.board,
      studentCountRange: c.student_count_range,
    }
  }

  const withSimilarAndClaims: PendingSchool[] = withSimilar.map((s) => ({
    ...s,
    coordinatorClaim: claimFor(s.id),
  }))

  // Case B: a claim on a school that needed no review of its own.
  const standaloneClaims: CoordinatorClaim[] = claimants
    .filter((c) => c.review_status === 'approved')
    .map((c) => ({
      schoolId: c.id,
      schoolName: c.name,
      applicantName: applicantNameById.get(c.coordinator_id) ?? 'Unknown',
      applicantEmail: emailById.get(c.coordinator_id) ?? '',
      board: c.board,
      studentCountRange: c.student_count_range,
    }))
```

Replace the `withSimilar.map(...)` render with `withSimilarAndClaims.map(...)`, and add a second section below the existing one:

```tsx
      {standaloneClaims.length > 0 && (
        <>
          <h2 className="font-display text-lg font-bold text-foreground mt-8">Coordinator applications</h2>
          <Reveal delay={0.08}>
            <div className="clay-card divide-y divide-black/[0.06]">
              {standaloneClaims.map((c) => (
                <CoordinatorClaimRow key={c.schoolId} claim={c} />
              ))}
            </div>
          </Reveal>
        </>
      )}
```

`supabase.auth.admin.listUsers()` requires the service-role client, not the user's own session — check whether `src/lib/supabase/server.ts` exposes an admin client already (grep for `admin` or `service_role` in that file). If it does, use that client for this one call instead of the request-scoped `supabase`; if it does not, skip the email lookup for this task and show `applicantEmail: ''` for now, noting it as a follow-up — do not block this task on adding a new admin-client wire-up that is bigger than this task's scope.

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: tsc exit 0; `✓ Compiled successfully`.

- [ ] **Step 6: Verify both cases in the browser**

Using the pending claim already created in Task 4 (Delhi Public School Hinjawadi, already-approved school — this is Case B), sign in as an admin and visit `/admin/schools`.

Expected: **"Coordinator applications"** section shows the test coordinator's name, email, board (CBSE), and student count (301-600), with Approve / Reject controls.

To exercise Case A, seed a second coordinator applying to a school that is *itself* still pending:

```bash
cat > "$SP/seed47.sql" <<'SQL'
DO $$
DECLARE new_coord uuid; new_school uuid;
BEGIN
  new_coord := (SELECT id FROM auth.users WHERE email = 'ishaan@gmail.com');
  UPDATE public.user_profiles SET role = 'coordinator' WHERE id = new_coord;

  new_school := public.add_pending_school('Case A Test School', 'Kerala', 'Ernakulam');
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', new_coord,'role','authenticated')::text, true);
  PERFORM public.apply_as_coordinator(new_school, 'ICSE / ISC', '101-300');
END $$;
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/seed47.sql"
```

Reload `/admin/schools`. Expected: the **"Case A Test School"** row (in the existing pending-schools list) now also shows an inline **"has applied to coordinate this school"** block with its own Approve/Reject, alongside that row's normal school approve/reject/merge controls.

Approve the school and separately approve the coordinator. Confirm both persisted:

```bash
cat > "$SP/v47d.sql" <<'SQL'
SELECT name || ' | school=' || review_status || ' | coordinator=' || coordinator_status AS r
  FROM public.schools WHERE name = 'Case A Test School';
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v47d.sql"
```

Expected: `school=approved | coordinator=approved`.

Clean up the fixtures:

```bash
cat > "$SP/clean47.sql" <<'SQL'
DELETE FROM public.schools WHERE name = 'Case A Test School';
UPDATE public.user_profiles SET role = 'student'
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ishaan@gmail.com');
UPDATE public.schools SET coordinator_id = NULL, coordinator_status = 'none'
  WHERE name = 'Delhi Public School Hinjawadi';
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/clean47.sql"
```

Note: the last statement resets the Task 4 test coordinator's claim so Task 6's walkthrough starts from a clean `pending` state rather than whatever this task left it in.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(admin)/admin/schools" src/components/admin/school-review-row.tsx src/components/admin/coordinator-claim-row.tsx
git commit -m "feat: extend the schools review queue to cover coordinator claims"
```

---

### Task 6: The coordinator's own dashboard

**Files:**
- Create: `src/app/(coordinator)/layout.tsx`
- Create: `src/app/(coordinator)/coordinator/page.tsx`
- Create: `src/components/coordinator/coordinator-nav.tsx`
- Create: `src/components/coordinator/school-roster.tsx`

**Interfaces:**
- Consumes: `getMyCoordinatorSchool`, `getSchoolRoster`, `MyCoordinatorSchool` (Task 3).
- Produces: route `/coordinator`.

- [ ] **Step 1: Write the nav**

Create `src/components/coordinator/coordinator-nav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

const items = [{ href: '/coordinator', label: 'Dashboard', icon: LayoutDashboard, exact: true }]

export function CoordinatorNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-black/5 hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </div>

      <div className="px-3 pb-4 border-t border-black/[0.06] pt-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Write the layout**

Create `src/app/(coordinator)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CoordinatorNav } from '@/components/coordinator/coordinator-nav'
import { MobileNavDrawer } from '@/components/mobile-nav-drawer'

export default async function CoordinatorLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coordinator') redirect('/')

  return (
    <div
      className="flex flex-col md:flex-row h-screen"
      style={{
        background:
          'radial-gradient(1100px 550px at 100% 0%, rgba(116,71,225,0.05), transparent 60%), radial-gradient(900px 500px at 0% 100%, rgba(20,184,166,0.04), transparent 60%), #F8FAFC',
      }}
    >
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-black/[0.06]">
        <div className="px-4 py-5 border-b border-black/[0.06]">
          <Image src="/logo.svg" alt="SkillFleet" width={120} height={32} className="h-8 w-auto" priority />
          <span className="mt-1 block text-xs font-medium text-muted uppercase tracking-wider">Coordinator</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CoordinatorNav />
        </div>
      </aside>

      <MobileNavDrawer subtitle="Coordinator">
        <CoordinatorNav />
      </MobileNavDrawer>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Write the roster component**

Create `src/components/coordinator/school-roster.tsx`:

```tsx
import { CLASS_OPTIONS } from '@/lib/profile/details'

export interface RosterStudent {
  studentId: string
  fullName: string | null
  schoolClass: string | null
}

/**
 * Grouped by class, in the same order CLASS_OPTIONS defines everywhere else
 * in the app. Attempt/Qualify Status are real columns with placeholder data —
 * neither ISC entries nor judging exist yet, but the shape does not change
 * once they do; only the placeholder text is replaced with real values.
 */
export function SchoolRoster({ students }: { students: RosterStudent[] }) {
  const byClass = new Map<string, RosterStudent[]>()
  for (const s of students) {
    const key = s.schoolClass ?? 'Unspecified'
    byClass.set(key, [...(byClass.get(key) ?? []), s])
  }
  const orderedClasses = [...CLASS_OPTIONS.filter((c) => byClass.has(c)), ...(byClass.has('Unspecified') ? ['Unspecified'] : [])]

  if (students.length === 0) {
    return (
      <div className="clay-card p-8 text-center text-muted text-sm">
        No students from your school have joined SkillFleet yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {orderedClasses.map((cls) => (
        <div key={cls}>
          <h3 className="font-display font-bold text-foreground text-sm mb-2">{cls}</h3>
          <div className="clay-card divide-y divide-black/[0.06]">
            <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
              <span>Student</span>
              <span>Attempt Status</span>
              <span>Qualify Status</span>
            </div>
            {(byClass.get(cls) ?? []).map((s) => (
              <div key={s.studentId} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
                <span className="text-foreground font-medium">{s.fullName ?? 'Student'}</span>
                <span className="text-muted">Opens when ISC 2026 launches</span>
                <span className="text-muted">Opens when ISC 2026 launches</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Write the page — the three states**

Create `src/app/(coordinator)/coordinator/page.tsx`:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, AlertTriangle, Users } from 'lucide-react'
import { getMyCoordinatorSchool, getSchoolRoster } from '@/app/actions/coordinator'
import { SchoolRoster } from '@/components/coordinator/school-roster'
import { PageHeader } from '@/components/ui/page-header'

export default async function CoordinatorDashboardPage() {
  const application = await getMyCoordinatorSchool()

  if (!application) redirect('/onboarding/coordinator')

  if (application.status === 'pending') {
    return (
      <div className="clay-card p-8 text-center space-y-3 max-w-md mx-auto mt-12">
        <div className="w-14 h-14 rounded-2xl bg-accent-yellow/15 flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7 text-accent-yellow" />
        </div>
        <p className="font-display font-bold text-foreground">Your application is under review</p>
        <p className="text-muted text-sm">
          We&apos;re confirming your coordinator application for{' '}
          <span className="font-semibold text-foreground">{application.schoolName}</span>. This
          usually doesn&apos;t take long.
        </p>
      </div>
    )
  }

  if (application.status === 'rejected') {
    return (
      <div className="clay-card p-8 text-center space-y-3 max-w-md mx-auto mt-12">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <p className="font-display font-bold text-foreground">
          We couldn&apos;t confirm your application for {application.schoolName}
        </p>
        {application.reviewNotes && <p className="text-muted text-sm">{application.reviewNotes}</p>}
        <Link
          href="/onboarding/coordinator"
          className="inline-block clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
        >
          Apply again
        </Link>
      </div>
    )
  }

  // approved
  const students = await getSchoolRoster()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={Users}
        title={application.schoolName}
        subtitle={`${students.length} student${students.length === 1 ? '' : 's'} from your school on SkillFleet.`}
      />
      <SchoolRoster students={students} />
    </div>
  )
}
```

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: tsc exit 0; `✓ Compiled successfully`; `/coordinator` in the route list.

- [ ] **Step 6: Walk the three states in the browser**

Sign in as the Task 4 test coordinator (their claim was reset to `pending` at the end of Task 5).

Expected: the **pending** waiting-room screen, naming their school.

As an admin, reject that claim with a reason via `/admin/schools`. Reload as the coordinator.

Expected: the **rejected** screen shows the admin's reason and an "Apply again" link back to `/onboarding/coordinator`.

Apply again (same school), then approve it as admin. Reload as the coordinator.

Expected: the real **roster** — Maya and Arjun (both Pune, from the seed data), grouped under **Class 9** and **Class 5**, each row showing *"Opens when ISC 2026 launches"* in both status columns.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(coordinator)" src/components/coordinator/coordinator-nav.tsx src/components/coordinator/school-roster.tsx
git commit -m "feat: coordinator dashboard — pending, rejected, and roster states"
```

---

### Task 7: Wire it into the rest of the app

This is last on purpose — only once this lands can a real signup actually reach `/coordinator` without a manual redirect during testing.

**Files:**
- Modify: `src/app/(platform)/layout.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this is routing glue only.

- [ ] **Step 1: Redirect coordinators out of the student platform**

In `src/app/(platform)/layout.tsx`, alongside the existing admin/vendor redirects:

```tsx
  // Admin and vendor have their own consoles
  if (profile.role === 'admin') redirect('/admin')
  if (profile.role === 'vendor') redirect('/vendor')
  if (profile.role === 'coordinator') redirect('/coordinator')
```

- [ ] **Step 2: Add the discoverability link**

In `src/app/(auth)/login/page.tsx`, after the existing "New here? Create your account" block:

```tsx
        <p className="text-xs text-muted mt-3">
          Are you a school coordinator?{' '}
          <Link href="/signup/coordinator" className="text-primary font-semibold hover:underline">
            Apply here
          </Link>
        </p>
```

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: tsc exit 0; all tests pass; `✓ Compiled successfully`.

- [ ] **Step 4: Confirm the redirect end to end**

Sign in as the now-approved Task 6 coordinator, but visit `/dashboard` directly instead of `/coordinator`.

Expected: redirected straight to `/coordinator` — the student platform never renders for this role.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(platform)/layout.tsx" "src/app/(auth)/login/page.tsx"
git commit -m "feat: route coordinators to their own dashboard; surface the signup link"
```

---

## Done when

- A teacher can sign up at `/signup/coordinator`, apply for a school at `/onboarding/coordinator` with board and student-count captured, and land on a "your application is under review" screen.
- An admin sees the claim on `/admin/schools` — inline on the school's own row if the school was also pending, or in a new "Coordinator applications" section if the school was already approved — and can approve or reject it independently of any school-level decision.
- A rejected claim shows the admin's reason to the coordinator and lets them reapply; the school itself is immediately claimable again by anyone.
- An approved coordinator sees a real roster of every student at their school, grouped by class, with Attempt Status / Qualify Status columns present but showing a placeholder until ISC entries and judging exist.
- Every other role redirects away from `/coordinator`, and a coordinator is redirected away from the student platform.
- `npx tsc --noEmit`, `npx vitest run` and `npx next build` are all clean.
