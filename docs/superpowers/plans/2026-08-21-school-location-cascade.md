# School Location Cascade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text School name field with a State → District → School cascade backed by the real CBSE schools register, so every student is attached to an identifiable school.

**Architecture:** A new `schools` table holds 32,882 normalised CBSE records, loaded once by a Python import script. Two SECURITY DEFINER RPCs return the distinct states and districts (a plain `SELECT DISTINCT` from the client would pull all 32k rows). A client component fetches one district's schools at a time (~21 KB worst case) and filters in the browser as the student types. The `isStudentDetailsComplete()` gate is widened **last**, which is what re-routes existing students through the new form.

**Tech Stack:** Next.js 16 App Router · Supabase/PostgreSQL · TypeScript · Vitest · Python 3 (import script only)

**Spec:** `docs/superpowers/specs/2026-08-21-school-location-cascade-design.md`

## Global Constraints

- **`AGENTS.md` applies:** this Next.js version has breaking changes from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing App Router code. `params` and `searchParams` are `Promise<{…}>` and must be awaited.
- **Supabase project is `bbioktywqkfvpzmakdxt` only.** Never touch the `happyfleet` project.
- **`supabase/` is gitignored** (`/supabase` in `.gitignore`). Migration files are written to disk and applied, but are **never** `git add`ed. Only source files get committed.
- **Migrations are applied via the Management API**, not the Supabase CLI. Helper: `powershell -NoProfile -File <scratchpad>/sbq.ps1 -File <migration.sql>`. MCP is disconnected.
- **Migration numbering continues from `0044`.**
- **Do not commit `cbse_schools_master.xlsx`** — it is gitignored, reference-only.
- **Do not push, and do not touch `main`.** Work stays on `feature/nikhil` for local review.
- **All SECURITY DEFINER functions use `SET search_path = ''`** and schema-qualify every identifier (`public.schools`, `auth.uid()`), matching every existing migration in this project.
- **No new npm dependency.** The import script is Python because `openpyxl` is already available in this environment and this is a one-time ops script, not shipped code.
- **Prices/IDs unchanged; this plan adds no user-facing copy beyond the form labels specified below.**

---

## File Structure

**Created:**
| Path | Responsibility |
|---|---|
| `supabase/migrations/0045_schools.sql` | `schools` table, RLS, the two location RPCs, `add_pending_school` RPC, `user_profiles` columns. *Not committed.* |
| `scripts/import_schools.py` | One-time, idempotent loader: reads the xlsx, normalises, batch-inserts via the Management API. |
| `src/lib/schools/validate.ts` | Pure validation + the `SchoolSelection` shape shared by both forms. |
| `src/lib/schools/search.ts` | Pure `filterSchools()` — the as-you-type matching, kept out of the component so it can be tested. |
| `src/lib/schools/__tests__/validate.test.ts` | Unit tests for validation. |
| `src/lib/schools/__tests__/search.test.ts` | Unit tests for matching. |
| `src/app/actions/schools.ts` | Server actions: districts for a state, schools for a district, add a pending school. |
| `src/components/onboarding/school-location-fields.tsx` | The State → District → School cascade client component. |

**Modified:**
| Path | Change |
|---|---|
| `src/lib/types/database.ts` | `schools` row type + three RPC signatures + three new `user_profiles` columns. |
| `src/lib/profile/details.ts` | `StudentDetailsFields` gains `school_state`/`school_district`; completeness check widened (**Task 6 only**). |
| `src/lib/profile/__tests__/details.test.ts` | Tests for the widened gate. |
| `src/components/onboarding/details-form.tsx` | Swap the free-text school input for the cascade. |
| `src/app/onboarding/details/actions.ts` | Validate and persist state/district/school_id. |
| `src/app/onboarding/details/page.tsx` | Load states; pass the previous free-text value as a hint. |
| `src/components/account/account-form.tsx` | Same cascade, pre-filled from the saved profile. |
| `src/app/(platform)/account/actions.ts` | Same validation and persistence. |
| `src/app/(platform)/account/page.tsx` | Load states; pass current school selection. |

**Task order is safety-critical.** Tasks 1–5 are additive and invisible to users. Task 6 flips the gate; doing it earlier would redirect every student to a form that cannot yet collect the new fields.

---

### Task 1: Schools table and data import

**Files:**
- Create: `supabase/migrations/0045_schools.sql` (not committed)
- Create: `scripts/import_schools.py`
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: table `public.schools(id uuid, affiliation_no text, name text, state text, district text, address text, pincode text, level text, source text, review_status text, created_by uuid, created_at timestamptz)`; RPCs `get_school_states() → TABLE(state text)`, `get_school_districts(p_state text) → TABLE(district text)`, `add_pending_school(p_name text, p_state text, p_district text) → uuid`; columns `user_profiles.school_id uuid`, `user_profiles.school_state text`, `user_profiles.school_district text`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0045_schools.sql`:

```sql
-- 0045: CBSE schools register + the State/District/School cascade.
-- Students pick a real school instead of typing free text, which ISC needs in
-- order to run a state-level round and cap wildcards per school.

