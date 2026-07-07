# Plan E: Catalog Browsing & Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **DO NOT execute this plan until the user explicitly approves it after stakeholder review.**

**Goal:** Let parents browse the live catalog of offerings, book one for a linked child (à la carte — Model A only), and track booking status — everything up to, but not including, actual payment settlement.

**Architecture:** A SECURITY DEFINER RPC `create_booking` validates the parent↔student link, offering eligibility, and age range server-side (mirroring the `admin_approve_cert` / `admin_mark_complete` pattern already in this codebase), then inserts the booking as `status='pending', payment_status='pending'`. Catalog pages are Server Components reading already-public-read tables (`offerings`, `categories`, `topics` — RLS from migration 0004). The booking form is a small Client Component using `useActionState`, matching the pattern in `children-manager.tsx` and `cert-review-form.tsx`.

**Tech Stack:** Next.js 16 App Router (`params`/`searchParams` are `Promise<{…}>`), Supabase (PostgreSQL + SECURITY DEFINER RPC), Vitest 2, Tailwind v4

## Global Constraints

- Supabase project: `bbioktywqkfvpzmakdxt` ONLY — never `happyfleet`
- Never commit, never push, never touch `main` branch — all review happens on localhost first
- **Payments are ALWAYS parent-only — student accounts must never be allowed to make payments.** `create_booking` rejects any caller whose role isn't `parent`.
- Parameters are NEVER hardcoded — always read from DB
- Admin client (service role key) is server-only — NEVER imported in client components
- Model B (annual packages) is explicitly **out of scope** — no `packages` table exists yet; requirements doc §12 places packages in Phase 2, after à la carte booking
- "Planned" offering interest capture (§9) is explicitly **out of scope** — Phase 4 per requirements doc §12
- Read `node_modules/next/dist/docs/` before writing Next.js code if anything is unclear

---

## ⚠️ Before building: this plan has one unresolved dependency

**Payment gateway integration is a separate, gated decision** — see the "Payment Integration" section near the end of this document. Tasks 1–7 below are fully buildable and testable **without** a payment gateway (bookings land in `status='pending'`). The payment section is written as a decision brief, not executable steps, and should not be started until the gateway is confirmed.

---

## File Map

| File | Status | Responsibility |
|------|--------|-----------------|
| `supabase/migrations/0013_catalog_booking.sql` | Create | `create_booking` RPC + extends `get_my_children` to return `date_of_birth` |
| `src/lib/types/database.ts` | Modify | Add `create_booking` Functions entry; add `date_of_birth` to `get_my_children` Returns |
| `src/lib/utils/age.ts` | Create | `calculateAge`, `isAgeEligible` pure helpers |
| `src/lib/utils/__tests__/age.test.ts` | Create | Unit tests |
| `src/lib/utils/booking.ts` | Create | `mapBookingResult` pure helper |
| `src/lib/utils/__tests__/booking.test.ts` | Create | Unit tests |
| `src/app/(platform)/catalog/page.tsx` | Create | Catalog list — type/category filters |
| `src/app/(platform)/catalog/[id]/page.tsx` | Create | Offering detail + booking CTA |
| `src/app/(platform)/catalog/actions.ts` | Create | `bookOfferingAction` |
| `src/components/catalog/book-offering-form.tsx` | Create | Client component — child selector + submit |
| `src/app/(platform)/bookings/page.tsx` | Create | Role-aware booking list (student: own; parent: booked-by-them) |
| `src/components/platform/platform-nav.tsx` | Modify | Add `/bookings` to `parentNav` (already present for students) |

---

## Task 1: DB Migration — `create_booking` RPC + extend `get_my_children`

**Files:**
- Create: `supabase/migrations/0013_catalog_booking.sql`
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Produces: `create_booking(p_student_id UUID, p_offering_id UUID) RETURNS TABLE(status text, booking_id uuid)`
- Return codes: `'ok'` | `'not_parent'` | `'not_linked'` | `'offering_not_found'` | `'offering_not_live'` | `'age_ineligible'` | `'already_booked'`
- Produces: `get_my_children()` — now also returns `date_of_birth date`

