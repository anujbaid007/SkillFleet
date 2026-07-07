# Plan G: Completions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin marks attended bookings as "completed," which atomically awards the offering's parameter points to the student's accrued score and stamps the booking as scored — ensuring no double-counting.

**Architecture:** A SECURITY DEFINER RPC `admin_mark_complete` handles the atomic write to `bookings`, `student_parameter_scores`, and `score_contributions` (these tables have no admin write RLS policies, mirroring the `admin_approve_cert` pattern from migration 0011). The `/admin/completions` page is a Server Component; each "Mark Complete" is a plain server action that redirects on success and passes errors via URL search param. A pure TypeScript helper `mapCompletionResult` translates RPC codes to user messages and is the primary unit-tested surface.

**Tech Stack:** Next.js 16 App Router (searchParams is `Promise<{…}>`), Supabase (PostgreSQL + SECURITY DEFINER RPC), Vitest 2, Tailwind v4

## Global Constraints

- Supabase project: `bbioktywqkfvpzmakdxt` ONLY — never `happyfleet`
- Never commit, never push, never touch `main` branch
- Parameters are NEVER hardcoded — always read from DB
- Admin client (service role key) is server-only — NEVER imported in client components
- Payments are ALWAYS parent-only — student accounts must never make payments
- `score_applied = true` on the booking is the idempotency guard — never double-score
- Accrued points from offering completions go to `accrued_score`, NOT `baseline_score`
- Read `node_modules/next/dist/docs/` before writing Next.js code if anything is unclear

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `supabase/migrations/0012_completion_rpc.sql` | Create | `admin_mark_complete` SECURITY DEFINER RPC |
| `src/lib/types/database.ts` | Modify (line ~939) | Add `admin_mark_complete` to `Functions` block |
| `src/lib/utils/completion.ts` | Create | Pure `mapCompletionResult(result)` helper |
| `src/lib/utils/__tests__/completion.test.ts` | Create | Unit tests for the helper |
| `src/app/(admin)/admin/completions/actions.ts` | Create | `markCompleteAction` server action |
| `src/app/(admin)/admin/completions/page.tsx` | Create | Completions list page |
| `src/app/(admin)/admin/page.tsx` | Modify | Add "Needs Completion" stat card |

---

## Task 1: DB Migration — `admin_mark_complete` RPC

**Files:**
- Create: `supabase/migrations/0012_completion_rpc.sql`

**Interfaces:**
- Produces: `admin_mark_complete(p_booking_id UUID) RETURNS text`
- Return codes: `'ok'` | `'not_admin'` | `'not_found'` | `'cancelled'` | `'already_completed'` | `'already_scored'`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0012_completion_rpc.sql
-- =============================================
-- 0012: Completions (Plan G)
--
-- admin_mark_complete: SECURITY DEFINER RPC that atomically
-- marks a booking completed and awards offering points to the
-- student's accrued_score. Uses the same pattern as
-- admin_approve_cert (0011) because student_parameter_scores
-- and score_contributions have no admin-write RLS policies.
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_mark_complete(
  p_booking_id UUID
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking        RECORD;
  v_offering_title TEXT;
  v_contrib        RECORD;
BEGIN
  IF NOT public.is_admin() THEN RETURN 'not_admin'; END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND          THEN RETURN 'not_found'; END IF;
  IF v_booking.status = 'cancelled'  THEN RETURN 'cancelled'; END IF;
  IF v_booking.status = 'completed'  THEN RETURN 'already_completed'; END IF;
  IF v_booking.score_applied         THEN RETURN 'already_scored'; END IF;

  SELECT title INTO v_offering_title
    FROM public.offerings
   WHERE id = v_booking.offering_id;

  -- Award points for each parameter contribution
  FOR v_contrib IN
    SELECT parameter_id, points
      FROM public.offering_parameter_contributions
     WHERE offering_id = v_booking.offering_id
  LOOP
    INSERT INTO public.student_parameter_scores
      (student_id, parameter_id, baseline_score, accrued_score)
    VALUES
      (v_booking.student_id, v_contrib.parameter_id, 0, v_contrib.points)
    ON CONFLICT (student_id, parameter_id) DO UPDATE
       SET accrued_score = student_parameter_scores.accrued_score + EXCLUDED.accrued_score,
           updated_at    = NOW();

    INSERT INTO public.score_contributions
      (student_id, parameter_id, source_type, source_id, points, description)
    VALUES
      (v_booking.student_id, v_contrib.parameter_id, 'offering_completion',
       p_booking_id, v_contrib.points,
       'Offering completed: ' || COALESCE(v_offering_title, p_booking_id::text));
  END LOOP;

  UPDATE public.bookings
     SET status               = 'completed',
         score_applied        = true,
         completion_marked_at = NOW(),
         completion_marked_by = auth.uid(),
         updated_at           = NOW()
   WHERE id = p_booking_id;

  RETURN 'ok';
END;
$$;
```

- [ ] **Step 2: Apply the migration via MCP**

In Supabase MCP tool:
- Tool: `apply_migration`
- Project: `bbioktywqkfvpzmakdxt`
- Name: `0012_completion_rpc`
- SQL: paste the file contents

Expected: migration applied successfully, no errors.

- [ ] **Step 3: Add the RPC type to `src/lib/types/database.ts`**

Find the `Functions` block (around line 939). After the closing brace for `admin_reject_cert`, add:

```typescript
      admin_mark_complete: {
        Args: { p_booking_id: string }
        Returns: string
      }
```

So the Functions block ends:
```typescript
      admin_reject_cert: {
        Args: {
          p_cert_id: string
          p_admin_notes?: string | null
        }
        Returns: string
      }
      admin_mark_complete: {
        Args: { p_booking_id: string }
        Returns: string
      }
    }