CREATE TABLE IF NOT EXISTS public.schools (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliation_no TEXT UNIQUE,                     -- CBSE Aff. No.; NULL for user-added
  name           TEXT NOT NULL,
  state          TEXT NOT NULL,
  district       TEXT NOT NULL,
  address        TEXT,
  pincode        TEXT,
  level          TEXT,
  source         TEXT NOT NULL DEFAULT 'cbse'
                 CHECK (source IN ('cbse', 'user_added')),
  review_status  TEXT NOT NULL DEFAULT 'approved'
                 CHECK (review_status IN ('approved', 'pending', 'rejected')),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every read is "this district's approved schools"; one index serves all of them.
CREATE INDEX IF NOT EXISTS schools_state_district_idx
  ON public.schools (state, district)
  WHERE review_status = 'approved';

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read approved schools" ON public.schools;
CREATE POLICY "Read approved schools" ON public.schools FOR SELECT
  USING (
    review_status = 'approved'
    OR created_by = auth.uid()          -- your own pending school stays visible to you
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins manage schools" ON public.schools;
CREATE POLICY "Admins manage schools" ON public.schools FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Profile link. school_state/school_district are denormalised copies: ISC groups
-- students by state constantly, and school_name is already denormalised here.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS school_id       UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS school_state    TEXT,
  ADD COLUMN IF NOT EXISTS school_district TEXT;

-- SELECT DISTINCT from the client would drag all 32k rows to the browser.
CREATE OR REPLACE FUNCTION public.get_school_states()
RETURNS TABLE (state TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT DISTINCT s.state FROM public.schools s
   WHERE s.review_status = 'approved'
   ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.get_school_districts(p_state TEXT)
RETURNS TABLE (district TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT DISTINCT s.district FROM public.schools s
   WHERE s.review_status = 'approved' AND s.state = p_state
   ORDER BY 1;
$$;

/** Escape hatch: the student's school (or district) is not in the CBSE list.
    Kept as an RPC so source/review_status/created_by cannot be forged. */
CREATE OR REPLACE FUNCTION public.add_pending_school(
  p_name     TEXT,
  p_state    TEXT,
  p_district TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_name     text := NULLIF(BTRIM(p_name), '');
  v_state    text := NULLIF(BTRIM(p_state), '');
  v_district text := NULLIF(BTRIM(p_district), '');
  v_id       uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF v_name IS NULL OR v_state IS NULL OR v_district IS NULL THEN
    RAISE EXCEPTION 'name_state_district_required';
  END IF;
  IF length(v_name) > 100 THEN RAISE EXCEPTION 'name_too_long'; END IF;

  -- Re-use this student's own identical pending row instead of stacking duplicates.
  SELECT s.id INTO v_id FROM public.schools s
   WHERE s.created_by = auth.uid()
     AND lower(s.name) = lower(v_name)
     AND s.state = v_state AND s.district = v_district
   LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.schools (name, state, district, source, review_status, created_by)
  VALUES (v_name, v_state, v_district, 'user_added', 'pending', auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_states()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_districts(TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_pending_school(TEXT, TEXT, TEXT) TO authenticated;
```

- [ ] **Step 2: Apply the migration and verify the objects exist**

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cp supabase/migrations/0045_schools.sql "$SP/m45.sql"
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/m45.sql"
```

Then verify:

```bash
cat > "$SP/v45.sql" <<'SQL'
SELECT 'table: ' || COALESCE((SELECT 'yes' FROM information_schema.tables
         WHERE table_schema='public' AND table_name='schools'), 'MISSING') AS r
UNION ALL SELECT 'fns: ' || string_agg(p.proname, ',' ORDER BY p.proname)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
   AND p.proname IN ('get_school_states','get_school_districts','add_pending_school')
UNION ALL SELECT 'profile cols: ' || string_agg(column_name, ',' ORDER BY column_name)
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='user_profiles'
   AND column_name IN ('school_id','school_state','school_district');
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v45.sql"
```

Expected: `table: yes`, all three function names, all three column names.

- [ ] **Step 3: Write the import script**

Create `scripts/import_schools.py`:

```python
"""One-time, idempotent import of the CBSE schools register.

Reads cbse_schools_master.xlsx (gitignored, reference only), normalises the
ALL-CAPS source into display-ready text, and bulk-inserts into public.schools
via the Supabase Management API.

Usage:
    SUPABASE_ACCESS_TOKEN=<pat> python scripts/import_schools.py

Re-running is safe: ON CONFLICT (affiliation_no) DO UPDATE.
"""
import json
import os
import re
import sys
import urllib.request

import openpyxl

XLSX = "cbse_schools_master.xlsx"
PROJECT_REF = "bbioktywqkfvpzmakdxt"          # skillfleet ONLY
BATCH = 2000

# Acronyms and roman numerals that must survive title-casing. A naive .title()
# turns DAV into "Dav". Extend this list when a mangled name is spotted.
KEEP_UPPER = {
    "DAV", "KV", "KVS", "JNV", "PM", "DPS", "IIT", "NIT", "AECS", "APS", "AFS",
    "CRPF", "BSF", "ITBP", "SSB", "NCC", "ONGC", "NTPC", "BHEL", "SAIL", "MES",
    "CBSE", "ICSE", "SDA", "BVB", "SVM", "GHSS", "TTD", "SOS", "NPS", "GD",
    "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII",
}
# Joining words that read better lowercase when not leading.
SMALL = {"And", "Of", "The", "At", "In", "On", "For"}

# Legacy / misspelled state names in the CBSE source. The last two merge the
# two territories that legally became one UT in 2020 (and fix DADAR -> DADRA).
STATE_FIX = {
    "CHATTISGARH": "Chhattisgarh",
    "TAMILNADU": "Tamil Nadu",
    "ANDAMAN & NICOBAR": "Andaman & Nicobar Islands",
    "JAMMU & KASHMIR": "Jammu & Kashmir",
    "DADAR & NAGAR HAVELI": "Dadra & Nagar Haveli and Daman & Diu",
    "DAMAN & DIU": "Dadra & Nagar Haveli and Daman & Diu",
}


def smart_title(s: str) -> str:
    """Title-case each alphabetic run, preserving known acronyms."""
    def fix(m):
        w = m.group(0)
        return w.upper() if w.upper() in KEEP_UPPER else w.capitalize()

    out = re.sub(r"[A-Za-z]+", fix, (s or "").strip())
    words = out.split()
    return " ".join(
        w.lower() if i > 0 and w in SMALL else w for i, w in enumerate(words)
    )


def norm_state(raw: str) -> str:
    raw = (raw or "").strip().upper()
    return STATE_FIX.get(raw, smart_title(raw))


def sql_str(v) -> str:
    if v is None or str(v).strip() == "":
        return "NULL"
    return "'" + str(v).strip().replace("'", "''") + "'"


def run_sql(token: str, sql: str) -> None:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=json.dumps({"query": sql}).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}",
                 "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        r.read()


def main() -> int:
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print("SUPABASE_ACCESS_TOKEN is not set", file=sys.stderr)
        return 1

    ws = openpyxl.load_workbook(XLSX, read_only=True).active
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        state_raw = str(r[4]).strip()
        # ISC is a national competition with state rounds; a "Foreign Schools"
        # pseudo-state cannot be placed in one.
        if state_raw.upper() == "FOREIGN SCHOOLS":
            continue
        rows.append((
            str(r[2]).strip(),          # Aff. No.
            smart_title(str(r[7])),     # School Name
            norm_state(state_raw),      # State
            smart_title(str(r[5])),     # District
            smart_title(str(r[9])) if r[9] else None,   # Address
            str(r[10]).strip() if r[10] else None,      # Pincode
            str(r[6]).strip() if r[6] else None,        # Status/level
        ))

    print(f"Importing {len(rows)} schools in batches of {BATCH}...")
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        values = ",".join(
            "(" + ",".join([
                sql_str(a), sql_str(n), sql_str(st), sql_str(d),
                sql_str(addr), sql_str(pin), sql_str(lvl), "'cbse'", "'approved'",
            ]) + ")"
            for (a, n, st, d, addr, pin, lvl) in chunk
        )
        run_sql(token, f"""
            INSERT INTO public.schools
              (affiliation_no, name, state, district, address, pincode, level,
               source, review_status)
            VALUES {values}
            ON CONFLICT (affiliation_no) DO UPDATE SET
              name     = EXCLUDED.name,
              state    = EXCLUDED.state,
              district = EXCLUDED.district,
              address  = EXCLUDED.address,
              pincode  = EXCLUDED.pincode,
              level    = EXCLUDED.level;
        """)
        print(f"  {min(i + BATCH, len(rows))}/{len(rows)}")

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run the import**

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
SUPABASE_ACCESS_TOKEN=$(cat "$SP/sb_token.txt" | tr -d '[:space:]') python scripts/import_schools.py
```

Expected final line: `Done.` with the counter reaching `32882/32882`.

- [ ] **Step 5: Verify the import — counts, normalisation, and idempotency**

```bash
cat > "$SP/v45b.sql" <<'SQL'
SELECT 'schools: ' || count(*)::text AS r FROM public.schools
UNION ALL SELECT 'states: ' || count(DISTINCT state)::text FROM public.schools
UNION ALL SELECT 'districts: ' || count(DISTINCT (state, district))::text FROM public.schools
UNION ALL SELECT 'foreign leaked: ' || count(*)::text FROM public.schools WHERE state ILIKE '%foreign%'
UNION ALL SELECT 'merged UT: ' || count(*)::text FROM public.schools WHERE state LIKE 'Dadra%'
-- Normalisation: assert the mangled forms are ABSENT, not that one good row exists.
UNION ALL SELECT 'mangled DAV: '  || count(*)::text FROM public.schools WHERE name LIKE 'Dav %'
UNION ALL SELECT 'mangled KV: '   || count(*)::text FROM public.schools WHERE name LIKE '%Kv %'
UNION ALL SELECT 'still SHOUTING: '|| count(*)::text FROM public.schools WHERE name = upper(name)
UNION ALL SELECT 'bad state spelling: ' || count(*)::text FROM public.schools
   WHERE state IN ('CHATTISGARH','TAMILNADU','Chattisgarh','Tamilnadu')
UNION ALL SELECT 'sample state: ' || (SELECT state FROM public.schools WHERE state LIKE 'Tamil%' LIMIT 1)
UNION ALL SELECT 'sample name: '  || (SELECT name  FROM public.schools WHERE name LIKE 'DAV%' LIMIT 1);
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v45b.sql"
```

Expected: `schools: 32882`, `states: 36`, `districts: 740`, `foreign leaked: 0`, `merged UT: 43`, and every mangle counter at **0** — `mangled DAV: 0`, `mangled KV: 0`, `bad state spelling: 0`. `sample state:` should read `Tamil Nadu`, `sample name:` should start with `DAV ` in capitals.

`still SHOUTING` counts names that are entirely uppercase. A handful is expected and fine — a name made only of acronyms (e.g. `DAV KV`) legitimately stays uppercase. If the number is in the thousands, `smart_title` is not being applied; investigate before continuing.

Now prove idempotency by re-running the import:

```bash
SUPABASE_ACCESS_TOKEN=$(cat "$SP/sb_token.txt" | tr -d '[:space:]') python scripts/import_schools.py
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v45b.sql"
```

Expected: still `schools: 32882` — **not** 65,764.

- [ ] **Step 6: Add the database types**

In `src/lib/types/database.ts`, add to the `Tables` block:

```ts
      schools: {
        Row: {
          id: string
          affiliation_no: string | null
          name: string
          state: string
          district: string
          address: string | null
          pincode: string | null
          level: string | null
          source: string
          review_status: string
          created_by: string | null
          created_at: string
        }
      }
```

And to the `Functions` block:

```ts
      get_school_states: { Args: Record<string, never>; Returns: { state: string }[] }
      get_school_districts: { Args: { p_state: string }; Returns: { district: string }[] }
      add_pending_school: {
        Args: { p_name: string; p_state: string; p_district: string }
        Returns: string
      }
```

Add to the existing `user_profiles` Row type: `school_id: string | null`, `school_state: string | null`, `school_district: string | null`.

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

```bash
git add scripts/import_schools.py src/lib/types/database.ts
git commit -m "feat: schools table and CBSE register import

32,882 schools across 36 states and 740 districts, excluding the 269
foreign-school rows that cannot be placed in a state round."
```

Note: `supabase/migrations/0045_schools.sql` is deliberately **not** added — `supabase/` is gitignored.

---

### Task 2: Pure helpers — validation and search

**Files:**
- Create: `src/lib/schools/validate.ts`
- Create: `src/lib/schools/search.ts`
- Test: `src/lib/schools/__tests__/validate.test.ts`
- Test: `src/lib/schools/__tests__/search.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MANUAL_SENTINEL` (const `'__manual__'`), `interface SchoolSelection { state: string; district: string; schoolId: string | null; manualName: string | null }`, `parseSchoolSelection(formData: FormData): SchoolSelection`, `validateSchoolSelection(sel: SchoolSelection): string | null`, `MAX_SCHOOL_NAME = 100`, `interface SearchableSchool { name: string; address: string | null }`, `filterSchools<T extends SearchableSchool>(schools: T[], query: string, limit?: number): T[]`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/schools/__tests__/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  parseSchoolSelection,
  validateSchoolSelection,
  MANUAL_SENTINEL,
  MAX_SCHOOL_NAME,
} from '@/lib/schools/validate'

function fd(entries: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

describe('parseSchoolSelection', () => {
  it('reads a picked school', () => {
    const sel = parseSchoolSelection(
      fd({ school_state: 'Maharashtra', school_district: 'Pune', school_id: 'abc-123' })
    )
    expect(sel).toEqual({
      state: 'Maharashtra',
      district: 'Pune',
      schoolId: 'abc-123',
      manualName: null,
    })
  })

  it('reads a manual entry and leaves schoolId null', () => {
    const sel = parseSchoolSelection(
      fd({
        school_state: 'Sikkim',
        school_district: 'Soreng',
        school_id: MANUAL_SENTINEL,
        school_manual_name: '  Greenwood High  ',
      })
    )
    expect(sel.schoolId).toBeNull()
    expect(sel.manualName).toBe('Greenwood High')
  })

  it('trims surrounding whitespace on state and district', () => {
    const sel = parseSchoolSelection(
      fd({ school_state: ' Kerala ', school_district: ' Ernakulam ', school_id: 'x' })
    )
    expect(sel.state).toBe('Kerala')
    expect(sel.district).toBe('Ernakulam')
  })
})

describe('validateSchoolSelection', () => {
  const picked = { state: 'Delhi', district: 'New Delhi', schoolId: 'abc', manualName: null }

  it('accepts a picked school', () =>
    expect(validateSchoolSelection(picked)).toBeNull())

  it('accepts a manual entry', () =>
    expect(
      validateSchoolSelection({ ...picked, schoolId: null, manualName: 'Some School' })
    ).toBeNull())

  it('rejects a missing state', () =>
    expect(validateSchoolSelection({ ...picked, state: '' })).toBe(
      'Please select your state.'
    ))

  it('rejects a missing district', () =>
    expect(validateSchoolSelection({ ...picked, district: '' })).toBe(
      'Please select your district.'
    ))

  it('rejects neither a school nor a manual name', () =>
    expect(
      validateSchoolSelection({ ...picked, schoolId: null, manualName: null })
    ).toBe('Please select your school.'))

  it('rejects a whitespace-only manual name', () =>
    expect(
      validateSchoolSelection({ ...picked, schoolId: null, manualName: '   ' })
    ).toBe('Please select your school.'))

  it('rejects a manual name longer than the limit', () =>
    expect(
      validateSchoolSelection({
        ...picked,
        schoolId: null,
        manualName: 'x'.repeat(MAX_SCHOOL_NAME + 1),
      })
    ).toBe('School name is too long.'))

  it('accepts a manual name exactly at the limit', () =>
    expect(
      validateSchoolSelection({
        ...picked,
        schoolId: null,
        manualName: 'x'.repeat(MAX_SCHOOL_NAME),
      })
    ).toBeNull())
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/schools`
Expected: FAIL — `Failed to resolve import "@/lib/schools/validate"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/schools/validate.ts`:

```ts
// Shared shape and validation for the State / District / School cascade, used
// by both the onboarding details form and the account form so the rules can
// never drift between them.

/** Dropdown value meaning "my school isn't listed" — never a real school id. */
export const MANUAL_SENTINEL = '__manual__'

/** Longest real school name in the CBSE register is exactly 100 characters. */
export const MAX_SCHOOL_NAME = 100

export interface SchoolSelection {
  state: string
  district: string
  /** A real schools.id, or null when the student typed their school in. */
  schoolId: string | null
  /** The typed name, or null when a listed school was picked. */
  manualName: string | null
}

export function parseSchoolSelection(formData: FormData): SchoolSelection {
  const state = ((formData.get('school_state') as string) ?? '').trim()
  const district = ((formData.get('school_district') as string) ?? '').trim()
  const rawId = ((formData.get('school_id') as string) ?? '').trim()
  const manual = ((formData.get('school_manual_name') as string) ?? '').trim()

  const isManual = rawId === MANUAL_SENTINEL || rawId === ''
  return {
    state,
    district,
    schoolId: isManual ? null : rawId,
    manualName: isManual ? manual || null : null,
  }
}

/** Returns an error message, or null when the selection is usable. */
export function validateSchoolSelection(sel: SchoolSelection): string | null {
  if (!sel.state) return 'Please select your state.'
  if (!sel.district) return 'Please select your district.'
  if (!sel.schoolId && !sel.manualName?.trim()) return 'Please select your school.'
  if (sel.manualName && sel.manualName.length > MAX_SCHOOL_NAME) {
    return 'School name is too long.'
  }
  return null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/schools`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the failing search tests**

Create `src/lib/schools/__tests__/search.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { filterSchools } from '@/lib/schools/search'

const schools = [
  { name: 'Govt Boys Sr Sec School', address: 'Hari Nagar Ashram, New Delhi' },
  { name: 'Govt Boys Sr Sec School', address: 'Jangpura, New Delhi' },
  { name: 'DAV Public School', address: 'Pandara Road, New Delhi' },
  { name: 'St. Xaviers School', address: 'Civil Lines, New Delhi' },
]

describe('filterSchools', () => {
  it('returns everything for an empty query', () =>
    expect(filterSchools(schools, '')).toHaveLength(4))

  it('ignores surrounding whitespace', () =>
    expect(filterSchools(schools, '   ')).toHaveLength(4))

  it('matches case-insensitively', () =>
    expect(filterSchools(schools, 'dav')).toHaveLength(1))

  it('matches a term from the middle of the name', () =>
    expect(filterSchools(schools, 'sec school')).toHaveLength(2))

  it('matches multiple terms in any order', () =>
    expect(filterSchools(schools, 'boys govt')).toHaveLength(2))

  it('matches on the address, which is what separates duplicate names', () => {
    const found = filterSchools(schools, 'jangpura')
    expect(found).toHaveLength(1)
    expect(found[0].address).toContain('Jangpura')
  })

  it('combines a name term and an address term', () =>
    expect(filterSchools(schools, 'govt jangpura')).toHaveLength(1))

  it('returns nothing when a term matches no school', () =>
    expect(filterSchools(schools, 'govt nowhere')).toHaveLength(0))

  it('tolerates a null address', () =>
    expect(
      filterSchools([{ name: 'Some School', address: null }], 'some')
    ).toHaveLength(1))

  it('caps results at the limit', () =>
    expect(filterSchools(schools, '', 2)).toHaveLength(2))
})
```

- [ ] **Step 6: Run the search tests to verify they fail**

Run: `npx vitest run src/lib/schools`
Expected: FAIL — `Failed to resolve import "@/lib/schools/search"`.

- [ ] **Step 7: Write the search implementation**

Create `src/lib/schools/search.ts`:

```ts
// As-you-type matching for the school picker. Kept out of the component so it
// can be tested directly — the matching rule is the part most likely to be
// wrong, and it is invisible in a rendered dropdown.

export interface SearchableSchool {
  name: string
  address: string | null
}

/**
 * Every whitespace-separated term must appear somewhere in the name or the
 * address, case-insensitively and in any order — so "sec school", "govt boys"
 * and "govt jangpura" all find the right row.
 *
 * The address is searched as well as the name because 1,310 school names are
 * duplicated within their own district; the address is often the only thing
 * that tells two entries apart.
 */
export function filterSchools<T extends SearchableSchool>(
  schools: T[],
  query: string,
  limit = 50
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return schools.slice(0, limit)

  const terms = q.split(/\s+/)
  return schools
    .filter((s) => {
      const hay = `${s.name} ${s.address ?? ''}`.toLowerCase()
      return terms.every((t) => hay.includes(t))
    })
    .slice(0, limit)
}
```

- [ ] **Step 8: Run all the helper tests**

Run: `npx vitest run src/lib/schools`
Expected: PASS, 21 tests.

- [ ] **Step 9: Commit**

```bash
git add src/lib/schools
git commit -m "feat: validation and search helpers for the school cascade"
```

---

### Task 3: Server actions for the cascade

**Files:**
- Create: `src/app/actions/schools.ts`

**Interfaces:**
- Consumes: `MANUAL_SENTINEL` is not needed here; the RPCs from Task 1 are.
- Produces: `interface SchoolOption { id: string; name: string; address: string | null; pincode: string | null }`, `getSchoolStates(): Promise<string[]>`, `getSchoolDistrictsAction(state: string): Promise<string[]>`, `getSchoolsAction(state: string, district: string): Promise<SchoolOption[]>`, `resolveSchoolId(sel: SchoolSelection): Promise<{ schoolId: string; name: string } | { error: string }>`.

- [ ] **Step 1: Write the implementation**

Create `src/app/actions/schools.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { SchoolSelection } from '@/lib/schools/validate'

export interface SchoolOption {
  id: string
  name: string
  address: string | null
  pincode: string | null
}

/** Distinct states, for the first dropdown. Called from server components. */
export async function getSchoolStates(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_school_states')
  return ((data ?? []) as { state: string }[]).map((r) => r.state)
}

/** Districts within one state. A plain DISTINCT here would scan 32k rows client-side. */
export async function getSchoolDistrictsAction(state: string): Promise<string[]> {
  if (!state?.trim()) return []
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_school_districts', { p_state: state })
  return ((data ?? []) as { district: string }[]).map((r) => r.district)
}

/**
 * Every approved school in one district — 729 rows worst case (~21 KB), which
 * is what makes filtering in the browser viable instead of a request per keystroke.
 */
export async function getSchoolsAction(
  state: string,
  district: string
): Promise<SchoolOption[]> {
  if (!state?.trim() || !district?.trim()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('schools')
    .select('id, name, address, pincode')
    .eq('state', state)
    .eq('district', district)
    .eq('review_status', 'approved')
    .order('name')
  return (data ?? []) as SchoolOption[]
}

/**
 * Turns a submitted selection into a real schools.id, creating a pending row
 * when the student typed their school in. Also re-checks that a picked school
 * really is in the submitted state/district — the client can send anything.
 */
export async function resolveSchoolId(
  sel: SchoolSelection
): Promise<{ schoolId: string; name: string } | { error: string }> {
  const supabase = await createClient()

  if (sel.schoolId) {
    const { data } = await supabase
      .from('schools')
      .select('id, name, state, district')
      .eq('id', sel.schoolId)
      .single()

    if (!data) return { error: 'That school could not be found. Please pick again.' }
    if (data.state !== sel.state || data.district !== sel.district) {
      return { error: 'That school is not in the selected state and district.' }
    }
    return { schoolId: data.id, name: data.name }
  }

  const name = sel.manualName?.trim()
  if (!name) return { error: 'Please select your school.' }

  const { data, error } = await supabase.rpc('add_pending_school', {
    p_name: name,
    p_state: sel.state,
    p_district: sel.district,
  })
  if (error || !data) return { error: 'Could not save that school. Please try again.' }
  return { schoolId: data as string, name }
}
```

- [ ] **Step 2: Verify the RPCs behave correctly against the live database**

This exercises the RLS and the escape hatch as a real signed-in student would.

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cat > "$SP/t45.sql" <<'SQL'
DO $$
DECLARE
  maya uuid; other uuid; n int; sid uuid; out_txt text := '';
BEGIN
  SELECT id INTO maya  FROM auth.users WHERE email='maya@gmail.com';
  SELECT id INTO other FROM auth.users WHERE email='ananya@gmail.com';
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', maya,'role','authenticated')::text, true);

  SELECT count(*) INTO n FROM public.get_school_states();
  out_txt := out_txt || format('1) states = %s (want 36)', n) || E'\n';

  SELECT count(*) INTO n FROM public.get_school_districts('Maharashtra');
  out_txt := out_txt || format('2) Maharashtra districts = %s (want 36)', n) || E'\n';

  SELECT count(*) INTO n FROM public.schools
   WHERE state='Karnataka' AND district='Bengaluru Urban' AND review_status='approved';
  out_txt := out_txt || format('3) Bengaluru Urban schools = %s (want 729)', n) || E'\n';

  SELECT public.add_pending_school('Testing Convent School','Sikkim','Soreng') INTO sid;
  out_txt := out_txt || format('4) pending school created = %s', sid IS NOT NULL) || E'\n';

  SELECT public.add_pending_school('Testing Convent School','Sikkim','Soreng') INTO sid;
  SELECT count(*) INTO n FROM public.schools WHERE name='Testing Convent School';
  out_txt := out_txt || format('5) calling twice does not duplicate: rows = %s (want 1)', n) || E'\n';

  -- another student must NOT see someone else's pending school
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other,'role','authenticated')::text, true);
  SELECT count(*) INTO n FROM public.schools WHERE name='Testing Convent School';
  out_txt := out_txt || format('6) other student sees it = %s (want 0)', n) || E'\n';

  RAISE EXCEPTION E'\n%', out_txt;   -- aborts, rolling the test data back
END $$;
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/t45.sql"
```

Expected, all six matching their `(want …)`: 36 states, 36 Maharashtra districts, 729 Bengaluru Urban schools, pending school created `t`, 1 row after two calls, 0 visible to another student.

The `RAISE EXCEPTION` at the end is deliberate — it aborts the transaction so the test school never persists.

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/app/actions/schools.ts
git commit -m "feat: server actions for the school cascade"
```

---

### Task 4: The cascade component

**Files:**
- Create: `src/components/onboarding/school-location-fields.tsx`

**Interfaces:**
- Consumes: `getSchoolDistrictsAction`, `getSchoolsAction`, `SchoolOption` (Task 3); `MANUAL_SENTINEL`, `filterSchools` (Task 2).
- Produces: `<SchoolLocationFields className states initialState initialDistrict initialSchoolId initialSchoolName previousFreeText />`. Emits form fields named `school_state`, `school_district`, `school_id`, `school_manual_name`.

- [ ] **Step 1: Write the component**

Create `src/components/onboarding/school-location-fields.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { getSchoolDistrictsAction, getSchoolsAction, type SchoolOption } from '@/app/actions/schools'
import { MANUAL_SENTINEL } from '@/lib/schools/validate'
import { filterSchools } from '@/lib/schools/search'

const MANUAL_DISTRICT = '__manual_district__'

interface Props {
  /** Shared input styling from the host form. */
  className: string
  states: string[]
  initialState?: string
  initialDistrict?: string
  initialSchoolId?: string
  initialSchoolName?: string
  /** Free text the student entered before the cascade existed, shown as a hint. */
  previousFreeText?: string
}

/**
 * State -> District -> School. Each field stays locked until the one above it
 * is answered, because districts only make sense within a state and school
 * names are only unique-ish within a district.
 *
 * The district's schools are fetched once on selection (729 rows worst case)
 * and filtered in the browser, so typing narrows the list with no round-trip.
 */
export function SchoolLocationFields({
  className,
  states,
  initialState = '',
  initialDistrict = '',
  initialSchoolId = '',
  initialSchoolName = '',
  previousFreeText = '',
}: Props) {
  const [state, setState] = useState(initialState)
  const [districts, setDistricts] = useState<string[]>([])
  const [district, setDistrict] = useState(initialDistrict)
  const [manualDistrict, setManualDistrict] = useState('')
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [schoolId, setSchoolId] = useState(initialSchoolId)
  const [query, setQuery] = useState(initialSchoolName)
  const [manualName, setManualName] = useState('')
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const districtIsManual = district === MANUAL_DISTRICT
  const schoolIsManual = schoolId === MANUAL_SENTINEL
  // With no district list to pick from, there are no schools to list either.
  const effectiveDistrict = districtIsManual ? manualDistrict.trim() : district

  // Load this state's districts. Also runs on mount when editing a saved profile.
  useEffect(() => {
    if (!state) {
      setDistricts([])
      return
    }
    startTransition(async () => {
      setDistricts(await getSchoolDistrictsAction(state))
    })
  }, [state])

  // Load the district's schools. Skipped entirely for a typed-in district.
  useEffect(() => {
    if (!state || !district || districtIsManual) {
      setSchools([])
      return
    }
    startTransition(async () => {
      setSchools(await getSchoolsAction(state, district))
    })
  }, [state, district, districtIsManual])

  const filtered = useMemo(() => filterSchools(schools, query), [schools, query])

  const selected = schools.find((s) => s.id === schoolId)

  function pickState(next: string) {
    setState(next)
    setDistrict('')
    setManualDistrict('')
    setSchoolId('')
    setQuery('')
    setManualName('')
  }

  function pickDistrict(next: string) {
    setDistrict(next)
    setSchoolId(next === MANUAL_DISTRICT ? MANUAL_SENTINEL : '')
    setQuery('')
    setManualName('')
  }

  return (
    <>
      {previousFreeText && !initialSchoolId && (
        <p className="text-xs text-muted bg-black/[0.03] rounded-xl px-4 py-3">
          Previously entered: <span className="font-semibold text-foreground">{previousFreeText}</span>{' '}
          — please find your school in the list below.
        </p>
      )}

      {/* State */}
      <div>
        <label htmlFor="school_state" className="block text-sm font-medium text-foreground mb-1">
          State
        </label>
        <select
          id="school_state"
          name="school_state"
          required
          value={state}
          onChange={(e) => pickState(e.target.value)}
          className={className}
        >
          <option value="" disabled>Select your state</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* District */}
      <div>
        <label htmlFor="school_district_select" className="block text-sm font-medium text-foreground mb-1">
          District
        </label>
        <select
          id="school_district_select"
          value={district}
          onChange={(e) => pickDistrict(e.target.value)}
          disabled={!state}
          className={className}
        >
          <option value="" disabled>
            {state ? 'Select your district' : 'Select a state first'}
          </option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value={MANUAL_DISTRICT}>My district isn&apos;t listed</option>
        </select>

        {districtIsManual && (
          <input
            type="text"
            value={manualDistrict}
            onChange={(e) => setManualDistrict(e.target.value)}
            required
            placeholder="Type your district"
            className={`${className} mt-2`}
          />
        )}
        {/* The value the server reads, whether picked or typed. */}
        <input type="hidden" name="school_district" value={effectiveDistrict} />
      </div>

      {/* School */}
      <div>
        <label htmlFor="school_query" className="block text-sm font-medium text-foreground mb-1">
          School name
        </label>

        {schoolIsManual ? (
          <>
            <input
              id="school_manual_name"
              name="school_manual_name"
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              required
              maxLength={100}
              placeholder="Type your school's full name"
              className={className}
            />
            <p className="text-xs text-muted mt-1">
              We&apos;ll check this and add it to our list.{' '}
              {!districtIsManual && (
                <button
                  type="button"
                  onClick={() => { setSchoolId(''); setManualName('') }}
                  className="text-primary font-semibold hover:underline"
                >
                  Search the list instead
                </button>
              )}
            </p>
          </>
        ) : (
          <div className="relative">
            <input
              id="school_query"
              type="text"
              autoComplete="off"
              value={selected ? selected.name : query}
              onChange={(e) => { setQuery(e.target.value); setSchoolId(''); setOpen(true) }}
              onFocus={() => setOpen(true)}
              disabled={!effectiveDistrict}
              placeholder={
                effectiveDistrict
                  ? pending ? 'Loading schools…' : 'Start typing your school name'
                  : 'Select a district first'
              }
              className={className}
            />

            {open && effectiveDistrict && (
              <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto clay-card p-1 bg-white">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => { setSchoolId(s.id); setQuery(s.name); setOpen(false) }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/[0.04]"
                    >
                      <span className="block text-sm font-medium text-foreground">{s.name}</span>
                      {s.address && (
                        <span className="block text-xs text-muted truncate">{s.address}</span>
                      )}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && !pending && (
                  <li className="px-3 py-2 text-sm text-muted">No match in this district.</li>
                )}
                <li className="border-t border-black/[0.06] mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => { setSchoolId(MANUAL_SENTINEL); setOpen(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/[0.06]"
                  >
                    + My school isn&apos;t listed
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}

        <input type="hidden" name="school_id" value={schoolId} />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/school-location-fields.tsx
git commit -m "feat: State/District/School cascade component"
```

---

### Task 5: Wire the cascade into both forms

**Files:**
- Modify: `src/components/onboarding/details-form.tsx`
- Modify: `src/app/onboarding/details/actions.ts`
- Modify: `src/app/onboarding/details/page.tsx`
- Modify: `src/components/account/account-form.tsx`
- Modify: `src/app/(platform)/account/actions.ts`
- Modify: `src/app/(platform)/account/page.tsx`

**Interfaces:**
- Consumes: `SchoolLocationFields` (Task 4); `getSchoolStates`, `resolveSchoolId` (Task 3); `parseSchoolSelection`, `validateSchoolSelection` (Task 2).
- Produces: both forms persist `school_id`, `school_state`, `school_district`, `school_name`.

- [ ] **Step 1: Update the onboarding form**

In `src/components/onboarding/details-form.tsx`, add the import and props, then replace the school-name block:

```tsx
import { SchoolLocationFields } from '@/components/onboarding/school-location-fields'
```

Change the signature to `export function DetailsForm({ states, previousFreeText }: { states: string[]; previousFreeText?: string })`, then replace the entire `<div>` containing the `school_name` input with:

```tsx
      <SchoolLocationFields
        className={INPUT_CLASS}
        states={states}
        previousFreeText={previousFreeText}
      />
```

Leave `ClassBranchFields`, `city`, the error block and the submit button exactly as they are.

- [ ] **Step 2: Update the onboarding page to supply the states and the hint**

In `src/app/onboarding/details/page.tsx`, add the import:

```tsx
import { getSchoolStates } from '@/app/actions/schools'
```

Add `school_name` to the existing `.select(...)` list if not already present (it is). After the `isStudentDetailsComplete` early-return, add:

```tsx
  const states = await getSchoolStates()
```

And change the render to `<DetailsForm states={states} previousFreeText={profile.school_name ?? ''} />`.

- [ ] **Step 3: Update the onboarding action**

In `src/app/onboarding/details/actions.ts`, add the imports:

```ts
import { parseSchoolSelection, validateSchoolSelection } from '@/lib/schools/validate'
import { resolveSchoolId } from '@/app/actions/schools'
```

Replace the `schoolName` read and the `!schoolName` part of the guard. The field list becomes:

```ts
  const schoolClass = (formData.get('school_class') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const schoolBranch = (formData.get('school_branch') as string)?.trim() || null
  const selection = parseSchoolSelection(formData)

  if (!schoolClass || !city) {
    return { error: 'All fields are required.' }
  }
  const classBranchError = validateClassBranch(schoolClass, schoolBranch)
  if (classBranchError) return { error: classBranchError }
  const schoolError = validateSchoolSelection(selection)
  if (schoolError) return { error: schoolError }
```

After the role check and before the update, resolve the school:

```ts
  const resolved = await resolveSchoolId(selection)
  if ('error' in resolved) return { error: resolved.error }
```

And extend the update payload:

```ts
    .update({
      school_class: schoolClass,
      school_branch: branchToStore(schoolClass, schoolBranch),
      school_id: resolved.schoolId,
      school_name: resolved.name,
      school_state: selection.state,
      school_district: selection.district,
      city,
    })
```

- [ ] **Step 4: Update the account form**

In `src/components/account/account-form.tsx`, add the import:

```tsx
import { SchoolLocationFields } from '@/components/onboarding/school-location-fields'
```

Extend `AccountFormProps` — `states` is a top-level prop, the rest go inside the existing `initial` object:

```tsx
interface AccountFormProps {
  role: string
  email: string
  states: string[]
  initial: {
    full_name: string
    date_of_birth: string
    phone: string
    school_class: string
    school_branch: string
    school_name: string
    school_id: string
    school_state: string
    school_district: string
    city: string
    parent_mobile: string
  }
}
```

Change the signature to `export function AccountForm({ role, email, states, initial }: AccountFormProps)`, then replace the `school_name` input block with:

```tsx
      {isStudent && (
        <SchoolLocationFields
          className={INPUT_CLASS}
          states={states}
          initialState={initial.school_state}
          initialDistrict={initial.school_district}
          initialSchoolId={initial.school_id}
          initialSchoolName={initial.school_name}
        />
      )}
```

- [ ] **Step 5: Update the account page**

In `src/app/(platform)/account/page.tsx`, add the import:

```tsx
import { getSchoolStates } from '@/app/actions/schools'
```

Add the three new columns to the profile `.select(...)` string, so it reads:

```ts
      .select('full_name, role, date_of_birth, phone, school_class, school_branch, school_name, school_id, school_state, school_district, city, parent_mobile')
```

Add `getSchoolStates()` to the existing `Promise.all([...])` so it runs alongside the other queries rather than after them:

```ts
  const [{ data: profile }, { data: familyRows }, states] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('full_name, role, date_of_birth, phone, school_class, school_branch, school_name, school_id, school_state, school_district, city, parent_mobile')
      .eq('id', user.id)
      .single(),
    supabase.rpc('get_my_family'),
    getSchoolStates(),
  ])
```

Then pass them through:

```tsx
      <AccountForm
        role={profile.role}
        email={user.email ?? ''}
        states={states}
        initial={{
          full_name: profile.full_name ?? '',
          date_of_birth: profile.date_of_birth ?? '',
          phone: profile.phone ?? '',
          school_class: profile.school_class ?? '',
          school_branch: profile.school_branch ?? '',
          school_name: profile.school_name ?? '',
          school_id: profile.school_id ?? '',
          school_state: profile.school_state ?? '',
          school_district: profile.school_district ?? '',
          city: profile.city ?? '',
          parent_mobile: profile.parent_mobile ?? '',
        }}
      />
```

- [ ] **Step 6: Update the account action**

In `src/app/(platform)/account/actions.ts`, add the imports:

```ts
import { parseSchoolSelection, validateSchoolSelection } from '@/lib/schools/validate'
import { resolveSchoolId } from '@/app/actions/schools'
```

Inside the existing `if (profile.role === 'student') { … }` block, remove the `schoolName` read and its `!schoolName` guard, and add the cascade handling. The block becomes:

```ts
  if (profile.role === 'student') {
    const schoolClass = (formData.get('school_class') as string)?.trim()
    const city = (formData.get('city') as string)?.trim()
    const schoolBranch = (formData.get('school_branch') as string)?.trim() || null
    const parentMobileRaw = (formData.get('parent_mobile') as string) ?? ''
    const selection = parseSchoolSelection(formData)

    if (!schoolClass || !city) {
      return { error: 'Class and city are required.' }
    }
    const classBranchError = validateClassBranch(schoolClass, schoolBranch)
    if (classBranchError) return { error: classBranchError }
    const mobileError = validateMobile(parentMobileRaw)
    if (mobileError) return { error: mobileError }
    const schoolError = validateSchoolSelection(selection)
    if (schoolError) return { error: schoolError }

    const resolved = await resolveSchoolId(selection)
    if ('error' in resolved) return { error: resolved.error }

    update.school_class    = schoolClass
    update.school_branch   = branchToStore(schoolClass, schoolBranch)
    update.school_id       = resolved.schoolId
    update.school_name     = resolved.name
    update.school_state    = selection.state
    update.school_district = selection.district
    update.city            = city
    update.parent_mobile   = parentMobileRaw.replace(/\s+/g, '')
  }
```

Note the guard text changed from `'Class, school, and city are required.'` to `'Class and city are required.'`, because the school now has its own specific message from `validateSchoolSelection`.

- [ ] **Step 7: Smoke-test both forms in the browser**

Start the app: `npm run dev`

As a signed-in student, visit `/account` and check each of these:

1. **The cascade locks.** District is disabled until a state is chosen; School is disabled until a district is chosen. Each shows its "Select a … first" placeholder.
2. **Changing a parent clears its children.** Pick Maharashtra → Pune → any school, then switch the state to Kerala. District and School must both reset, not keep the Pune values.
3. **Typing narrows the list.** Pick Delhi → New Delhi, type `govt boys`. Several rows appear, each showing a different address beneath the same name.
4. **The school escape hatch.** Choose "My school isn't listed", type a name, save. Reopen `/account` — the typed name is shown.
5. **The district escape hatch.** Pick Sikkim → "My district isn't listed". The school field must switch to manual entry automatically, since there is no list to search.

- [ ] **Step 8: Verify the server rejects a tampered selection**

`resolveSchoolId` re-checks that a submitted school really sits in the submitted state and district. The client never sends a mismatch, so this guard only fires against a tampered request — which means it needs deliberate testing or it will rot unnoticed.

On `/account`, pick **Delhi → New Delhi → any school**. Before submitting, open DevTools and overwrite the state field:

```js
document.querySelector('#school_state').value = 'Kerala'
```

Submit the form.

Expected: the form is rejected with **"That school is not in the selected state and district."** and nothing is written to the profile. If it saves instead, the guard in `resolveSchoolId` is not working — fix it before continuing.

- [ ] **Step 9: Typecheck, test, and build**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: tsc exit 0; all tests pass; `✓ Compiled successfully`.

- [ ] **Step 10: Commit**

```bash
git add src/components src/app
git commit -m "feat: use the school cascade in the onboarding and account forms"
```

---

### Task 6: Widen the details gate

This is the switch-on. It must come last: adding these fields to the gate redirects every existing student to `/onboarding/details`, which only works now that the form can collect them.

**Files:**
- Modify: `src/lib/profile/details.ts`
- Test: `src/lib/profile/__tests__/details.test.ts`
- Modify: `src/app/onboarding/details/page.tsx`, `src/app/actions/auth.ts`, `src/app/(platform)/layout.tsx` (only if their `.select(...)` lists lack the new columns)

**Interfaces:**
- Consumes: nothing new.
- Produces: `StudentDetailsFields` gains `school_state: string | null` and `school_district: string | null`; `isStudentDetailsComplete` requires both.

- [ ] **Step 1: Write the failing tests**

In `src/lib/profile/__tests__/details.test.ts`, add the two new keys to the existing `full` fixture:

```ts
const full = {
  school_class: 'Class 8',
  school_name: 'Delhi Public School',
  school_state: 'Maharashtra',
  school_district: 'Pune',
  city: 'Pune',
  parent_mobile: '9876543210',
}
```

And add these cases inside the existing `describe('isStudentDetailsComplete', ...)`:

```ts
  it('false when school_state is null — this is what re-gates existing students', () =>
    expect(isStudentDetailsComplete({ ...full, school_state: null })).toBe(false))

  it('false when school_district is null', () =>
    expect(isStudentDetailsComplete({ ...full, school_district: null })).toBe(false))

  it('false when school_state is whitespace-only', () =>
    expect(isStudentDetailsComplete({ ...full, school_state: '   ' })).toBe(false))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/profile`
Expected: FAIL — the three new cases return `true` because the fields are not yet checked. (TypeScript will also flag the unknown keys.)

- [ ] **Step 3: Widen the interface and the check**

In `src/lib/profile/details.ts`:

```ts
export interface StudentDetailsFields {
  school_class: string | null
  school_name: string | null
  school_state: string | null
  school_district: string | null
  city: string | null
  parent_mobile: string | null
}

export function isStudentDetailsComplete(p: StudentDetailsFields): boolean {
  return Boolean(
    p.school_class?.trim() &&
      p.school_name?.trim() &&
      p.school_state?.trim() &&
      p.school_district?.trim() &&
      p.city?.trim() &&
      p.parent_mobile?.trim()
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/profile`
Expected: PASS.

- [ ] **Step 5: Make every caller select the new columns**

`isStudentDetailsComplete` is called in three places. Each reads the profile first, so each `.select(...)` must include the new columns or the gate silently always fails.

Run: `grep -rn "isStudentDetailsComplete" src/`

For each hit, confirm the query feeding it selects `school_state, school_district`:
- `src/app/actions/auth.ts` — in `loginAction`
- `src/app/(platform)/layout.tsx` — selects `*`, so already covered
- `src/app/onboarding/details/page.tsx` — selects an explicit list

Run: `npx tsc --noEmit`
Expected: exit 0. A missing column shows up here as a type error on the `isStudentDetailsComplete(profile)` call.

- [ ] **Step 6: Verify an existing student is actually re-gated**

Start the app: `npm run dev`

Log in as `maya@gmail.com` / `12345678` (an existing student whose `school_state` is null).

Expected: redirected to `/onboarding/details`, with the hint reading *"Previously entered: Delhi Public School"*. Complete the cascade — Maharashtra → Pune → any school — and submit. Expected: saved and redirected onward. Log out and back in. Expected: straight to the dashboard, **not** back to the form.

Then confirm the row is correct:

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cat > "$SP/v46.sql" <<'SQL'
SELECT u.email || ' | ' || COALESCE(p.school_state,'NULL') || ' | ' ||
       COALESCE(p.school_district,'NULL') || ' | ' || COALESCE(p.school_name,'NULL') ||
       ' | id=' || COALESCE(p.school_id::text,'NULL') AS r
  FROM public.user_profiles p JOIN auth.users u ON u.id = p.id
 WHERE u.email = 'maya@gmail.com';
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v46.sql"
```

Expected: state, district, name and a non-null `school_id` all populated.

- [ ] **Step 7: Full verification and commit**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: tsc exit 0; all tests pass; `✓ Compiled successfully`.

```bash
git add src/lib/profile src/app
git commit -m "feat: require state and district in the student details gate

Re-routes existing students through the school cascade once, reusing the
gate that already guards the details form."
```

---

## Done when

- `schools` holds 32,882 approved CBSE rows across 36 states and 740 districts.
- A new student can complete onboarding only by picking a real school, or by using either escape hatch — which lands a `pending` row for admin review.
- Every pre-existing student is routed through the cascade exactly once, then never again.
- `npx tsc --noEmit`, `npx vitest run` and `npx next build` are all clean.