**Why an RPC instead of relying on the existing `bookings` RLS policy:** The current policy (`"Parents manage own bookings" FOR ALL USING (auth.uid() = booked_by)`, from migration 0001) only checks that the parent created the row — it does **not** verify the student is actually their linked child, that the offering is live, or that the child meets the age range. A SECURITY DEFINER RPC closes that gap, matching the pattern already used for `admin_approve_cert` (0011) and `admin_mark_complete` (0012).

**Why `get_my_children` needs a schema change, not just a new query:** the booking form needs each child's date of birth to check age eligibility, but parents have no RLS read access to a student's `user_profiles` row directly (only `"Users read own profile"` and `"Admins read all profiles"` exist). `get_my_children` is already a SECURITY DEFINER RPC parents call for this exact purpose — extending it is simpler than adding a new one. Note: Postgres does not allow `CREATE OR REPLACE FUNCTION` to change a function's return columns, so the migration must `DROP FUNCTION` first.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0013_catalog_booking.sql
-- =============================================
-- 0013: Catalog browsing & booking (Plan E)
--
-- 1. get_my_children extended to also return date_of_birth, needed
--    by the booking form to check age eligibility client-side.
--    Postgres requires DROP + CREATE (not CREATE OR REPLACE) when
--    a TABLE-returning function's output columns change.
--
-- 2. create_booking: SECURITY DEFINER RPC. Validates caller is a
--    parent, is linked to the student, the offering is live, and
--    the child's age fits the offering's range — none of which the
--    existing "Parents manage own bookings" RLS policy checks.
-- =============================================

DROP FUNCTION IF EXISTS public.get_my_children();

