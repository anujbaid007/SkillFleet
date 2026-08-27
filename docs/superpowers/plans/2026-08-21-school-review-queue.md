# School Review Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins a queue to approve, reject, or de-duplicate the schools students add through the "My school isn't listed" escape hatch.

**Architecture:** Mirrors the two review workflows this codebase already has — the `/admin/certificates` queue page and the `admin_review_offering` RPC. Adds trigram matching (`pg_trgm`) to surface likely duplicates within the same district, a merge action that repoints affected students onto the canonical school, and a soft notice for a student whose school was rejected.

**Tech Stack:** Next.js 16 App Router · Supabase/PostgreSQL · `pg_trgm` · TypeScript · Vitest

**Design:** agreed in conversation on 2026-08-21; the two open questions were settled as:
- **Rejected schools do not re-gate the student.** Their profile is left intact and a dismissible-by-fixing notice appears instead (option 3 of 3 offered).
- **Duplicate detection ships now**, not in a later pass.

Follows on from `docs/superpowers/specs/2026-08-21-school-location-cascade-design.md`, which created the `schools` table and deliberately scoped this queue out.

## Global Constraints

- **`AGENTS.md` applies:** this Next.js version has breaking changes from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing App Router code. `params`/`searchParams` are `Promise<{…}>`.
- **Supabase project is `bbioktywqkfvpzmakdxt` only.** Never touch `happyfleet`.
- **`supabase/` is gitignored.** Migrations are written and applied but **never** `git add`ed.
- **Migrations applied via the Management API:** `powershell -NoProfile -File <scratchpad>/sbq.ps1 -File <file.sql>`. MCP is disconnected.
- **Migration numbering continues from `0045`.**
- **All SECURITY DEFINER functions use `SET search_path = ''`** and schema-qualify every identifier (`public.schools`, `auth.uid()`, `extensions.similarity()`).
- **`pg_trgm` installs into the `extensions` schema**, like `pgcrypto` on this project — so its functions are called as `extensions.similarity(...)`.
- **Do not push, and do not touch `main`.** Work stays on `feature/nikhil`.
- **Rejection requires a note.** Approval does not.

---

## File Structure

**Created:**
| Path | Responsibility |
|---|---|
| `supabase/migrations/0046_school_review.sql` | Review columns, `pg_trgm`, and the three RPCs. *Not committed.* |
| `src/app/(admin)/admin/schools/page.tsx` | The queue: pending rows, each with its duplicate candidates. |
| `src/app/(admin)/admin/schools/actions.ts` | Server actions wrapping `admin_review_school`. |
| `src/components/admin/school-review-row.tsx` | One pending school + its approve / reject / merge controls. |
| `src/components/platform/school-rejected-notice.tsx` | The student-facing notice, shared by dashboard and account. |

**Modified:**
| Path | Change |
|---|---|
| `src/lib/types/database.ts` | Three new RPC signatures; three new `schools` columns. |
| `src/components/admin/admin-nav.tsx` | Add the `Schools` entry. |
| `src/app/(platform)/dashboard/page.tsx` | Render the notice when the student's school was rejected. |
| `src/app/(platform)/account/page.tsx` | Render the same notice above the form. |

**Why a shared notice component:** it appears in two places with identical copy. A second inline copy would drift.

---

### Task 1: Review columns, trigram matching, and the review RPCs

**Files:**
- Create: `supabase/migrations/0046_school_review.sql` (not committed)
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Consumes: `public.schools` and `public.is_admin()` (both already exist).
- Produces: columns `schools.review_notes text`, `schools.reviewed_by uuid`, `schools.reviewed_at timestamptz`; RPCs `find_similar_schools(p_school_id uuid) → TABLE(id uuid, name text, address text, review_status text, score real)`, `admin_review_school(p_school_id uuid, p_decision text, p_notes text, p_merge_into uuid) → text`, `get_my_school_review_status() → TABLE(school_name text, review_status text, review_notes text)`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0046_school_review.sql`:

```sql
-- 0046: Admin review queue for schools students added themselves.
-- 0045 created pending rows via add_pending_school but nothing to action them.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Same three review columns offerings already carries, for the same reason.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;