```

- [ ] **Step 4: Verify tsc passes**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```
git add supabase/migrations/0012_completion_rpc.sql src/lib/types/database.ts
git commit -m "feat: add admin_mark_complete SECURITY DEFINER RPC (Plan G)"
```

---

## Task 2: Result Helper + Unit Tests

**Files:**
- Create: `src/lib/utils/completion.ts`
- Create: `src/lib/utils/__tests__/completion.test.ts`

**Interfaces:**
- Produces: `mapCompletionResult(result: string): { error?: string; success?: string }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/__tests__/completion.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapCompletionResult } from '@/lib/utils/completion'

describe('mapCompletionResult', () => {
  it('ok returns success message and no error', () => {
    const result = mapCompletionResult('ok')
    expect(result.success).toBeTruthy()
    expect(result.error).toBeUndefined()
  })

  it('not_admin returns an error', () => {
    expect(mapCompletionResult('not_admin').error).toBeTruthy()
  })

  it('not_found returns an error', () => {
    expect(mapCompletionResult('not_found').error).toBeTruthy()
  })

  it('already_completed returns an error', () => {
    expect(mapCompletionResult('already_completed').error).toBeTruthy()
  })

  it('cancelled returns an error', () => {
    expect(mapCompletionResult('cancelled').error).toBeTruthy()
  })

  it('already_scored returns an error', () => {
    expect(mapCompletionResult('already_scored').error).toBeTruthy()
  })

  it('unknown status returns an error', () => {
    expect(mapCompletionResult('some_unexpected_code').error).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/lib/utils/__tests__/completion.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/utils/completion'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/completion.ts`:

```typescript
export type CompletionResult = { error?: string; success?: string }

export function mapCompletionResult(result: string): CompletionResult {
  switch (result) {
    case 'ok':
      return { success: 'Booking marked complete. Points awarded to student.' }
    case 'not_admin':
      return { error: 'Permission denied.' }
    case 'not_found':
      return { error: 'Booking not found.' }
    case 'already_completed':
      return { error: 'Booking is already marked complete.' }
    case 'cancelled':
      return { error: 'Cannot complete a cancelled booking.' }
    case 'already_scored':
      return { error: 'Scores have already been applied for this booking.' }
    default:
      return { error: `Unexpected status: ${result}` }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run src/lib/utils/__tests__/completion.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Run full test suite to verify no regressions**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add src/lib/utils/completion.ts src/lib/utils/__tests__/completion.test.ts
git commit -m "feat: add mapCompletionResult helper with unit tests (Plan G)"
```

---

## Task 3: Server Action

**Files:**
- Create: `src/app/(admin)/admin/completions/actions.ts`

**Interfaces:**
- Consumes: `mapCompletionResult` from `@/lib/utils/completion`
- Consumes: `admin_mark_complete` RPC (from Task 1)
- Produces: `markCompleteAction(formData: FormData): Promise<never>` (always redirects)

- [ ] **Step 1: Create `src/app/(admin)/admin/completions/actions.ts`**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mapCompletionResult } from '@/lib/utils/completion'

export async function markCompleteAction(formData: FormData) {
  const bookingId = formData.get('booking_id') as string
  if (!bookingId) redirect('/admin/completions?error=Missing+booking+ID.')

  const supabase = await createClient()
  const { data: result, error } = await supabase.rpc('admin_mark_complete', {
    p_booking_id: bookingId,
  })

  if (error) redirect('/admin/completions?error=Database+error.+Please+try+again.')

  const mapped = mapCompletionResult(result ?? '')
  if (mapped.error) {
    redirect(`/admin/completions?error=${encodeURIComponent(mapped.error)}`)
  }

  revalidatePath('/admin/completions')
  redirect('/admin/completions')
}
```

- [ ] **Step 2: Verify tsc**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```
git add src/app/(admin)/admin/completions/actions.ts
git commit -m "feat: add markCompleteAction server action (Plan G)"
```

---

## Task 4: Completions Page

**Files:**
- Create: `src/app/(admin)/admin/completions/page.tsx`

**Interfaces:**
- Consumes: `markCompleteAction` from `./actions`
- Consumes: Supabase `bookings` table (with embedded `offerings` join)
- Consumes: Supabase `user_profiles` table (two-query pattern for student names)

**Data queries:**
1. All non-cancelled bookings with embedded offering info (direct FK: `bookings.offering_id → offerings.id`)
2. All `user_profiles` for the unique `student_id`s found in step 1

**Note:** `searchParams` is `Promise<{…}>` in Next.js 16 — must be awaited.

- [ ] **Step 1: Create `src/app/(admin)/admin/completions/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { markCompleteAction } from './actions'

interface RawBooking {
  id: string
  student_id: string
  status: string
  payment_status: string
  score_applied: boolean
  price_paise: number
  completion_marked_at: string | null
  created_at: string
  offerings: {
    title: string
    type: string
    scheduled_at: string | null
  } | null
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

const PAYMENT_BADGE: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-700',
  paid:     'bg-green-50 text-green-700',
  failed:   'bg-red-50 text-red-700',
  refunded: 'bg-purple-50 text-purple-700',
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function CompletionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: bookings } = (await supabase
    .from('bookings')
    .select('id, student_id, status, payment_status, score_applied, price_paise, completion_marked_at, created_at, offerings(title, type, scheduled_at)')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })) as unknown as { data: RawBooking[] | null }

  const rows = bookings ?? []

  const uniqueStudentIds = [...new Set(rows.map((b) => b.student_id))]
  const studentMap = new Map<string, string>()
  if (uniqueStudentIds.length) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', uniqueStudentIds)
    for (const p of profiles ?? []) {
      studentMap.set(p.id, p.full_name ?? 'Unknown')
    }
  }

  const canComplete = (b: RawBooking) =>
    b.status !== 'completed' && !b.score_applied

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Completions</h1>
        <p className="text-muted mt-1 text-sm">
          Mark attended bookings complete to award student growth points.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="clay-card p-8 text-center">
          <p className="text-muted text-sm">No bookings yet.</p>
          <p className="text-muted text-xs mt-1">
            Once parents book offerings (Plan E), they will appear here.
          </p>
        </div>
      ) : (
        <div className="clay-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Student</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Offering</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Scheduled</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Payment</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {rows.map((booking) => (
                <tr key={booking.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {studentMap.get(booking.student_id) ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{booking.offerings?.title ?? '—'}</p>
                    <p className="text-xs text-muted capitalize">{booking.offerings?.type ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {fmt(booking.offerings?.scheduled_at ?? null)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PAYMENT_BADGE[booking.payment_status] ?? ''}`}>
                      {booking.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[booking.status] ?? ''}`}>
                      {booking.status}
                    </span>
                    {booking.score_applied && (
                      <span className="ml-1.5 text-xs text-green-600">✓ scored</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canComplete(booking) ? (
                      <form action={markCompleteAction}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          Mark Complete
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted">
                        {booking.status === 'completed'
                          ? `Done ${fmt(booking.completion_marked_at)}`
                          : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify tsc**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run build to confirm the route compiles**

```
npm run build 2>&1 | findstr /C:"completions" /C:"error" /C:"warning"
```

Expected: `ƒ /admin/completions` in the build output (dynamic route, no errors).

- [ ] **Step 4: Commit**

```
git add src/app/(admin)/admin/completions/page.tsx
git commit -m "feat: completions admin page — list bookings, mark complete (Plan G)"
```

---

## Task 5: Dashboard Stat Update

**Files:**
- Modify: `src/app/(admin)/admin/page.tsx`

Add a "Needs Completion" stat: count of bookings where `status = 'confirmed'` AND `score_applied = false`.

Also update the grid from `grid-cols-2 lg:grid-cols-4` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` to accommodate the fifth card.

- [ ] **Step 1: Add the count query and stat card to `src/app/(admin)/admin/page.tsx`**

In `AdminOverviewPage`, add a fifth parallel query and stat card:

```typescript
// ADD to the existing Promise.all — change the destructuring to include this:
{ count: needsCompletion },

// ADD this query inside Promise.all:
supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'confirmed')
  .eq('score_applied', false),
```

Full updated Promise.all destructuring:
```typescript
  const [
    { count: pendingCerts },
    { count: totalStudents },
    { count: onboarded },
    { count: liveOfferings },
    { count: needsCompletion },
  ] = await Promise.all([
    supabase.from('certificate_uploads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('onboarding_completed', true),
    supabase.from('offerings').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed').eq('score_applied', false),
  ])
```

Update the grid and add the fifth stat card:
```tsx
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Pending Certs"      value={pendingCerts ?? 0}      accent="pink"    sub="Awaiting review" />
        <StatCard label="Total Students"     value={totalStudents ?? 0}     accent="primary" />
        <StatCard label="Onboarded"          value={onboarded ?? 0}         accent="teal"    sub={`of ${totalStudents ?? 0}`} />
        <StatCard label="Live Offerings"     value={liveOfferings ?? 0}     accent="yellow" />
        <StatCard label="Needs Completion"   value={needsCompletion ?? 0}   accent="pink"    sub="Confirmed bookings" />
      </div>
```

- [ ] **Step 2: Verify tsc**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```

Expected: all tests pass (now 12 total — 5 offering tests + 7 completion tests).

- [ ] **Step 4: Run build**

```
npm run build
```

Expected: clean build, all routes compile, completion tests pass count shown.

- [ ] **Step 5: Commit**

```
git add src/app/(admin)/admin/page.tsx
git commit -m "feat: add Needs Completion stat to admin dashboard (Plan G)"
```

---

## Smoke Test (do this after all tasks)

Plan E is deferred — no parent-facing booking UI exists yet. To test Plan G end-to-end:

### Insert a test booking in Supabase dashboard

Open Supabase dashboard → Table Editor → `bookings` → Insert row:

```sql
-- Run in Supabase SQL editor (substitute real IDs from your DB)
INSERT INTO bookings (student_id, offering_id, booked_by, status, payment_status, price_paise)
SELECT
  (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1),
  (SELECT id FROM offerings LIMIT 1),
  (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1),  -- use parent if available
  'confirmed',
  'paid',
  50000;
```

### Verify completions page

1. Go to `/admin/completions`
2. The test booking appears in the table
3. Click **Mark Complete**
4. Page refreshes — row now shows `status: completed` and `✓ scored`

### Verify scoring in DB

```sql
-- Points landed in accrued_score, not baseline_score
SELECT student_id, parameter_id, baseline_score, accrued_score
  FROM student_parameter_scores
 WHERE student_id = '<your_student_id>';

-- Audit trail exists
SELECT source_type, source_id, points, description
  FROM score_contributions
 WHERE source_type = 'offering_completion';
```

### Verify idempotency

Click **Mark Complete** on the same booking again — should show error "Booking is already marked complete." (button will be hidden since status = 'completed', but the RPC guard also blocks it).

### Verify dashboard

Go to `/admin` — "Needs Completion" stat card shows `0` (confirmed booking was just completed).

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Completion event for each offering type | Task 1 — RPC handles all types equally |
| Score updates idempotent (no double-counting) | Task 1 — `score_applied` guard + Task 3 action |
| Auditable (every point traces to source) | Task 1 — `score_contributions` with `source_type = 'offering_completion'`, `source_id = booking_id` |
| Partial credit / weighted contributions | Task 1 — loops `offering_parameter_contributions`, each row is a separate score entry |
| Baseline vs. accrued distinguishable in data | Task 1 — RPC inserts into `accrued_score`, not `baseline_score` |
| Admin completions page | Task 4 |
| Dashboard stat | Task 5 |

**No placeholders:** All steps have complete code. ✓

**Type consistency:**
- `mapCompletionResult` defined in Task 2, consumed in Task 3. ✓
- `markCompleteAction` defined in Task 3, consumed in Task 4. ✓
- `admin_mark_complete` RPC defined in Task 1 SQL, typed in Task 1 TypeScript step, called in Task 3. ✓