CREATE FUNCTION public.get_my_children()
RETURNS TABLE (
  student_id    uuid,
  full_name     text,
  email         text,
  relationship  text,
  date_of_birth date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT l.student_id, p.full_name, u.email::text, l.relationship, p.date_of_birth
    FROM public.parent_student_links l
    JOIN auth.users u ON u.id = l.student_id
    LEFT JOIN public.user_profiles p ON p.id = l.student_id
    WHERE l.parent_id = auth.uid()
    ORDER BY p.full_name NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking(
  p_student_id  UUID,
  p_offering_id UUID
)
RETURNS TABLE (status text, booking_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role TEXT;
  v_offering    RECORD;
  v_dob         DATE;
  v_age         INT;
  v_new_id      UUID;
BEGIN
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'parent' THEN
    RETURN QUERY SELECT 'not_parent'::text, NULL::uuid; RETURN;
  END IF;

  IF NOT public.is_parent_of(p_student_id) THEN
    RETURN QUERY SELECT 'not_linked'::text, NULL::uuid; RETURN;
  END IF;

  SELECT * INTO v_offering FROM public.offerings WHERE id = p_offering_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'offering_not_found'::text, NULL::uuid; RETURN;
  END IF;
  IF v_offering.status != 'live' THEN
    RETURN QUERY SELECT 'offering_not_live'::text, NULL::uuid; RETURN;
  END IF;

  SELECT date_of_birth INTO v_dob FROM public.user_profiles WHERE id = p_student_id;
  IF v_dob IS NOT NULL THEN
    v_age := EXTRACT(YEAR FROM AGE(v_dob));
    IF (v_offering.min_age IS NOT NULL AND v_age < v_offering.min_age)
       OR (v_offering.max_age IS NOT NULL AND v_age > v_offering.max_age) THEN
      RETURN QUERY SELECT 'age_ineligible'::text, NULL::uuid; RETURN;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
     WHERE student_id = p_student_id
       AND offering_id = p_offering_id
       AND status != 'cancelled'
  ) THEN
    RETURN QUERY SELECT 'already_booked'::text, NULL::uuid; RETURN;
  END IF;

  INSERT INTO public.bookings (student_id, offering_id, booked_by, status, payment_status, price_paise)
  VALUES (p_student_id, p_offering_id, auth.uid(), 'pending', 'pending', v_offering.price_paise)
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT 'ok'::text, v_new_id;
END;
$$;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Tool: `apply_migration`, project: `bbioktywqkfvpzmakdxt`, name: `0013_catalog_booking`, query: the SQL above.

Expected: `{"success": true}`, no errors.

- [ ] **Step 3: Update `src/lib/types/database.ts`**

Find the `get_my_children` entry in the `Functions` block and add `date_of_birth`:

```typescript
      get_my_children: {
        Args: never
        Returns: {
          student_id: string
          full_name: string | null
          email: string
          relationship: string
          date_of_birth: string | null
        }[]
      }
```

Then add a new entry after `admin_mark_complete`:

```typescript
      create_booking: {
        Args: { p_student_id: string; p_offering_id: string }
        Returns: { status: string; booking_id: string | null }[]
      }
```

- [ ] **Step 4: Verify tsc**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```
git add supabase/migrations/0013_catalog_booking.sql src/lib/types/database.ts
git commit -m "feat: add create_booking RPC, extend get_my_children with DOB (Plan E)"
```

---

## Task 2: Age Helper + Unit Tests

**Files:**
- Create: `src/lib/utils/age.ts`
- Create: `src/lib/utils/__tests__/age.test.ts`

**Interfaces:**
- Produces: `calculateAge(dateOfBirth: string, today?: Date): number`
- Produces: `isAgeEligible(age: number, minAge: number | null, maxAge: number | null): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/utils/__tests__/age.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateAge, isAgeEligible } from '@/lib/utils/age'

describe('calculateAge', () => {
  it('calculates age when birthday has passed this year', () => {
    expect(calculateAge('2015-01-01', new Date('2026-07-01'))).toBe(11)
  })

  it('calculates age when birthday has not yet occurred this year', () => {
    expect(calculateAge('2015-12-31', new Date('2026-07-01'))).toBe(10)
  })

  it('calculates age on exact birthday', () => {
    expect(calculateAge('2015-07-01', new Date('2026-07-01'))).toBe(11)
  })
})

describe('isAgeEligible', () => {
  it('returns true when no bounds are set', () => {
    expect(isAgeEligible(10, null, null)).toBe(true)
  })

  it('returns false when below min_age', () => {
    expect(isAgeEligible(5, 8, 14)).toBe(false)
  })

  it('returns false when above max_age', () => {
    expect(isAgeEligible(16, 8, 14)).toBe(false)
  })

  it('returns true when within range', () => {
    expect(isAgeEligible(10, 8, 14)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run src/lib/utils/__tests__/age.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/utils/age'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/age.ts`:

```typescript
export function calculateAge(dateOfBirth: string, today: Date = new Date()): number {
  const dob = new Date(dateOfBirth)
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

export function isAgeEligible(age: number, minAge: number | null, maxAge: number | null): boolean {
  if (minAge !== null && age < minAge) return false
  if (maxAge !== null && age > maxAge) return false
  return true
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run src/lib/utils/__tests__/age.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```
git add src/lib/utils/age.ts src/lib/utils/__tests__/age.test.ts
git commit -m "feat: add calculateAge/isAgeEligible helpers with unit tests (Plan E)"
```

---

## Task 3: Booking Result Helper + Unit Tests

**Files:**
- Create: `src/lib/utils/booking.ts`
- Create: `src/lib/utils/__tests__/booking.test.ts`

**Interfaces:**
- Consumes: return codes from `create_booking` (Task 1)
- Produces: `mapBookingResult(status: string): { error?: string; success?: string }`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/utils/__tests__/booking.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapBookingResult } from '@/lib/utils/booking'

describe('mapBookingResult', () => {
  it('ok returns success and no error', () => {
    const result = mapBookingResult('ok')
    expect(result.success).toBeTruthy()
    expect(result.error).toBeUndefined()
  })

  it('not_parent returns an error', () => {
    expect(mapBookingResult('not_parent').error).toBeTruthy()
  })

  it('not_linked returns an error', () => {
    expect(mapBookingResult('not_linked').error).toBeTruthy()
  })

  it('offering_not_found returns an error', () => {
    expect(mapBookingResult('offering_not_found').error).toBeTruthy()
  })

  it('offering_not_live returns an error', () => {
    expect(mapBookingResult('offering_not_live').error).toBeTruthy()
  })

  it('age_ineligible returns an error', () => {
    expect(mapBookingResult('age_ineligible').error).toBeTruthy()
  })

  it('already_booked returns an error', () => {
    expect(mapBookingResult('already_booked').error).toBeTruthy()
  })

  it('unknown status returns an error', () => {
    expect(mapBookingResult('mystery_code').error).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run src/lib/utils/__tests__/booking.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/utils/booking'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/booking.ts`:

```typescript
export type BookingResult = { error?: string; success?: string }

export function mapBookingResult(status: string): BookingResult {
  switch (status) {
    case 'ok':
      return { success: 'Booking requested! Complete payment to confirm the seat.' }
    case 'not_parent':
      return { error: 'Only parent accounts can book offerings for a student.' }
    case 'not_linked':
      return { error: 'This student is not linked to your account.' }
    case 'offering_not_found':
      return { error: 'Offering not found.' }
    case 'offering_not_live':
      return { error: 'This offering is not currently open for booking.' }
    case 'age_ineligible':
      return { error: "This offering isn't available for the selected child's age." }
    case 'already_booked':
      return { error: 'This offering is already booked for this child.' }
    default:
      return { error: `Unexpected status: ${status}` }
  }
}
```

- [ ] **Step 4: Run full test suite to verify no regressions**

```
npx vitest run
```

Expected: all tests pass (112 + 7 + 8 = 127).

- [ ] **Step 5: Commit**

```
git add src/lib/utils/booking.ts src/lib/utils/__tests__/booking.test.ts
git commit -m "feat: add mapBookingResult helper with unit tests (Plan E)"
```

---

## Task 4: Catalog List Page

**Files:**
- Create: `src/app/(platform)/catalog/page.tsx`

**Interfaces:**
- Consumes: `offerings`, `categories` tables (already public-read via migration 0004)

**Note:** `searchParams` is `Promise<{…}>` in Next.js 16 — must be awaited. Category filtering is done in-memory after fetch (catalog sizes are small; avoids PostgREST embedded-filter complexity).

- [ ] **Step 1: Create `src/app/(platform)/catalog/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface RawOffering {
  id: string
  title: string
  description: string | null
  type: string
  price_paise: number
  min_age: number | null
  max_age: number | null
  scheduled_at: string | null
  topics: { id: string; name: string; category_id: string; categories: { id: string; name: string } | null } | null
}

interface RawCategory {
  id: string
  name: string
}

const TYPE_LABEL: Record<string, string> = {
  workshop: 'Workshop',
  trip: 'Trip',
  event: 'Event',
  competition: 'Competition',
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string }>
}) {
  const { category: categoryFilter, type: typeFilter } = await searchParams
  const supabase = await createClient()

  const [{ data: offerings }, { data: categories }] = (await Promise.all([
    supabase
      .from('offerings')
      .select('id, title, description, type, price_paise, min_age, max_age, scheduled_at, topics(id, name, category_id, categories(id, name))')
      .eq('status', 'live')
      .order('scheduled_at', { ascending: true, nullsFirst: false }),
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
  ])) as [{ data: RawOffering[] | null }, { data: RawCategory[] | null }]

  let rows = offerings ?? []
  if (typeFilter) rows = rows.filter((o) => o.type === typeFilter)
  if (categoryFilter) rows = rows.filter((o) => o.topics?.category_id === categoryFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Explore</h1>
        <p className="text-muted mt-1 text-sm">
          Workshops, trips, events, and competitions that grow your skills.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/catalog"
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!typeFilter && !categoryFilter ? 'bg-primary text-white' : 'bg-black/5 text-muted hover:text-foreground'}`}
        >
          All
        </Link>
        {Object.entries(TYPE_LABEL).map(([value, label]) => (
          <Link
            key={value}
            href={`/catalog?type=${value}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === value ? 'bg-primary text-white' : 'bg-black/5 text-muted hover:text-foreground'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {(categories ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/catalog${typeFilter ? `?type=${typeFilter}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!categoryFilter ? 'border-primary text-primary' : 'border-black/10 text-muted hover:text-foreground'}`}
          >
            All categories
          </Link>
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/catalog?category=${c.id}${typeFilter ? `&type=${typeFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoryFilter === c.id ? 'border-primary text-primary' : 'border-black/10 text-muted hover:text-foreground'}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No offerings match these filters yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((o) => (
            <Link
              key={o.id}
              href={`/catalog/${o.id}`}
              className="clay-card p-4 space-y-2 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {TYPE_LABEL[o.type] ?? o.type}
                </span>
                {o.topics?.categories && (
                  <span className="text-xs text-muted">{o.topics.categories.name}</span>
                )}
              </div>
              <h2 className="font-semibold text-foreground">{o.title}</h2>
              {o.description && <p className="text-xs text-muted line-clamp-2">{o.description}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-foreground">{formatPrice(o.price_paise)}</span>
                {(o.min_age || o.max_age) && (
                  <span className="text-xs text-muted">
                    Ages {o.min_age ?? '0'}–{o.max_age ?? '18+'}
                  </span>
                )}
              </div>
            </Link>
          ))}
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

- [ ] **Step 3: Commit**

```
git add "src/app/(platform)/catalog/page.tsx"
git commit -m "feat: catalog list page with type/category filters (Plan E)"
```

---

## Task 5: Catalog Detail Page + Booking Form

**Files:**
- Create: `src/app/(platform)/catalog/[id]/page.tsx`
- Create: `src/components/catalog/book-offering-form.tsx`

**Interfaces:**
- Consumes: `calculateAge`, `isAgeEligible` from `@/lib/utils/age` (Task 2)
- Consumes: `bookOfferingAction` from `@/app/(platform)/catalog/actions` (Task 6 — written next, but this component references it now since they ship together)
- Consumes: `get_my_children()` RPC (Task 1)

- [ ] **Step 1: Create `src/components/catalog/book-offering-form.tsx`**

```typescript
'use client'

import { useActionState } from 'react'
import { bookOfferingAction } from '@/app/(platform)/catalog/actions'
import { calculateAge, isAgeEligible } from '@/lib/utils/age'

interface Child {
  student_id: string
  full_name: string | null
  date_of_birth: string | null
}

interface Props {
  offeringId: string
  offeringMinAge: number | null
  offeringMaxAge: number | null
  children: Child[]
}

export function BookOfferingForm({ offeringId, offeringMinAge, offeringMaxAge, children }: Props) {
  const [state, action, pending] = useActionState(bookOfferingAction, undefined)

  return (
    <form action={action} className="clay-card p-5 space-y-4">
      <input type="hidden" name="offering_id" value={offeringId} />

      <div>
        <label htmlFor="student_id" className="block text-sm font-medium text-foreground mb-1">
          Book for
        </label>
        <select
          id="student_id"
          name="student_id"
          required
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
        >
          {children.map((c) => {
            const age = c.date_of_birth ? calculateAge(c.date_of_birth) : null
            const eligible = age === null || isAgeEligible(age, offeringMinAge, offeringMaxAge)
            return (
              <option key={c.student_id} value={c.student_id} disabled={!eligible}>
                {c.full_name ?? 'Student'}
                {age !== null ? ` (age ${age})` : ''}
                {!eligible ? ' — outside age range' : ''}
              </option>
            )
          })}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white w-full h-11 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Booking…' : 'Book this offering'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `src/app/(platform)/catalog/[id]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BookOfferingForm } from '@/components/catalog/book-offering-form'

interface RawOfferingDetail {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  price_paise: number
  min_age: number | null
  max_age: number | null
  scheduled_at: string | null
  duration_minutes: number | null
  location: string | null
  topics: { name: string; categories: { name: string } | null } | null
}

interface RawContribution {
  points: number
  growth_parameters: { name: string } | null
}

interface RawChild {
  student_id: string
  full_name: string | null
  date_of_birth: string | null
}

const TYPE_LABEL: Record<string, string> = {
  workshop: 'Workshop',
  trip: 'Trip',
  event: 'Event',
  competition: 'Competition',
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export default async function OfferingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: offering } = (await supabase
    .from('offerings')
    .select('id, title, description, type, status, price_paise, min_age, max_age, scheduled_at, duration_minutes, location, topics(name, categories(name))')
    .eq('id', id)
    .single()) as unknown as { data: RawOfferingDetail | null }

  if (!offering) notFound()

  const { data: contributions } = (await supabase
    .from('offering_parameter_contributions')
    .select('points, growth_parameters(name)')
    .eq('offering_id', id)
    .gt('points', 0)) as unknown as { data: RawContribution[] | null }

  let children: RawChild[] = []
  if (profile?.role === 'parent') {
    const { data } = await supabase.rpc('get_my_children')
    children = (data ?? []) as RawChild[]
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/catalog" className="text-sm text-primary hover:underline">
        ← Back to Explore
      </Link>

      <div className="clay-card p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {TYPE_LABEL[offering.type] ?? offering.type}
          </span>
          {offering.topics?.categories && (
            <span className="text-xs text-muted">
              {offering.topics.categories.name} · {offering.topics.name}
            </span>
          )}
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground">{offering.title}</h1>
        {offering.description && <p className="text-muted text-sm">{offering.description}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Price</p>
            <p className="font-semibold text-foreground">{formatPrice(offering.price_paise)}</p>
          </div>
          {(offering.min_age || offering.max_age) && (
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Ages</p>
              <p className="font-semibold text-foreground">
                {offering.min_age ?? '0'}–{offering.max_age ?? '18+'}
              </p>
            </div>
          )}
          {offering.scheduled_at && (
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Date</p>
              <p className="font-semibold text-foreground">
                {new Date(offering.scheduled_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          )}
          {offering.location && (
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Location</p>
              <p className="font-semibold text-foreground">{offering.location}</p>
            </div>
          )}
        </div>

        {(contributions ?? []).length > 0 && (
          <div className="pt-2 border-t border-black/[0.06]">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">Grows these skills</p>
            <div className="flex flex-wrap gap-2">
              {(contributions ?? []).map((c, i) => (
                <span
                  key={i}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent-teal/10 text-accent-teal"
                >
                  {c.growth_parameters?.name ?? 'Skill'} +{c.points}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {profile?.role === 'parent' ? (
        children.length > 0 ? (
          <BookOfferingForm
            offeringId={offering.id}
            offeringMinAge={offering.min_age}
            offeringMaxAge={offering.max_age}
            children={children}
          />
        ) : (
          <div className="clay-card p-5 text-sm text-muted">
            Link a child&apos;s account before booking.{' '}
            <Link href="/children" className="text-primary hover:underline font-medium">
              Link a child →
            </Link>
          </div>
        )
      ) : (
        <div className="clay-card p-5 text-sm text-muted">
          Ask a parent or guardian to book this offering for you.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify tsc**

Note: this will still fail at this point because `bookOfferingAction` (Task 6) doesn't exist yet. That's expected — Task 6 is written next and both are verified together.

```
npx tsc --noEmit
```

Expected: 1 error — `Cannot find module '@/app/(platform)/catalog/actions'`. Proceed to Task 6.

---

## Task 6: Book Offering Server Action

**Files:**
- Create: `src/app/(platform)/catalog/actions.ts`

**Interfaces:**
- Consumes: `mapBookingResult` from `@/lib/utils/booking` (Task 3)
- Consumes: `create_booking` RPC (Task 1)
- Produces: `bookOfferingAction(_prev: BookingFormState, formData: FormData): Promise<BookingFormState>`
- Produces: `BookingFormState = { error?: string; success?: string } | undefined`

- [ ] **Step 1: Create `src/app/(platform)/catalog/actions.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mapBookingResult } from '@/lib/utils/booking'

export type BookingFormState = { error?: string; success?: string } | undefined

export async function bookOfferingAction(
  _prev: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const offeringId = formData.get('offering_id') as string
  const studentId = formData.get('student_id') as string

  if (!offeringId || !studentId) return { error: 'Missing offering or student.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('create_booking', { p_student_id: studentId, p_offering_id: offeringId })
    .single()

  if (error) return { error: 'Database error. Please try again.' }

  const mapped = mapBookingResult(data?.status ?? '')
  if (!mapped.error) {
    revalidatePath('/bookings')
  }
  return mapped
}
```

- [ ] **Step 2: Verify tsc for both Task 5 and Task 6 files**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run build to confirm the catalog routes compile**

```
npm run build 2>&1 | findstr /C:"catalog" /C:"error"
```

Expected: `ƒ /catalog` and `ƒ /catalog/[id]` in the build output, no errors.

- [ ] **Step 4: Commit**

```
git add "src/app/(platform)/catalog" "src/components/catalog"
git commit -m "feat: catalog detail page + booking form + bookOfferingAction (Plan E)"
```

---

## Task 7: Bookings List Page + Nav Link

**Files:**
- Create: `src/app/(platform)/bookings/page.tsx`
- Modify: `src/components/platform/platform-nav.tsx`

**Interfaces:**
- Consumes: `bookings` table — no explicit `.eq()` filter needed; existing RLS policies (`"Students read own bookings"`, `"Parents manage own bookings"`) already scope the result set correctly per role.

- [ ] **Step 1: Create `src/app/(platform)/bookings/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface RawBooking {
  id: string
  status: string
  payment_status: string
  price_paise: number
  created_at: string
  offerings: { title: string; type: string; scheduled_at: string | null } | null
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

const PAYMENT_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-purple-50 text-purple-700',
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: bookings } = (await supabase
    .from('bookings')
    .select('id, status, payment_status, price_paise, created_at, offerings(title, type, scheduled_at)')
    .order('created_at', { ascending: false })) as unknown as { data: RawBooking[] | null }

  const rows = bookings ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">My Bookings</h1>
        <p className="text-muted mt-1 text-sm">Everything you&apos;ve booked through SkillFleet.</p>
      </div>

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center space-y-3">
          <p className="text-muted text-sm">No bookings yet.</p>
          <Link
            href="/catalog"
            className="inline-block clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
          >
            Explore offerings →
          </Link>
        </div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.06]">
          {rows.map((b) => (
            <div key={b.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{b.offerings?.title ?? '—'}</p>
                <p className="text-xs text-muted">
                  {fmtDate(b.offerings?.scheduled_at ?? null)} · {formatPrice(b.price_paise)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[b.payment_status] ?? ''}`}>
                  {b.payment_status}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[b.status] ?? ''}`}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `/bookings` to `parentNav` in `src/components/platform/platform-nav.tsx`**

Find:

```typescript
const parentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/children', label: 'My Children', icon: Baby },
  { href: '/catalog', label: 'Explore', icon: BookOpen },
]
```

Replace with:

```typescript
const parentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/children', label: 'My Children', icon: Baby },
  { href: '/catalog', label: 'Explore', icon: BookOpen },
  { href: '/bookings', label: 'My Bookings', icon: ShoppingBag },
]
```

(`ShoppingBag` is already imported at the top of the file — it's used by `studentNav`.)

- [ ] **Step 3: Verify tsc**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run full test suite**

```
npx vitest run
```

Expected: all 127 tests pass.

- [ ] **Step 5: Run build**

```
npm run build
```

Expected: clean build, `ƒ /bookings` route present, no errors.

- [ ] **Step 6: Commit**

```
git add "src/app/(platform)/bookings" src/components/platform/platform-nav.tsx
git commit -m "feat: bookings list page, add nav link for parents (Plan E)"
```

---

## Payment Integration — Decision Required Before Building

**This is a design brief for stakeholder review, not an executable task.** Do not implement until the gateway is confirmed.

### What's missing without it

A booking created by Tasks 1–7 lands in `status='pending', payment_status='pending'` and **stays there forever** unless something moves it to `status='confirmed', payment_status='paid'`. That "something" is the payment integration. Without it:
- Parents can browse and request a booking, but never complete checkout
- Plan G (Completions) has nothing to mark complete, because nothing ever reaches `confirmed`

### Three options

| Option | What it is | Effort | When it unblocks testing |
|--------|-----------|--------|---------------------------|
| **A — Razorpay** | Full gateway integration: create Razorpay Order server-side → open Razorpay Checkout on the client → verify payment signature → webhook/handler updates the booking to `confirmed`/`paid`. | Highest — needs a Razorpay business account, API keys, webhook endpoint, signature verification | After account setup + integration work |
| **B — A different gateway** (Stripe, Cashfree, PayU, etc.) | Same shape as Option A, different SDK. **Note:** `bookings.payment_order_id` / `payment_payment_id` are already named for Razorpay specifically (see column comments in migration 0001) — switching gateways means renaming these two columns in a follow-up migration. | Same as A, plus a small migration | After account setup + integration work |
| **C — Manual/offline confirmation (interim)** | No gateway at all yet. Admin gets a simple "Confirm Payment" action on `/admin/completions` (or a new `/admin/bookings`) that flips a `pending` booking to `confirmed`/`paid` by hand, once payment is collected outside the platform (bank transfer, cash, UPI QR shown at reception, etc.) | Lowest — roughly the size of one Plan G task | **Immediately** — lets the whole booking → completion → scoring pipeline be tested end-to-end today, with zero gateway dependency |

### Recommendation for the conversation with sir

Option C is not a throwaway — it's a legitimate "manual payments" mode many small ed-tech operators keep permanently for offline collections (school tie-ups, cash at events), alongside whichever online gateway is chosen later. Building C first, then layering A or B on top when the gateway is decided, means:
- The rest of the platform (catalog, booking, completions, scoring) can be fully tested now
- No throwaway work — C's admin action stays useful even after a real gateway ships, for edge cases
- The gateway decision no longer blocks anything except "customers can self-checkout online"

### Open questions for sir (mirrors requirements doc §11.7–§11.9)

1. Which gateway — Razorpay (columns already assume this), or something else?
2. Should Option C (manual confirmation) be built now as an interim/permanent fallback, or is online payment a hard requirement before any bookings go live?
3. **Seat capacity is not tracked anywhere in the schema** — `offerings` has no `capacity`/`seats_available` column, so a trip with 20 physical seats can currently be booked unlimited times. Worth deciding whether this needs to be added before Plan E ships, since it affects both the booking RPC (Task 1) and the catalog UI (Task 4/5).

---

## Smoke Test (after Tasks 1–7, without payment)

### As a parent

1. Log in as a parent with at least one linked child (see `/children` if not yet linked)
2. Go to `/catalog` — live offerings appear; try the type and category filter chips
3. Click into an offering → detail page shows price, age range, schedule, and the skills it grows
4. In "Book for", select a child — if their age is outside the offering's range, the option is disabled and labeled "outside age range"
5. Submit with an eligible child → success message appears, "Complete payment to confirm the seat."
6. Go to `/bookings` → the new booking appears with `status: pending`, `payment_status: pending`

### As a student

1. Log in as a student linked to that parent
2. Go to `/catalog` → same browsing experience, but the offering detail page shows "Ask a parent or guardian to book this offering for you." instead of a form
3. Go to `/bookings` → sees the same booking the parent created (read-only)

### Edge cases to check

- Try booking the same offering for the same child twice → second attempt shows "This offering is already booked for this child."
- Try booking a child who is outside the offering's age range via direct form submission (bypass the disabled option using browser devtools, or test via the RPC directly in SQL editor) → `age_ineligible` error, no row inserted
- Log in as a student (not parent) and attempt to call `create_booking` directly (e.g., via Supabase SQL editor `SELECT * FROM create_booking(...)` while authenticated as that student) → returns `not_parent`

### DB checks (Supabase SQL editor)

```sql
-- Confirm the booking landed correctly
SELECT student_id, offering_id, booked_by, status, payment_status, price_paise
  FROM bookings
 ORDER BY created_at DESC
 LIMIT 5;

-- Confirm get_my_children now returns date_of_birth
SELECT * FROM get_my_children(); -- run while authenticated as a parent
```

---

## Self-Review

**Spec coverage check (requirements doc):**

| Requirement | Task |
|-------------|------|
| §6 Model A — pay-per-offering, browse & book | Tasks 4–7 (booking creation; payment settlement is the gated section) |
| §7 Taxonomy-driven discovery (category/topic → offering) | Task 4 (filters), Task 5 (breadcrumb + skill tags on detail page) |
| §10 `Offering.parameterContributions[]` surfaced to the browsing student/parent | Task 5 ("Grows these skills" section) |
| Parent-only payments (standing constraint) | Task 1 — `create_booking` rejects non-parent callers with `not_parent` |
| §6 Model B — annual packages | **Explicitly out of scope** — no schema exists; Phase 2 per §12, separate future plan |
| §9 Supply & demand ("planned" listings, demand requests) | **Explicitly out of scope** — Phase 4 per §12 |
| §8 AI Curriculum Recommender | **Explicitly out of scope** — Phase 3 per §12 |
| Payment settlement | **Gated** — see "Payment Integration — Decision Required" section |

**No placeholders:** All steps in Tasks 1–7 have complete code. The Payment Integration section is intentionally a decision brief, not a task, and is clearly marked as such. ✓

**Type consistency:**
- `calculateAge`/`isAgeEligible` defined in Task 2, consumed in Task 5 (`book-offering-form.tsx`). ✓
- `mapBookingResult` defined in Task 3, consumed in Task 6 (`actions.ts`). ✓
- `create_booking` RPC defined in Task 1 SQL + typed in Task 1 TypeScript step, called in Task 6. ✓
- `bookOfferingAction` defined in Task 6, consumed in Task 5's `BookOfferingForm` (component references it directly since both ship in the same review unit — flagged inline in Task 5). ✓
- `BookingFormState` shape (`{ error?: string; success?: string } | undefined`) matches what `useActionState` in `BookOfferingForm` expects. ✓