/**
 * Likely duplicates of one pending school.
 *
 * Scoped to the same state and district first, which removes almost all the
 * noise; a low similarity threshold is deliberate on top of that. A false
 * positive costs an admin one glance, whereas a missed duplicate silently
 * splits one real school into two ids — and anything that groups students by
 * school (the ISC wildcard cap, a coordinator roster) then splits with it.
 */
CREATE OR REPLACE FUNCTION public.find_similar_schools(p_school_id UUID)
RETURNS TABLE (id UUID, name TEXT, address TEXT, review_status TEXT, score REAL)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT o.id, o.name, o.address, o.review_status,
         extensions.similarity(lower(o.name), lower(s.name))
    FROM public.schools s
    JOIN public.schools o
      ON o.id <> s.id
     AND o.state = s.state
     AND o.district = s.district
     AND o.review_status IN ('approved', 'pending')
   WHERE s.id = p_school_id
     AND public.is_admin()
     AND extensions.similarity(lower(o.name), lower(s.name)) > 0.3
   ORDER BY 5 DESC
   LIMIT 5;
$$;

/**
 * Approve, reject, or merge one pending school.
 *
 * Merge targets must already be approved. Two pending duplicates are handled
 * by approving one and then merging the other into it — two clicks, but it
 * never leaves a student pointed at something unapproved.
 */
CREATE OR REPLACE FUNCTION public.admin_review_school(
  p_school_id  UUID,
  p_decision   TEXT,                  -- 'approve' | 'reject' | 'merge'
  p_notes      TEXT DEFAULT NULL,
  p_merge_into UUID DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_target RECORD;
  v_notes  TEXT := NULLIF(BTRIM(COALESCE(p_notes, '')), '');
BEGIN
  IF NOT public.is_admin() THEN RETURN 'forbidden'; END IF;

  IF p_decision = 'approve' THEN
    UPDATE public.schools
       SET review_status = 'approved', review_notes = v_notes,
           reviewed_by = auth.uid(), reviewed_at = NOW()
     WHERE id = p_school_id AND review_status = 'pending';
    IF NOT FOUND THEN RETURN 'not_pending'; END IF;
    RETURN 'approved';

  ELSIF p_decision = 'reject' THEN
    -- A rejection is the one outcome a student may have to act on, so it must
    -- carry a reason.
    IF v_notes IS NULL THEN RETURN 'notes_required'; END IF;
    UPDATE public.schools
       SET review_status = 'rejected', review_notes = v_notes,
           reviewed_by = auth.uid(), reviewed_at = NOW()
     WHERE id = p_school_id AND review_status = 'pending';
    IF NOT FOUND THEN RETURN 'not_pending'; END IF;
    RETURN 'rejected';

  ELSIF p_decision = 'merge' THEN
    IF p_merge_into IS NULL THEN RETURN 'merge_target_required'; END IF;
    IF p_merge_into = p_school_id THEN RETURN 'merge_into_self'; END IF;

    SELECT * INTO v_target FROM public.schools WHERE id = p_merge_into;
    IF NOT FOUND THEN RETURN 'merge_target_missing'; END IF;
    IF v_target.review_status <> 'approved' THEN RETURN 'merge_target_not_approved'; END IF;

    -- Move every student off the duplicate and onto the real school, keeping
    -- their denormalised copies in step so nothing goes stale.
    UPDATE public.user_profiles
       SET school_id       = v_target.id,
           school_name     = v_target.name,
           school_state    = v_target.state,
           school_district = v_target.district,
           updated_at      = NOW()
     WHERE school_id = p_school_id;

    UPDATE public.schools
       SET review_status = 'rejected',
           review_notes  = 'Merged into ' || v_target.name,
           reviewed_by   = auth.uid(), reviewed_at = NOW()
     WHERE id = p_school_id;
    RETURN 'merged';
  END IF;

  RETURN 'bad_decision';
END;
$$;

/**
 * The caller's own school and its review state.
 *
 * SECURITY DEFINER on purpose: if a school was approved, selected by several
 * students, and later rejected, RLS would hide it from everyone except its
 * original creator — and those students are exactly the ones who need telling.
 */
CREATE OR REPLACE FUNCTION public.get_my_school_review_status()
RETURNS TABLE (school_name TEXT, review_status TEXT, review_notes TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT s.name, s.review_status, s.review_notes
    FROM public.user_profiles p
    JOIN public.schools s ON s.id = p.school_id
   WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.find_similar_schools(UUID)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_school(UUID, TEXT, TEXT, UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_school_review_status()                 TO authenticated;
```

- [ ] **Step 2: Apply the migration**

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cp supabase/migrations/0046_school_review.sql "$SP/m46.sql"
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/m46.sql"
```

Expected: no output (the helper prints only on error).

- [ ] **Step 3: Verify the objects exist and pg_trgm landed in `extensions`**

```bash
cat > "$SP/v46.sql" <<'SQL'
SELECT 'trgm schema: ' || COALESCE(
   (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
     WHERE e.extname='pg_trgm'), 'NOT INSTALLED') AS r
UNION ALL SELECT 'fns: ' || COALESCE(string_agg(p.proname, ',' ORDER BY p.proname), 'MISSING')
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
   AND p.proname IN ('find_similar_schools','admin_review_school','get_my_school_review_status')
UNION ALL SELECT 'review cols: ' || COALESCE(string_agg(column_name, ',' ORDER BY column_name), 'MISSING')
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='schools'
   AND column_name IN ('review_notes','reviewed_by','reviewed_at');
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v46.sql"
```

Expected: `trgm schema: extensions`, all three function names, all three column names.

- [ ] **Step 4: Verify approve / reject / merge behaviour against the live database**

This runs as a real admin and a real student inside one transaction that is rolled back at the end.

```bash
cat > "$SP/t46.sql" <<'SQL'
DO $$
DECLARE
  adm uuid; stu uuid; dup uuid; real_id uuid; res text; n int; out_txt text := '';
BEGIN
  SELECT id INTO adm FROM public.user_profiles WHERE role='admin' LIMIT 1;
  SELECT id INTO stu FROM auth.users WHERE email='sara@gmail.com';
  SELECT id INTO real_id FROM public.schools
   WHERE state='Maharashtra' AND district='Pune' AND review_status='approved' LIMIT 1;

  -- A student adds a near-duplicate of that approved school.
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', stu,'role','authenticated')::text, true);
  SELECT public.add_pending_school(
    (SELECT name FROM public.schools WHERE id=real_id) || ' ', 'Maharashtra', 'Pune') INTO dup;
  UPDATE public.user_profiles SET school_id = dup WHERE id = stu;
  out_txt := out_txt || format('1) duplicate created = %s', dup IS NOT NULL) || E'\n';

  -- A student must not be able to review anything.
  SELECT public.admin_review_school(dup, 'approve') INTO res;
  out_txt := out_txt || format('2) student approves -> %s (want forbidden)', res) || E'\n';

  -- Admin sees it as a likely duplicate.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm,'role','authenticated')::text, true);
  SELECT count(*) INTO n FROM public.find_similar_schools(dup) WHERE id = real_id;
  out_txt := out_txt || format('3) real school offered as candidate = %s (want 1)', n) || E'\n';

  -- Rejection without a reason is refused.
  SELECT public.admin_review_school(dup, 'reject', '   ') INTO res;
  out_txt := out_txt || format('4) reject with blank note -> %s (want notes_required)', res) || E'\n';

  -- Merge moves the student onto the real school.
  SELECT public.admin_review_school(dup, 'merge', NULL, real_id) INTO res;
  out_txt := out_txt || format('5) merge -> %s (want merged)', res) || E'\n';
  SELECT count(*) INTO n FROM public.user_profiles WHERE id=stu AND school_id=real_id;
  out_txt := out_txt || format('6) student repointed to real school = %s (want 1)', n) || E'\n';
  SELECT count(*) INTO n FROM public.user_profiles p JOIN public.schools s ON s.id=p.school_id
   WHERE p.id=stu AND p.school_name=s.name AND p.school_district=s.district;
  out_txt := out_txt || format('7) denormalised copies in step = %s (want 1)', n) || E'\n';

  -- Reviewing an already-decided row is refused.
  SELECT public.admin_review_school(dup, 'approve') INTO res;
  out_txt := out_txt || format('8) approve after merge -> %s (want not_pending)', res) || E'\n';

  -- Merging into something unapproved is refused.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', stu,'role','authenticated')::text, true);
  SELECT public.add_pending_school('Another Test School','Maharashtra','Pune') INTO dup;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm,'role','authenticated')::text, true);
  SELECT public.admin_review_school(dup, 'merge', NULL, dup) INTO res;
  out_txt := out_txt || format('9) merge into self -> %s (want merge_into_self)', res) || E'\n';

  RAISE EXCEPTION E'\n%', out_txt;   -- aborts, rolling every change back
END $$;
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/t46.sql"
```

Expected, each line matching its `(want …)`: duplicate created `t`; student approve `forbidden`; candidate found `1`; blank note `notes_required`; merge `merged`; repointed `1`; copies in step `1`; approve after merge `not_pending`; merge into self `merge_into_self`.

The `RAISE EXCEPTION` is deliberate — it aborts the transaction so none of this test data persists.

- [ ] **Step 5: Add the database types**

In `src/lib/types/database.ts`, add to the `schools` `Row` block: `review_notes: string | null`, `reviewed_by: string | null`, `reviewed_at: string | null`. Add the same three to its `Insert` and `Update` blocks as optional (`review_notes?: string | null`, etc.).

Add to the `Functions` block:

```ts
      find_similar_schools: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          name: string
          address: string | null
          review_status: string
          score: number
        }[]
      }
      admin_review_school: {
        Args: {
          p_school_id: string
          p_decision: string
          p_notes?: string | null
          p_merge_into?: string | null
        }
        Returns: string
      }
      get_my_school_review_status: {
        Args: Record<string, never>
        Returns: { school_name: string; review_status: string; review_notes: string | null }[]
      }
```

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

```bash
git add src/lib/types/database.ts
git commit -m "feat: review columns and RPCs for the school queue"
```

`supabase/migrations/0046_school_review.sql` is deliberately not added — `supabase/` is gitignored.

---

### Task 2: The admin queue

**Files:**
- Create: `src/app/(admin)/admin/schools/page.tsx`
- Create: `src/app/(admin)/admin/schools/actions.ts`
- Create: `src/components/admin/school-review-row.tsx`
- Modify: `src/components/admin/admin-nav.tsx`

**Interfaces:**
- Consumes: `find_similar_schools`, `admin_review_school` (Task 1).
- Produces: route `/admin/schools`; `reviewSchoolAction(prev, formData) → { error?, ok? }` reading form fields `school_id`, `decision`, `notes`, `merge_into`.

- [ ] **Step 1: Write the server action**

Create `src/app/(admin)/admin/schools/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SchoolReviewState = { error?: string; ok?: string } | undefined

const ERR: Record<string, string> = {
  forbidden: 'Admins only.',
  not_pending: 'That school has already been reviewed.',
  notes_required: 'Give a reason when rejecting a school.',
  merge_target_required: 'Choose which school to merge into.',
  merge_target_missing: 'That school no longer exists.',
  merge_target_not_approved: 'You can only merge into an approved school — approve it first.',
  merge_into_self: 'A school cannot be merged into itself.',
  bad_decision: 'Unknown action.',
}

const DONE: Record<string, string> = {
  approved: 'School approved — students can now find it.',
  rejected: 'School rejected.',
  merged: 'Merged. Any students on the duplicate now point at the real school.',
}

export async function reviewSchoolAction(
  _prev: SchoolReviewState,
  formData: FormData
): Promise<SchoolReviewState> {
  const schoolId = (formData.get('school_id') as string)?.trim()
  const decision = (formData.get('decision') as string)?.trim()
  const notes = ((formData.get('notes') as string) ?? '').trim() || null
  const mergeInto = ((formData.get('merge_into') as string) ?? '').trim() || null

  if (!schoolId || !decision) return { error: 'Missing school or action.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_review_school', {
    p_school_id: schoolId,
    p_decision: decision,
    p_notes: notes,
    p_merge_into: mergeInto,
  })

  if (error) return { error: 'Something went wrong. Please try again.' }

  const status = (data as string) ?? ''
  if (!DONE[status]) return { error: ERR[status] ?? 'Could not complete that.' }

  revalidatePath('/admin/schools')
  return { ok: DONE[status] }
}
```

- [ ] **Step 2: Write the row component**

Create `src/components/admin/school-review-row.tsx`:

```tsx
'use client'

import { useActionState, useState } from 'react'
import { reviewSchoolAction, type SchoolReviewState } from '@/app/(admin)/admin/schools/actions'

export interface SimilarSchool {
  id: string
  name: string
  address: string | null
  review_status: string
  score: number
}

export interface PendingSchool {
  id: string
  name: string
  state: string
  district: string
  created_at: string
  submittedBy: string
  similar: SimilarSchool[]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** One pending school, its likely duplicates, and the three decisions. */
export function SchoolReviewRow({ school }: { school: PendingSchool }) {
  const [state, action, pending] = useActionState<SchoolReviewState, FormData>(
    reviewSchoolAction,
    undefined
  )
  const [rejecting, setRejecting] = useState(false)

  // Only an approved school can absorb a duplicate.
  const mergeable = school.similar.filter((s) => s.review_status === 'approved')

  if (state?.ok) {
    return (
      <div className="px-5 py-4 text-sm text-green-700 bg-green-50">{state.ok}</div>
    )
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{school.name}</p>
          <p className="text-xs text-muted">
            {school.district}, {school.state} · added by {school.submittedBy} ·{' '}
            {fmtDate(school.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <form action={action}>
            <input type="hidden" name="school_id" value={school.id} />
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
          <input type="hidden" name="school_id" value={school.id} />
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

      {mergeable.length > 0 && (
        <div className="rounded-xl bg-accent-yellow/[0.08] border border-accent-yellow/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Possibly the same as {mergeable.length === 1 ? 'this' : 'one of these'}:
          </p>
          {mergeable.map((m) => (
            <form key={m.id} action={action} className="flex items-center gap-3 flex-wrap">
              <input type="hidden" name="school_id" value={school.id} />
              <input type="hidden" name="decision" value="merge" />
              <input type="hidden" name="merge_into" value={m.id} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground">{m.name}</span>
                {m.address && <span className="block text-xs text-muted truncate">{m.address}</span>}
              </span>
              <button
                type="submit"
                disabled={pending}
                className="px-3 h-8 rounded-lg text-xs font-semibold border border-primary text-primary hover:bg-primary/[0.06] disabled:opacity-60 shrink-0"
              >
                Merge into this
              </button>
            </form>
          ))}
        </div>
      )}

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Write the queue page**

Create `src/app/(admin)/admin/schools/page.tsx`:

```tsx
import { School } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import {
  SchoolReviewRow,
  type PendingSchool,
  type SimilarSchool,
} from '@/components/admin/school-review-row'

interface RawPending {
  id: string
  name: string
  state: string
  district: string
  created_at: string
  created_by: string | null
}

export default async function AdminSchoolsPage() {
  const supabase = await createClient()

  const { data: pending } = (await supabase
    .from('schools')
    .select('id, name, state, district, created_at, created_by')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false })) as unknown as { data: RawPending[] | null }

  const rows = pending ?? []

  // Who submitted each one.
  const submitterIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[]
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', submitterIds.length ? submitterIds : ['00000000-0000-0000-0000-000000000000'])
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  // Candidate duplicates, one lookup per pending row. The queue is short by
  // design — if it ever is not, that is the signal to paginate.
  const withSimilar: PendingSchool[] = await Promise.all(
    rows.map(async (r) => {
      const { data: similar } = await supabase.rpc('find_similar_schools', { p_school_id: r.id })
      return {
        id: r.id,
        name: r.name,
        state: r.state,
        district: r.district,
        created_at: r.created_at,
        submittedBy: (r.created_by && nameById.get(r.created_by)) || 'Unknown student',
        similar: (similar ?? []) as SimilarSchool[],
      }
    })
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review queue"
        icon={School}
        title="Schools"
        subtitle="Schools students added because they could not find theirs in the list."
      />

      {withSimilar.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">
          Nothing waiting — every school students have added has been reviewed.
        </div>
      ) : (
        <Reveal delay={0.05}>
          <div className="clay-card divide-y divide-black/[0.06]">
            {withSimilar.map((s) => (
              <SchoolReviewRow key={s.id} school={s} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add the nav entry**

In `src/components/admin/admin-nav.tsx`, add `School` to the `lucide-react` import, then add this line to `adminNavItems` directly after the `Vendors` entry:

```ts
  { href: '/admin/schools', label: 'Schools', icon: School },
```

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: tsc exit 0; `✓ Compiled successfully`; `/admin/schools` appears in the route list.

- [ ] **Step 6: Exercise the queue in the browser**

Start the app: `npm run dev`

Sign in as `admin@skillfleet.test`, open **Schools** in the admin sidebar.

Expected: the queue lists `XYZ` (Chhattisgarh / Dhamtari), showing who added it and when. Approve it. Expected: the row is replaced by *"School approved — students can now find it."*

Then confirm it really is live for students:

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cat > "$SP/v46b.sql" <<'SQL'
SELECT name || ' -> ' || review_status || ' | reviewed_by set = ' ||
       (reviewed_by IS NOT NULL)::text AS r
  FROM public.schools WHERE name = 'XYZ';
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/v46b.sql"
```

Expected: `XYZ -> approved | reviewed_by set = t`.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(admin)/admin/schools" src/components/admin/school-review-row.tsx src/components/admin/admin-nav.tsx
git commit -m "feat: admin review queue for student-added schools"
```

---

### Task 3: Tell a student their school was rejected

A rejection deliberately does **not** re-gate the student — their profile is left exactly as it is and a notice appears instead, so they are never interrupted mid-task. The notice clears itself: once they pick an approved school, `school_id` no longer points at a rejected row.

**Files:**
- Create: `src/components/platform/school-rejected-notice.tsx`
- Modify: `src/app/(platform)/dashboard/page.tsx`
- Modify: `src/app/(platform)/account/page.tsx`

**Interfaces:**
- Consumes: `get_my_school_review_status` (Task 1).
- Produces: `<SchoolRejectedNotice schoolName reason />`.

- [ ] **Step 1: Write the notice component**

Create `src/components/platform/school-rejected-notice.tsx`:

```tsx
import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'

/**
 * Shown when the school a student typed in was rejected by an admin.
 *
 * Deliberately a notice rather than a redirect: their profile is still valid
 * and nothing they can do right now is blocked, so interrupting them would
 * cost more than it gains. It disappears on its own once they pick a listed
 * school.
 */
export function SchoolRejectedNotice({
  schoolName,
  reason,
}: {
  schoolName: string
  reason: string | null
}) {
  return (
    <div className="clay-card p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-yellow to-accent-pink flex items-center justify-center text-white shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-foreground text-sm">
          We couldn&apos;t verify “{schoolName}”
        </p>
        <p className="text-xs text-muted">
          {reason ? `${reason} — please` : 'Please'} pick your school again from the list.
        </p>
      </div>
      <Link
        href="/account"
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        Update <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Show it on the dashboard**

In `src/app/(platform)/dashboard/page.tsx`, add the import:

```tsx
import { SchoolRejectedNotice } from '@/components/platform/school-rejected-notice'
```

Add `supabase.rpc('get_my_school_review_status')` as a **sixth** entry to the existing `Promise.all([...])` — it currently fetches scores, parameters, levels, family and pending members — destructuring it as `{ data: schoolReview }` at the end of the array pattern. Then derive:

```tsx
  const rejectedSchool = ((schoolReview ?? []) as
    { school_name: string; review_status: string; review_notes: string | null }[])
    .find((s) => s.review_status === 'rejected') ?? null
```

Render it immediately after the pending-family banner block, so both sit together above the strengths grid:

```tsx
      {rejectedSchool && (
        <Reveal delay={0.045}>
          <SchoolRejectedNotice
            schoolName={rejectedSchool.school_name}
            reason={rejectedSchool.review_notes}
          />
        </Reveal>
      )}
```

- [ ] **Step 3: Show it on the account page**

In `src/app/(platform)/account/page.tsx`, add the import:

```tsx
import { SchoolRejectedNotice } from '@/components/platform/school-rejected-notice'
```

Add `supabase.rpc('get_my_school_review_status')` to the existing `Promise.all([...])` (which already fetches the profile, family and states), destructured as `{ data: schoolReview }`. Derive `rejectedSchool` exactly as in Step 2, then render it directly above `<AccountForm …>` — this is the page where the fix happens, so the notice belongs beside the form:

```tsx
      {rejectedSchool && (
        <Reveal delay={0.045}>
          <SchoolRejectedNotice
            schoolName={rejectedSchool.school_name}
            reason={rejectedSchool.review_notes}
          />
        </Reveal>
      )}
```

- [ ] **Step 4: Typecheck, test and build**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: tsc exit 0; all tests pass; `✓ Compiled successfully`.

- [ ] **Step 5: Verify the notice appears, and clears itself**

Create a rejected school for a student you can log in as:

```bash
SP="C:/Users/NIKHIL~1/AppData/Local/Temp/claude/c--Users-Nikhil-Koltharkar-Downloads-SkillFleet-main/eeef166a-4edc-44e6-893a-cae6860dc3e5/scratchpad"
cat > "$SP/seed46.sql" <<'SQL'
WITH s AS (
  INSERT INTO public.schools (name, state, district, source, review_status, review_notes)
  VALUES ('Notice Test School', 'Maharashtra', 'Pune', 'user_added', 'rejected',
          'We could not find this school on the CBSE register')
  RETURNING id
)
UPDATE public.user_profiles p
   SET school_id = s.id, school_name = 'Notice Test School',
       school_state = 'Maharashtra', school_district = 'Pune'
  FROM s, auth.users u
 WHERE u.id = p.id AND u.email = 'rhea@gmail.com';
SELECT 'seeded' AS r;
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/seed46.sql"
```

Sign in as `rhea@gmail.com` / `12345678`.

Expected: the dashboard shows *"We couldn't verify 'Notice Test School'"* with the admin's reason, and **no redirect** — she lands on the dashboard normally. `/account` shows the same notice above the form.

Now pick a real school on `/account` and save. Expected: the notice is gone from both pages, with nothing to dismiss.

Clean up the test row:

```bash
cat > "$SP/clean46.sql" <<'SQL'
DELETE FROM public.schools WHERE name = 'Notice Test School';
SELECT 'rejected rows left: ' || count(*)::text AS r
  FROM public.schools WHERE review_status='rejected';
SQL
powershell -NoProfile -File "$SP/sbq.ps1" -File "$SP/clean46.sql"
```

Note: deleting the school sets any lingering `school_id` to NULL via `ON DELETE SET NULL`. If Rhea had not re-picked, her `school_name` text would remain — which is exactly why the notice keys off `school_id`, not the text.

- [ ] **Step 6: Commit**

```bash
git add src/components/platform/school-rejected-notice.tsx "src/app/(platform)/dashboard/page.tsx" "src/app/(platform)/account/page.tsx"
git commit -m "feat: notify a student when their school is rejected"
```

---

## Done when

- `/admin/schools` lists every pending school with who added it, and surfaces likely duplicates in the same district.
- Approve makes a school searchable for every student; reject requires a reason; merge repoints affected students onto the canonical school and keeps their denormalised fields in step.
- A student whose school was rejected sees a notice on the dashboard and on `/account`, is never redirected, and the notice clears itself once they pick a listed school.
- `npx tsc --noEmit`, `npx vitest run` and `npx next build` are all clean.
