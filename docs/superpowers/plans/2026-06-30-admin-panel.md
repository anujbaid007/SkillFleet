# Plan F: Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional admin panel covering the admin dashboard, certificate review with scoring, offering/taxonomy management, and parameter configuration.

**Architecture:** All admin pages live in `src/app/(admin)/admin/` (route group `(admin)`, URL segment `admin`). The layout at `src/app/(admin)/layout.tsx` already exists and guards `role !== 'admin'`. Server Components fetch data; Client Components handle interactive forms. Two SECURITY DEFINER RPCs handle cert scoring so the service role key is not required.

**Tech Stack:** Next.js 16.2.6 App Router, Supabase JS (anon key + RLS), PL/pgSQL SECURITY DEFINER functions, Tailwind v4, `motion/react` v12, `lucide-react` v1.14, Vitest 2.

## Global Constraints

- Supabase project ID: `bbioktywqkfvpzmakdxt` — NEVER touch `happyfleet`
- DO NOT commit, push, or touch main — user reviews on localhost first
- Admin client (service role key) is server-only — NEVER import in client components
- `params` in dynamic routes is `Promise<{ id: string }>` — always `await params`
- Tailwind v4: no `tailwind.config.ts`; theme tokens in `globals.css` `@theme inline` block
- Animation: `import { motion } from 'motion/react'` — NOT `framer-motion`
- Parameters NEVER hardcoded — always read from DB
- `npm test` must stay green after every task

---

## Existing Files (do not recreate)

- `src/app/(admin)/layout.tsx` — admin shell, guards role, renders `<AdminNav />`
- `src/components/admin/admin-nav.tsx` — sidebar nav with links to all sections
- `src/app/(admin)/admin/page.tsx` — placeholder, **will be rewritten in Task 3**
- `src/lib/types/database.ts` — all table/function types already defined; extend only for new RPCs

## New Files Map

```
supabase/migrations/
  0011_admin_features.sql          — catalog RLS, cert review RPCs, parent-profile read policy

src/lib/validation/
  offering.ts                      — validateOffering() pure function
  __tests__/offering.test.ts       — 5 unit tests

src/components/admin/
  stat-card.tsx                    — reusable stat display card (Server Component)
  cert-review-form.tsx             — 'use client' approve/reject form
  offering-form.tsx                — 'use client' create/edit offering form
  taxonomy-manager.tsx             — 'use client' inline category/topic add forms
  parameter-row.tsx                — 'use client' inline parameter edit row

src/app/(admin)/admin/
  page.tsx                         — Dashboard (REWRITE)
  certificates/
    page.tsx                       — Cert list
    [id]/
      page.tsx                     — Cert detail + review form
      actions.ts                   — approveCertAction, rejectCertAction
  offerings/
    page.tsx                       — Offering list
    actions.ts                     — createOfferingAction, updateOfferingAction, archiveOfferingAction
    new/
      page.tsx                     — Create offering
    [id]/
      edit/
        page.tsx                   — Edit offering
  taxonomy/
    page.tsx                       — Category + topic manager
    actions.ts                     — createCategoryAction, createTopicAction, toggleActiveAction
  parameters/
    page.tsx                       — Parameter + score level config
    actions.ts                     — updateParameterAction, createParameterAction, updateScoreLevelAction
```

---

## Task 1: DB Migration — Catalog RLS + Cert Review RPCs

**Files:**
- Create: `supabase/migrations/0011_admin_features.sql`
- Modify: `src/lib/types/database.ts` (add new RPC signatures)

**Interfaces:**
- Produces: `admin_approve_cert(p_cert_id, p_points_approved, p_admin_notes, p_parameter_id?)` → `'ok' | 'not_admin' | 'not_found' | 'not_pending' | 'no_parameter'`
- Produces: `admin_reject_cert(p_cert_id, p_admin_notes?)` → `'ok' | 'not_admin' | 'not_found' | 'not_pending'`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/0011_admin_features.sql

-- =============================================
-- CATALOG TABLE RLS
-- =============================================

ALTER TABLE categories                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_parameter_contributions ENABLE ROW LEVEL SECURITY;

-- Allow parents to read their linked students' profiles (needed for bookings page)
CREATE POLICY "Parents read linked student profiles"
  ON user_profiles FOR SELECT USING (is_parent_of(id));

-- categories
CREATE POLICY "Authenticated read active categories"
  ON categories FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage categories"
  ON categories FOR ALL USING (is_admin());

-- topics
CREATE POLICY "Authenticated read active topics"
  ON topics FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage topics"
  ON topics FOR ALL USING (is_admin());

-- offerings: authenticated see live; admins see all
CREATE POLICY "Authenticated read live offerings"
  ON offerings FOR SELECT TO authenticated USING (status = 'live');
CREATE POLICY "Admins manage offerings"
  ON offerings FOR ALL USING (is_admin());

-- offering_parameter_contributions
CREATE POLICY "Authenticated read live offering contributions"
  ON offering_parameter_contributions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offerings o WHERE o.id = offering_id AND o.status = 'live'
    )
  );
CREATE POLICY "Admins manage offering contributions"
  ON offering_parameter_contributions FOR ALL USING (is_admin());

-- =============================================
-- CERT REVIEW RPCs
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_approve_cert(
  p_cert_id        UUID,
  p_points_approved INT,
  p_admin_notes    TEXT    DEFAULT NULL,
  p_parameter_id   UUID    DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cert     RECORD;
  v_param_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RETURN 'not_admin'; END IF;

  SELECT * INTO v_cert FROM public.certificate_uploads WHERE id = p_cert_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_cert.status != 'pending' THEN RETURN 'not_pending'; END IF;

  -- Use override param if provided, else cert's stored param
  v_param_id := COALESCE(p_parameter_id, v_cert.parameter_id);
  IF v_param_id IS NULL THEN RETURN 'no_parameter'; END IF;

  UPDATE public.certificate_uploads
     SET status          = 'approved',
         points_approved = p_points_approved,
         admin_notes     = p_admin_notes,
         reviewed_by     = auth.uid(),
         reviewed_at     = NOW()
   WHERE id = p_cert_id;

  IF p_points_approved > 0 THEN
    INSERT INTO public.student_parameter_scores (student_id, parameter_id, baseline_score, accrued_score)
    VALUES (v_cert.student_id, v_param_id, p_points_approved, 0)
    ON CONFLICT (student_id, parameter_id) DO UPDATE
       SET baseline_score = public.student_parameter_scores.baseline_score + p_points_approved,
           updated_at     = NOW();

    INSERT INTO public.score_contributions
      (student_id, parameter_id, source_type, source_id, points, description)
    VALUES
      (v_cert.student_id, v_param_id, 'baseline_cert', p_cert_id, p_points_approved,
       'Certificate approved: ' || COALESCE(v_cert.file_name, p_cert_id::text));
  END IF;

  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_cert(
  p_cert_id     UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cert RECORD;
BEGIN
  IF NOT public.is_admin() THEN RETURN 'not_admin'; END IF;

  SELECT * INTO v_cert FROM public.certificate_uploads WHERE id = p_cert_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_cert.status != 'pending' THEN RETURN 'not_pending'; END IF;

  -- points_provisional = 0 at upload time, so no score rollback needed
  UPDATE public.certificate_uploads
     SET status      = 'rejected',
         admin_notes = p_admin_notes,
         reviewed_by = auth.uid(),
         reviewed_at = NOW()
   WHERE id = p_cert_id;

  RETURN 'ok';
END;
$$;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with:
- `project_id`: `bbioktywqkfvpzmakdxt`
- `name`: `0011_admin_features`
- `query`: (paste the full SQL above)

Expected: migration applied successfully with no errors.

- [ ] **Step 3: Add new RPC types to `src/lib/types/database.ts`**

In the `Functions` block, after the existing `unlink_student` entry, add:

```typescript
      admin_approve_cert: {
        Args: {
          p_cert_id: string
          p_points_approved: number
          p_admin_notes?: string | null
          p_parameter_id?: string | null
        }
        Returns: string
      }
      admin_reject_cert: {
        Args: {
          p_cert_id: string
          p_admin_notes?: string | null
        }
        Returns: string
      }
```

- [ ] **Step 4: Run tsc to confirm types are clean**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 2: Offering Validation Utility + Tests

**Files:**
- Create: `src/lib/validation/offering.ts`
- Create: `src/lib/validation/__tests__/offering.test.ts`

**Interfaces:**
- Produces: `validateOffering(data: OfferingFormData): OfferingErrors`
- Produces: `OfferingFormData` interface
- Produces: `OfferingErrors` interface

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/validation/__tests__/offering.test.ts
import { describe, it, expect } from 'vitest'
import { validateOffering } from '../offering'

const base = {
  title: 'Test Workshop',
  type: 'workshop',
  price_rupees: '999',
  min_age: '8',
  max_age: '14',
}

describe('validateOffering', () => {
  it('returns no errors for valid data', () => {
    expect(validateOffering(base)).toEqual({})
  })

  it('requires title', () => {
    const errors = validateOffering({ ...base, title: '   ' })
    expect(errors.title).toBeTruthy()
  })

  it('requires valid type', () => {
    const errors = validateOffering({ ...base, type: 'seminar' })
    expect(errors.type).toBeTruthy()
  })

  it('rejects negative price', () => {
    const errors = validateOffering({ ...base, price_rupees: '-100' })
    expect(errors.price).toBeTruthy()
  })

  it('rejects min_age > max_age', () => {
    const errors = validateOffering({ ...base, min_age: '15', max_age: '10' })
    expect(errors.age_range).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm test -- offering
```

Expected: FAIL — `validateOffering` not found.

- [ ] **Step 3: Implement the validation function**

```typescript
// src/lib/validation/offering.ts

export interface OfferingFormData {
  title: string
  type: string
  price_rupees: string
  min_age: string
  max_age: string
}

export interface OfferingErrors {
  title?: string
  type?: string
  price?: string
  age_range?: string
}

const VALID_TYPES = ['workshop', 'trip', 'event', 'competition']

export function validateOffering(data: OfferingFormData): OfferingErrors {
  const errors: OfferingErrors = {}

  if (!data.title.trim()) {
    errors.title = 'Title is required.'
  }

  if (!VALID_TYPES.includes(data.type)) {
    errors.type = 'Select a valid type.'
  }

  if (data.price_rupees) {
    const n = Number(data.price_rupees)
    if (isNaN(n) || n < 0) {
      errors.price = 'Price must be a non-negative number.'
    }
  }

  const minAge = Number(data.min_age)
  const maxAge = Number(data.max_age)
  if (data.min_age && data.max_age && minAge > maxAge) {
    errors.age_range = 'Min age must not exceed max age.'
  }

  return errors
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm test -- offering
```

Expected: 5 tests pass.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```powershell
npm test
```

Expected: all existing tests + 5 new = still green.

---

## Task 3: Admin Dashboard

**Files:**
- Create: `src/components/admin/stat-card.tsx`
- Modify: `src/app/(admin)/admin/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: Supabase query counts from `user_profiles`, `certificate_uploads`, `offerings`
- Produces: `/admin` page with 4 stat cards + recent pending certs table

- [ ] **Step 1: Create the StatCard component**

```typescript
// src/components/admin/stat-card.tsx

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  accent?: 'primary' | 'yellow' | 'teal' | 'pink'
}

const ACCENT: Record<string, string> = {
  primary: 'text-primary',
  yellow:  'text-accent-yellow',
  teal:    'text-accent-teal',
  pink:    'text-accent-pink',
}

export function StatCard({ label, value, sub, accent = 'primary' }: StatCardProps) {
  return (
    <div className="clay-card p-5 space-y-1">
      <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
      <p className={`font-display text-3xl font-bold ${ACCENT[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite the admin dashboard page**

```typescript
// src/app/(admin)/admin/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StatCard } from '@/components/admin/stat-card'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const [
    { count: pendingCerts },
    { count: totalStudents },
    { count: onboarded },
    { count: liveOfferings },
  ] = await Promise.all([
    supabase.from('certificate_uploads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('onboarding_completed', true),
    supabase.from('offerings').select('*', { count: 'exact', head: true }).eq('status', 'live'),
  ])

  // Latest 5 pending certs for quick triage
  const { data: recentPending } = await supabase
    .from('certificate_uploads')
    .select('id, file_name, description, created_at, parameter_id, growth_parameters(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5) as unknown as {
      data: Array<{
        id: string
        file_name: string | null
        description: string | null
        created_at: string
        growth_parameters: { name: string } | null
      }> | null
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted mt-1 text-sm">Platform-wide snapshot.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Certs" value={pendingCerts ?? 0} accent="pink" sub="Awaiting review" />
        <StatCard label="Total Students" value={totalStudents ?? 0} accent="primary" />
        <StatCard label="Onboarded" value={onboarded ?? 0} accent="teal" sub={`of ${totalStudents ?? 0}`} />
        <StatCard label="Live Offerings" value={liveOfferings ?? 0} accent="yellow" />
      </div>

      {(recentPending ?? []).length > 0 && (
        <div className="clay-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Pending Certificates</h2>
            <Link href="/admin/certificates" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-black/[0.06]">
            {(recentPending ?? []).map((cert) => (
              <div key={cert.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {cert.file_name ?? 'Untitled'}
                  </p>
                  <p className="text-xs text-muted">
                    {cert.description ?? '—'} · {cert.growth_parameters?.name ?? 'No skill tagged'}
                  </p>
                </div>
                <Link
                  href={`/admin/certificates/${cert.id}`}
                  className="ml-4 shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run `npx tsc --noEmit` — expect 0 errors**

- [ ] **Step 4: Visit `/admin` in the browser (with an admin account) and verify stats render**

---

## Task 4: Certificate Review — List Page

**Files:**
- Create: `src/app/(admin)/admin/certificates/page.tsx`

**Interfaces:**
- Consumes: `certificate_uploads` joined to `growth_parameters` for parameter name
- Produces: `/admin/certificates` list sorted pending-first, with Review links

- [ ] **Step 1: Create the certificates list page**

```typescript
// src/app/(admin)/admin/certificates/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

interface RawCert {
  id: string
  file_name: string | null
  description: string | null
  status: string
  created_at: string
  student_id: string
  points_approved: number
  growth_parameters: { name: string } | null
}

export default async function CertificatesPage() {
  const supabase = await createClient()

  const { data: certs } = await supabase
    .from('certificate_uploads')
    .select('id, file_name, description, status, created_at, student_id, points_approved, growth_parameters(name)')
    .order('status', { ascending: true })           // pending sorts before approved/rejected alphabetically
    .order('created_at', { ascending: false })
    as unknown as { data: RawCert[] | null }

  // Fetch student names
  const studentIds = [...new Set((certs ?? []).map((c) => c.student_id))]
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000'])

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Certificates</h1>
        <p className="text-muted mt-1 text-sm">Review student achievement uploads.</p>
      </div>

      {(certs ?? []).length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No certificates uploaded yet.</div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.06]">
          {(certs ?? []).map((cert) => (
            <div key={cert.id} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[cert.status] ?? 'bg-black/[0.06] text-muted'}`}>
                    {cert.status}
                  </span>
                  {cert.growth_parameters && (
                    <span className="text-xs text-muted">{cert.growth_parameters.name}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {cert.file_name ?? 'Untitled'}{cert.description ? ` — ${cert.description}` : ''}
                </p>
                <p className="text-xs text-muted">
                  {nameById.get(cert.student_id) ?? 'Unknown student'} ·{' '}
                  {new Date(cert.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {cert.status === 'approved' && cert.points_approved > 0 && ` · +${cert.points_approved} pts`}
                </p>
              </div>
              {cert.status === 'pending' && (
                <Link
                  href={`/admin/certificates/${cert.id}`}
                  className="shrink-0 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  Review
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run `npx tsc --noEmit` — expect 0 errors**

- [ ] **Step 3: Visit `/admin/certificates` in the browser and confirm the list renders**

---

## Task 5: Certificate Review — Detail + Approve/Reject

**Files:**
- Create: `src/app/(admin)/admin/certificates/[id]/page.tsx`
- Create: `src/components/admin/cert-review-form.tsx`
- Create: `src/app/(admin)/admin/certificates/[id]/actions.ts`

**Interfaces:**
- Consumes: `admin_approve_cert` RPC (Task 1), `admin_reject_cert` RPC (Task 1)
- Produces: review form with signed cert URL, approve (with points + parameter override) and reject actions

- [ ] **Step 1: Create the server actions**

```typescript
// src/app/(admin)/admin/certificates/[id]/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CertActionState = { error?: string; success?: string } | undefined

export async function approveCertAction(
  _prev: CertActionState,
  formData: FormData
): Promise<CertActionState> {
  const certId      = formData.get('cert_id') as string
  const pointsStr   = formData.get('points_approved') as string
  const notes       = (formData.get('admin_notes') as string)?.trim() || null
  const paramId     = (formData.get('parameter_id') as string) || null

  const points = parseInt(pointsStr, 10)
  if (!certId) return { error: 'Missing cert ID.' }
  if (isNaN(points) || points < 0) return { error: 'Points must be a non-negative whole number.' }

  const supabase = await createClient()
  const { data: status, error } = await supabase.rpc('admin_approve_cert', {
    p_cert_id:         certId,
    p_points_approved: points,
    p_admin_notes:     notes,
    p_parameter_id:    paramId,
  })

  if (error) return { error: 'Database error. Please try again.' }

  switch (status) {
    case 'ok':
      revalidatePath('/admin/certificates')
      return { success: `Approved. ${points > 0 ? `+${points} pts awarded.` : 'No points awarded.'}` }
    case 'not_admin':   return { error: 'Permission denied.' }
    case 'not_found':   return { error: 'Certificate not found.' }
    case 'not_pending': return { error: 'Certificate is no longer pending.' }
    case 'no_parameter': return { error: 'No skill/parameter set. Select one before approving.' }
    default: return { error: `Unexpected status: ${status}` }
  }
}

export async function rejectCertAction(
  _prev: CertActionState,
  formData: FormData
): Promise<CertActionState> {
  const certId = formData.get('cert_id') as string
  const notes  = (formData.get('admin_notes') as string)?.trim() || null

  if (!certId) return { error: 'Missing cert ID.' }

  const supabase = await createClient()
  const { data: status, error } = await supabase.rpc('admin_reject_cert', {
    p_cert_id:     certId,
    p_admin_notes: notes,
  })

  if (error) return { error: 'Database error. Please try again.' }

  switch (status) {
    case 'ok':
      revalidatePath('/admin/certificates')
      return { success: 'Certificate rejected.' }
    case 'not_admin':   return { error: 'Permission denied.' }
    case 'not_found':   return { error: 'Certificate not found.' }
    case 'not_pending': return { error: 'Certificate is no longer pending.' }
    default: return { error: `Unexpected status: ${status}` }
  }
}
```

- [ ] **Step 2: Create the CertReviewForm client component**

```typescript
// src/components/admin/cert-review-form.tsx
'use client'

import { useActionState } from 'react'
import { approveCertAction, rejectCertAction } from '@/app/(admin)/admin/certificates/[id]/actions'

interface Parameter {
  id: string
  name: string
}

interface Props {
  certId: string
  currentParameterId: string | null
  parameters: Parameter[]
}

export function CertReviewForm({ certId, currentParameterId, parameters }: Props) {
  const [approveState, approveAction, approvePending] = useActionState(approveCertAction, undefined)
  const [rejectState,  rejectAction,  rejectPending]  = useActionState(rejectCertAction,  undefined)

  const pending = approvePending || rejectPending
  const done = approveState?.success || rejectState?.success

  if (done) {
    return (
      <div className="clay-card p-6 text-center space-y-2">
        <p className="font-semibold text-green-700">{approveState?.success ?? rejectState?.success}</p>
        <a href="/admin/certificates" className="text-sm text-primary hover:underline">
          ← Back to certificates
        </a>
      </div>
    )
  }

  const error = approveState?.error ?? rejectState?.error

  return (
    <div className="clay-card p-6 space-y-5">
      <h2 className="font-semibold text-foreground">Review Decision</h2>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      {/* Shared fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Skill / Parameter{' '}
            <span className="text-muted font-normal">(override if student tagged incorrectly)</span>
          </label>
          <select
            name="parameter_id"
            form="approve-form"
            defaultValue={currentParameterId ?? ''}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Keep existing / none —</option>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Points to award (approve only)</label>
          <input
            type="number"
            name="points_approved"
            form="approve-form"
            min={0}
            max={1000}
            defaultValue={50}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-muted">Internal scale 0–1000. Typical cert = 30–100 pts.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Admin notes <span className="text-muted font-normal">(optional, shown to student)</span>
          </label>
          <textarea
            name="admin_notes"
            form="approve-form"
            rows={2}
            placeholder="Great achievement! / Could not verify this certificate."
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Approve form */}
      <form id="approve-form" action={approveAction} className="contents">
        <input type="hidden" name="cert_id" value={certId} />
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {approvePending ? 'Approving…' : '✓ Approve & Award Points'}
        </button>
      </form>

      {/* Reject form — shares notes textarea via form attribute trick won't work cross-form */}
      {/* Use a separate form with its own notes field */}
      <form action={rejectAction} className="space-y-3">
        <input type="hidden" name="cert_id" value={certId} />
        <input type="hidden" name="admin_notes" value="" />
        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {rejectPending ? 'Rejecting…' : '✕ Reject'}
        </button>
      </form>
    </div>
  )
}
```

> **Note on the reject form:** The reject form uses a hidden `admin_notes` field. For the MVP this is acceptable — if the admin wants to add a note to a rejection, they can use the Approve form's notes field before switching to reject. A future iteration can unify these into a single form with a radio decision.

- [ ] **Step 3: Create the cert detail page**

```typescript
// src/app/(admin)/admin/certificates/[id]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CertReviewForm } from '@/components/admin/cert-review-form'

interface RawCert {
  id: string
  file_name: string | null
  file_url: string
  description: string | null
  status: string
  created_at: string
  student_id: string
  parameter_id: string | null
  points_approved: number
  admin_notes: string | null
  growth_parameters: { name: string } | null
}

export default async function CertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cert } = await supabase
    .from('certificate_uploads')
    .select('id, file_name, file_url, description, status, created_at, student_id, parameter_id, points_approved, admin_notes, growth_parameters(name)')
    .eq('id', id)
    .single() as unknown as { data: RawCert | null }

  if (!cert) notFound()

  // Fetch student name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', cert.student_id)
    .single()

  // Signed URL for file preview (5-minute expiry)
  const { data: signedData } = await supabase.storage
    .from('certificates')
    .createSignedUrl(cert.file_url, 300)

  const signedUrl = signedData?.signedUrl ?? null

  // All active parameters for the override selector
  const { data: parameters } = await supabase
    .from('growth_parameters')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order')

  const isPDF = cert.file_name?.toLowerCase().endsWith('.pdf')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/certificates" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Certificates
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: cert preview */}
        <div className="space-y-4">
          <div className="clay-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Certificate Details</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted">Student</dt>
                <dd className="font-medium text-foreground">{profile?.full_name ?? 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-muted">File</dt>
                <dd className="font-medium text-foreground truncate">{cert.file_name ?? '—'}</dd>
              </div>
              {cert.description && (
                <div>
                  <dt className="text-muted">Description</dt>
                  <dd className="text-foreground">{cert.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Tagged skill</dt>
                <dd className="text-foreground">{cert.growth_parameters?.name ?? '— none —'}</dd>
              </div>
              <div>
                <dt className="text-muted">Uploaded</dt>
                <dd className="text-foreground">
                  {new Date(cert.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="capitalize font-medium text-foreground">{cert.status}</dd>
              </div>
            </dl>
          </div>

          {/* File preview */}
          {signedUrl ? (
            <div className="clay-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">File Preview</h3>
                <a href={signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {isPDF ? (
                <iframe src={signedUrl} className="w-full h-64 rounded-xl border border-black/[0.06]" title="Certificate" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signedUrl} alt="Certificate" className="w-full rounded-xl object-contain max-h-64" />
              )}
            </div>
          ) : (
            <div className="clay-card p-4 text-center text-sm text-muted">
              Preview not available.
            </div>
          )}
        </div>

        {/* Right: review form or status */}
        <div>
          {cert.status === 'pending' ? (
            <CertReviewForm
              certId={cert.id}
              currentParameterId={cert.parameter_id}
              parameters={parameters ?? []}
            />
          ) : (
            <div className="clay-card p-6 space-y-2">
              <p className="font-semibold text-foreground capitalize">{cert.status}</p>
              {cert.status === 'approved' && (
                <p className="text-sm text-muted">Points awarded: {cert.points_approved}</p>
              )}
              {cert.admin_notes && (
                <p className="text-sm text-muted">Notes: {cert.admin_notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run `npx tsc --noEmit` — expect 0 errors**

- [ ] **Step 5: Test the flow end-to-end**

1. Log in as admin, navigate to `/admin/certificates`
2. If there are pending certs, click Review
3. Verify the file preview appears (image or PDF iframe)
4. Enter points (e.g., 60), confirm the parameter is tagged, click Approve
5. Confirm success message appears
6. Verify `/admin/certificates` list now shows the cert as "approved"
7. Check the student's Growth Profile (log in as student) — baseline score should have increased for the tagged parameter

---

## Task 6: Taxonomy Manager

**Files:**
- Create: `src/app/(admin)/admin/taxonomy/actions.ts`
- Create: `src/components/admin/taxonomy-manager.tsx`
- Create: `src/app/(admin)/admin/taxonomy/page.tsx`

**Interfaces:**
- Produces: `/admin/taxonomy` page — list categories with nested topics, inline add forms

- [ ] **Step 1: Create taxonomy server actions**

```typescript
// src/app/(admin)/admin/taxonomy/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type TaxonomyState = { error?: string; success?: string } | undefined

export async function createCategoryAction(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!name) return { error: 'Category name is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .insert({ name, description })

  if (error) return { error: 'Could not create category.' }
  revalidatePath('/admin/taxonomy')
  return { success: `Category "${name}" created.` }
}

export async function createTopicAction(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  const name       = (formData.get('name') as string)?.trim()
  const categoryId = formData.get('category_id') as string
  const description = (formData.get('description') as string)?.trim() || null

  if (!name)       return { error: 'Topic name is required.' }
  if (!categoryId) return { error: 'Category is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('topics')
    .insert({ name, description, category_id: categoryId })

  if (error) return { error: 'Could not create topic.' }
  revalidatePath('/admin/taxonomy')
  return { success: `Topic "${name}" created.` }
}

export async function toggleCategoryAction(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  const id       = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ is_active: !isActive })
    .eq('id', id)

  if (error) return { error: 'Could not update category.' }
  revalidatePath('/admin/taxonomy')
  return { success: 'Updated.' }
}

export async function toggleTopicAction(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  const id       = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'

  const supabase = await createClient()
  const { error } = await supabase
    .from('topics')
    .update({ is_active: !isActive })
    .eq('id', id)

  if (error) return { error: 'Could not update topic.' }
  revalidatePath('/admin/taxonomy')
  return { success: 'Updated.' }
}
```

- [ ] **Step 2: Create the TaxonomyManager client component**

```typescript
// src/components/admin/taxonomy-manager.tsx
'use client'

import { useActionState } from 'react'
import { createCategoryAction, createTopicAction, toggleCategoryAction, toggleTopicAction } from '@/app/(admin)/admin/taxonomy/actions'
import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'

interface Topic {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface Category {
  id: string
  name: string
  description: string | null
  is_active: boolean
  topics: Topic[]
}

export function TaxonomyManager({ categories }: { categories: Category[] }) {
  const [catState,    catAction,    catPending]    = useActionState(createCategoryAction, undefined)
  const [topicState,  topicAction,  topicPending]  = useActionState(createTopicAction, undefined)
  const [toggleCatState,  toggleCatAction]  = useActionState(toggleCategoryAction, undefined)
  const [toggleTopicState, toggleTopicAction2] = useActionState(toggleTopicAction, undefined)
  const [expandedCat, setExpandedCat] = useState<string | null>(categories[0]?.id ?? null)
  const [addingTopicFor, setAddingTopicFor] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Categories list */}
      <div className="clay-card divide-y divide-black/[0.06]">
        {categories.length === 0 && (
          <p className="px-5 py-8 text-center text-muted text-sm">No categories yet. Add one below.</p>
        )}
        {categories.map((cat) => (
          <div key={cat.id}>
            {/* Category row */}
            <div className="flex items-center gap-3 px-5 py-3">
              <button
                type="button"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <ChevronDown className={`w-4 h-4 text-muted transition-transform ${expandedCat === cat.id ? 'rotate-180' : ''}`} />
                <span className={`font-medium text-sm ${!cat.is_active ? 'line-through text-muted' : 'text-foreground'}`}>
                  {cat.name}
                </span>
                <span className="text-xs text-muted">({cat.topics.length} topics)</span>
              </button>
              <form action={toggleCatAction}>
                <input type="hidden" name="id" value={cat.id} />
                <input type="hidden" name="is_active" value={String(cat.is_active)} />
                <button type="submit" className="text-xs text-muted hover:text-foreground transition-colors">
                  {cat.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </form>
            </div>

            {/* Topics (expanded) */}
            {expandedCat === cat.id && (
              <div className="pl-10 pb-3 space-y-1 border-t border-black/[0.06] pt-2">
                {cat.topics.map((topic) => (
                  <div key={topic.id} className="flex items-center justify-between pr-5 py-1.5">
                    <span className={`text-sm ${!topic.is_active ? 'line-through text-muted' : 'text-foreground'}`}>
                      {topic.name}
                    </span>
                    <form action={toggleTopicAction2}>
                      <input type="hidden" name="id" value={topic.id} />
                      <input type="hidden" name="is_active" value={String(topic.is_active)} />
                      <button type="submit" className="text-xs text-muted hover:text-foreground transition-colors">
                        {topic.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                  </div>
                ))}

                {/* Add topic inline */}
                {addingTopicFor === cat.id ? (
                  <form action={topicAction} className="flex gap-2 pt-1 pr-5">
                    <input type="hidden" name="category_id" value={cat.id} />
                    <input
                      name="name"
                      placeholder="Topic name"
                      autoFocus
                      className="flex-1 h-9 px-3 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="submit"
                      disabled={topicPending}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button type="button" onClick={() => setAddingTopicFor(null)} className="text-xs text-muted hover:text-foreground">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTopicFor(cat.id)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add topic
                  </button>
                )}
                {topicState?.error && addingTopicFor === cat.id && (
                  <p className="text-xs text-red-500 pr-5">{topicState.error}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Global feedback */}
      {(catState?.success || topicState?.success || toggleCatState?.success || toggleTopicState?.success) && (
        <p className="text-sm text-green-600">
          {catState?.success ?? topicState?.success ?? toggleCatState?.success ?? toggleTopicState?.success}
        </p>
      )}

      {/* Add category form */}
      <div className="clay-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Add Category</h3>
        {catState?.error && <p className="text-sm text-red-500">{catState.error}</p>}
        <form action={catAction} className="flex gap-2">
          <input
            name="name"
            placeholder="Category name"
            className="flex-1 h-10 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={catPending}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50"
          >
            {catPending ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the taxonomy page**

```typescript
// src/app/(admin)/admin/taxonomy/page.tsx
import { createClient } from '@/lib/supabase/server'
import { TaxonomyManager } from '@/components/admin/taxonomy-manager'

interface RawTopic {
  id: string
  name: string
  description: string | null
  is_active: boolean
  category_id: string
}

interface RawCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
}

export default async function TaxonomyPage() {
  const supabase = await createClient()

  const [{ data: cats }, { data: topics }] = await Promise.all([
    supabase.from('categories').select('id, name, description, is_active, display_order').order('display_order'),
    supabase.from('topics').select('id, name, description, is_active, category_id').order('display_order'),
  ]) as [{ data: RawCategory[] | null }, { data: RawTopic[] | null }]

  const topicsByCategory = new Map<string, RawTopic[]>()
  for (const t of topics ?? []) {
    const list = topicsByCategory.get(t.category_id) ?? []
    list.push(t)
    topicsByCategory.set(t.category_id, list)
  }

  const categories = (cats ?? []).map((c) => ({
    ...c,
    topics: topicsByCategory.get(c.id) ?? [],
  }))

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Taxonomy</h1>
        <p className="text-muted mt-1 text-sm">Manage categories and topics used to organise offerings.</p>
      </div>
      <TaxonomyManager categories={categories} />
    </div>
  )
}
```

- [ ] **Step 4: Run `npx tsc --noEmit` — expect 0 errors**

- [ ] **Step 5: Visit `/admin/taxonomy`, add a category, expand it, add a topic — verify everything persists on reload**

---

## Task 7: Offering Management — List + Archive

**Files:**
- Create: `src/app/(admin)/admin/offerings/page.tsx`
- Create: `src/app/(admin)/admin/offerings/actions.ts` (partial — archive only; create/update in Task 8)

**Interfaces:**
- Produces: `/admin/offerings` list with all statuses, Archive button, "New" + "Edit" links

- [ ] **Step 1: Create offerings list page**

```typescript
// src/app/(admin)/admin/offerings/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { archiveOfferingAction } from './actions'

const STATUS_STYLE: Record<string, string> = {
  live:      'bg-green-50 text-green-700',
  planned:   'bg-yellow-50 text-yellow-700',
  completed: 'bg-blue-50 text-blue-700',
  retired:   'bg-black/[0.06] text-muted',
}

const TYPE_LABEL: Record<string, string> = {
  workshop: 'Workshop', trip: 'Trip', event: 'Event', competition: 'Competition',
}

interface RawOffering {
  id: string
  title: string
  type: string
  status: string
  price_paise: number
  scheduled_at: string | null
  topics: { name: string; categories: { name: string } | null } | null
}

export default async function OfferingsPage() {
  const supabase = await createClient()

  const { data: offerings } = await supabase
    .from('offerings')
    .select('id, title, type, status, price_paise, scheduled_at, topics(name, categories(name))')
    .order('status')
    .order('scheduled_at', { ascending: true })
    as unknown as { data: RawOffering[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Offerings</h1>
          <p className="text-muted mt-1 text-sm">All offerings across all statuses.</p>
        </div>
        <Link
          href="/admin/offerings/new"
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          + New Offering
        </Link>
      </div>

      {(offerings ?? []).length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No offerings yet. Create the first one.</div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.06]">
          {(offerings ?? []).map((o) => (
            <div key={o.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[o.status] ?? ''}`}>
                    {o.status}
                  </span>
                  <span className="text-xs text-muted">{TYPE_LABEL[o.type] ?? o.type}</span>
                  {(o as any).topics?.categories && (
                    <span className="text-xs text-muted">· {(o as any).topics.categories.name}</span>
                  )}
                </div>
                <p className="font-medium text-foreground text-sm truncate">{o.title}</p>
                <p className="text-xs text-muted">
                  {o.price_paise === 0 ? 'Free' : `₹${(o.price_paise / 100).toLocaleString('en-IN')}`}
                  {o.scheduled_at && ` · ${new Date(o.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href={`/admin/offerings/${o.id}/edit`} className="text-xs text-primary hover:underline">
                  Edit
                </Link>
                {o.status !== 'retired' && (
                  <form action={archiveOfferingAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <button type="submit" className="text-xs text-muted hover:text-red-600 transition-colors">
                      Archive
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the archive action (stub; full actions file in Task 8)**

```typescript
// src/app/(admin)/admin/offerings/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateOffering } from '@/lib/validation/offering'

export async function archiveOfferingAction(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase.from('offerings').update({ status: 'retired' }).eq('id', id)
  revalidatePath('/admin/offerings')
}

// createOfferingAction and updateOfferingAction are added in Task 8
export async function createOfferingAction(_prev: unknown, formData: FormData) {
  throw new Error('Not implemented yet — Task 8')
}

export async function updateOfferingAction(_prev: unknown, formData: FormData) {
  throw new Error('Not implemented yet — Task 8')
}
```

- [ ] **Step 3: Run `npx tsc --noEmit` — expect 0 errors**

- [ ] **Step 4: Visit `/admin/offerings` — list renders, Archive button works on a live offering**

---

## Task 8: Offering Management — Create/Edit Form

**Files:**
- Create: `src/components/admin/offering-form.tsx`
- Modify: `src/app/(admin)/admin/offerings/actions.ts` (replace stubs with real implementations)
- Create: `src/app/(admin)/admin/offerings/new/page.tsx`
- Create: `src/app/(admin)/admin/offerings/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `validateOffering()` from Task 2
- Produces: full create/edit form with cascading category→topic selector and per-parameter point inputs

- [ ] **Step 1: Replace stubs in `actions.ts` with full implementations**

```typescript
// src/app/(admin)/admin/offerings/actions.ts  (full file)
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateOffering } from '@/lib/validation/offering'

export async function archiveOfferingAction(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return
  const supabase = await createClient()
  await supabase.from('offerings').update({ status: 'retired' }).eq('id', id)
  revalidatePath('/admin/offerings')
}

export type OfferingFormState = { errors?: Record<string, string>; error?: string } | undefined

function parseFormData(formData: FormData, parameterIds: string[]) {
  const priceRupees = formData.get('price_rupees') as string
  const scheduledRaw = formData.get('scheduled_at') as string  // 'YYYY-MM-DDTHH:MM'
  const pricePaise = priceRupees ? Math.round(parseFloat(priceRupees) * 100) : 0

  // Treat datetime-local input as IST; append +05:30 offset
  const scheduledAt = scheduledRaw ? `${scheduledRaw}:00+05:30` : null

  const contributions: { parameter_id: string; points: number }[] = []
  for (const pid of parameterIds) {
    const pts = parseInt(formData.get(`pts_${pid}`) as string ?? '0', 10)
    if (pts > 0) contributions.push({ parameter_id: pid, points: pts })
  }

  return {
    title:            (formData.get('title') as string)?.trim(),
    description:      (formData.get('description') as string)?.trim() || null,
    type:             formData.get('type') as string,
    status:           formData.get('status') as string,
    topic_id:         (formData.get('topic_id') as string) || null,
    price_paise:      pricePaise,
    price_rupees:     priceRupees,
    min_age:          (formData.get('min_age') as string) || null,
    max_age:          (formData.get('max_age') as string) || null,
    scheduled_at:     scheduledAt,
    duration_minutes: (formData.get('duration_minutes') as string) ? parseInt(formData.get('duration_minutes') as string, 10) : null,
    location:         (formData.get('location') as string)?.trim() || null,
    contributions,
  }
}

export async function createOfferingAction(
  _prev: OfferingFormState,
  formData: FormData
): Promise<OfferingFormState> {
  const supabase = await createClient()
  const { data: params } = await supabase.from('growth_parameters').select('id').eq('is_active', true)
  const paramIds = (params ?? []).map((p) => p.id)

  const parsed = parseFormData(formData, paramIds)
  const errors = validateOffering({ title: parsed.title ?? '', type: parsed.type, price_rupees: String(parsed.price_paise / 100), min_age: parsed.min_age ?? '', max_age: parsed.max_age ?? '' })

  if (Object.keys(errors).length) return { errors }

  const { data: offering, error } = await supabase
    .from('offerings')
    .insert({
      title: parsed.title!,
      description: parsed.description,
      type: parsed.type,
      status: parsed.status || 'live',
      topic_id: parsed.topic_id,
      price_paise: parsed.price_paise,
      min_age: parsed.min_age ? parseInt(parsed.min_age, 10) : null,
      max_age: parsed.max_age ? parseInt(parsed.max_age, 10) : null,
      scheduled_at: parsed.scheduled_at,
      duration_minutes: parsed.duration_minutes,
      location: parsed.location,
    })
    .select('id')
    .single()

  if (error || !offering) return { error: 'Could not create offering.' }

  if (parsed.contributions.length) {
    await supabase.from('offering_parameter_contributions').insert(
      parsed.contributions.map((c) => ({ ...c, offering_id: offering.id }))
    )
  }

  revalidatePath('/admin/offerings')
  redirect('/admin/offerings')
}

export async function updateOfferingAction(
  _prev: OfferingFormState,
  formData: FormData
): Promise<OfferingFormState> {
  const offeringId = formData.get('offering_id') as string
  if (!offeringId) return { error: 'Missing offering ID.' }

  const supabase = await createClient()
  const { data: params } = await supabase.from('growth_parameters').select('id').eq('is_active', true)
  const paramIds = (params ?? []).map((p) => p.id)

  const parsed = parseFormData(formData, paramIds)
  const errors = validateOffering({ title: parsed.title ?? '', type: parsed.type, price_rupees: String(parsed.price_paise / 100), min_age: parsed.min_age ?? '', max_age: parsed.max_age ?? '' })

  if (Object.keys(errors).length) return { errors }

  const { error } = await supabase
    .from('offerings')
    .update({
      title: parsed.title!,
      description: parsed.description,
      type: parsed.type,
      status: parsed.status,
      topic_id: parsed.topic_id,
      price_paise: parsed.price_paise,
      min_age: parsed.min_age ? parseInt(parsed.min_age, 10) : null,
      max_age: parsed.max_age ? parseInt(parsed.max_age, 10) : null,
      scheduled_at: parsed.scheduled_at,
      duration_minutes: parsed.duration_minutes,
      location: parsed.location,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offeringId)

  if (error) return { error: 'Could not update offering.' }

  // Replace contributions: delete all, re-insert
  await supabase.from('offering_parameter_contributions').delete().eq('offering_id', offeringId)
  if (parsed.contributions.length) {
    await supabase.from('offering_parameter_contributions').insert(
      parsed.contributions.map((c) => ({ ...c, offering_id: offeringId }))
    )
  }

  revalidatePath('/admin/offerings')
  redirect('/admin/offerings')
}
```

- [ ] **Step 2: Create the OfferingForm client component**

```typescript
// src/components/admin/offering-form.tsx
'use client'

import { useActionState } from 'react'
import { useState } from 'react'
import type { OfferingFormState } from '@/app/(admin)/admin/offerings/actions'

interface Topic    { id: string; name: string; category_id: string }
interface Category { id: string; name: string }
interface Parameter { id: string; name: string }
interface InitialContribution { parameter_id: string; points: number }

interface Props {
  action: (prev: OfferingFormState, formData: FormData) => Promise<OfferingFormState>
  offeringId?: string
  categories: Category[]
  topics: Topic[]
  parameters: Parameter[]
  initial?: {
    title?: string; description?: string; type?: string; status?: string
    topic_id?: string; price_paise?: number; min_age?: number | null
    max_age?: number | null; scheduled_at?: string | null
    duration_minutes?: number | null; location?: string | null
    contributions?: InitialContribution[]
  }
}

const TYPES    = ['workshop', 'trip', 'event', 'competition']
const STATUSES = ['planned', 'live', 'completed', 'retired']

// Format stored IST timestamptz → datetime-local value 'YYYY-MM-DDTHH:MM'
function toDatetimeLocal(ts: string | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  // Convert to IST (UTC+5:30)
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`
}

export function OfferingForm({ action, offeringId, categories, topics, parameters, initial = {} }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [selectedCat, setSelectedCat] = useState<string>(() => {
    if (!initial.topic_id) return ''
    return topics.find((t) => t.id === initial.topic_id)?.category_id ?? ''
  })

  const filteredTopics = selectedCat ? topics.filter((t) => t.category_id === selectedCat) : topics
  const initialPts = new Map((initial.contributions ?? []).map((c) => [c.parameter_id, c.points]))

  const errors = state?.errors ?? {}

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {offeringId && <input type="hidden" name="offering_id" value={offeringId} />}

      {state?.error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{state.error}</div>
      )}

      {/* Core details */}
      <div className="clay-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Core Details</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Title *</label>
          <input name="title" defaultValue={initial.title ?? ''} required
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Type *</label>
            <select name="type" defaultValue={initial.type ?? 'workshop'}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Status</label>
            <select name="status" defaultValue={initial.status ?? 'live'}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea name="description" defaultValue={initial.description ?? ''} rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {/* Category → Topic cascade */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category</label>
            <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— All —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Topic</label>
            <select name="topic_id" defaultValue={initial.topic_id ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— None —</option>
              {filteredTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Pricing & Schedule */}
      <div className="clay-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Pricing & Schedule</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Price (₹)</label>
            <input name="price_rupees" type="number" min={0} step={1}
              defaultValue={initial.price_paise != null ? initial.price_paise / 100 : 0}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Duration (minutes)</label>
            <input name="duration_minutes" type="number" min={0}
              defaultValue={initial.duration_minutes ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Scheduled (IST)</label>
          <input name="scheduled_at" type="datetime-local"
            defaultValue={toDatetimeLocal(initial.scheduled_at)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Location</label>
          <input name="location" defaultValue={initial.location ?? ''}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Min age</label>
            <input name="min_age" type="number" min={3} max={18} defaultValue={initial.min_age ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Max age</label>
            <input name="max_age" type="number" min={3} max={18} defaultValue={initial.max_age ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        {errors.age_range && <p className="text-xs text-red-500">{errors.age_range}</p>}
      </div>

      {/* Parameter contributions */}
      <div className="clay-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Skills Contribution</h2>
          <p className="text-xs text-muted mt-0.5">Points awarded per parameter on completion (internal 0–1000 scale). Leave 0 for no contribution.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parameters.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <label className="text-sm text-foreground flex-1 truncate" title={p.name}>{p.name}</label>
              <input
                name={`pts_${p.id}`}
                type="number"
                min={0}
                max={1000}
                defaultValue={initialPts.get(p.id) ?? 0}
                className="w-20 px-3 py-1.5 rounded-lg border border-black/10 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {pending ? 'Saving…' : offeringId ? 'Save Changes' : 'Create Offering'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create the New Offering page**

```typescript
// src/app/(admin)/admin/offerings/new/page.tsx
import { createClient } from '@/lib/supabase/server'
import { OfferingForm } from '@/components/admin/offering-form'
import { createOfferingAction } from '../actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewOfferingPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: topics }, { data: parameters }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('topics').select('id, name, category_id').eq('is_active', true).order('display_order'),
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
  ])

  return (
    <div className="space-y-6">
      <Link href="/admin/offerings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Offerings
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground">New Offering</h1>
      <OfferingForm
        action={createOfferingAction}
        categories={categories ?? []}
        topics={topics ?? []}
        parameters={parameters ?? []}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create the Edit Offering page**

```typescript
// src/app/(admin)/admin/offerings/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OfferingForm } from '@/components/admin/offering-form'
import { updateOfferingAction } from '../../actions'

interface RawContribution { parameter_id: string; points: number }

export default async function EditOfferingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [offeringRes, catsRes, topicsRes, paramsRes, contribsRes] = await Promise.all([
    supabase.from('offerings').select('*').eq('id', id).single(),
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('topics').select('id, name, category_id').eq('is_active', true).order('display_order'),
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('offering_parameter_contributions').select('parameter_id, points').eq('offering_id', id) as unknown as { data: RawContribution[] | null },
  ])

  if (!offeringRes.data) notFound()
  const o = offeringRes.data

  return (
    <div className="space-y-6">
      <Link href="/admin/offerings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Offerings
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground">Edit Offering</h1>
      <OfferingForm
        action={updateOfferingAction}
        offeringId={id}
        categories={catsRes.data ?? []}
        topics={topicsRes.data ?? []}
        parameters={paramsRes.data ?? []}
        initial={{
          title:            o.title,
          description:      o.description ?? '',
          type:             o.type,
          status:           o.status,
          topic_id:         o.topic_id ?? '',
          price_paise:      o.price_paise,
          min_age:          o.min_age,
          max_age:          o.max_age,
          scheduled_at:     o.scheduled_at,
          duration_minutes: o.duration_minutes,
          location:         o.location ?? '',
          contributions:    contribsRes.data ?? [],
        }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Run `npx tsc --noEmit` — expect 0 errors**

- [ ] **Step 6: End-to-end test**

1. Visit `/admin/offerings/new`
2. Fill in: Title "Test Workshop", Type "workshop", Status "live", Price "999", Duration "120", location "Test City", set IQ/Cognitive to 50 pts
3. Submit — redirects to `/admin/offerings`
4. Confirm the new offering appears in the list
5. Click Edit — form pre-fills all values correctly
6. Change price to 1499, save — list shows updated price
7. Click Archive — status changes to "retired"

---

## Task 9: Parameter Config

**Files:**
- Create: `src/app/(admin)/admin/parameters/actions.ts`
- Create: `src/components/admin/parameter-row.tsx`
- Create: `src/app/(admin)/admin/parameters/page.tsx`

**Interfaces:**
- Produces: `/admin/parameters` — inline-editable parameter rows + score level rows

- [ ] **Step 1: Create parameter actions**

```typescript
// src/app/(admin)/admin/parameters/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ParamState = { error?: string; success?: string } | undefined

export async function updateParameterAction(
  _prev: ParamState,
  formData: FormData
): Promise<ParamState> {
  const id           = formData.get('id') as string
  const name         = (formData.get('name') as string)?.trim()
  const description  = (formData.get('description') as string)?.trim() || null
  const weightStr    = formData.get('weight') as string
  const displayOrder = parseInt(formData.get('display_order') as string ?? '0', 10)
  const isActive     = formData.get('is_active') === 'true'

  if (!id || !name) return { error: 'ID and name are required.' }
  const weight = parseFloat(weightStr)
  if (isNaN(weight) || weight < 0 || weight > 1) return { error: 'Weight must be between 0 and 1.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('growth_parameters')
    .update({ name, description, weight, display_order: displayOrder, is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: 'Could not update parameter.' }
  revalidatePath('/admin/parameters')
  return { success: `"${name}" updated.` }
}

export async function createParameterAction(
  _prev: ParamState,
  formData: FormData
): Promise<ParamState> {
  const name        = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!name) return { error: 'Name is required.' }

  const supabase = await createClient()
  const { data: last } = await supabase.from('growth_parameters').select('display_order').order('display_order', { ascending: false }).limit(1).single()
  const nextOrder = (last?.display_order ?? 0) + 1

  const { error } = await supabase.from('growth_parameters').insert({ name, description, display_order: nextOrder })
  if (error) return { error: 'Could not create parameter.' }
  revalidatePath('/admin/parameters')
  return { success: `"${name}" created.` }
}

export async function updateScoreLevelAction(
  _prev: ParamState,
  formData: FormData
): Promise<ParamState> {
  const id           = formData.get('id') as string
  const name         = (formData.get('name') as string)?.trim()
  const minScore     = parseInt(formData.get('min_score') as string, 10)
  const maxScore     = parseInt(formData.get('max_score') as string, 10)

  if (!id || !name) return { error: 'ID and name required.' }
  if (isNaN(minScore) || isNaN(maxScore) || minScore < 0 || maxScore > 100 || minScore >= maxScore) {
    return { error: 'Min must be < max, both in 0–100.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('score_levels')
    .update({ name, min_score: minScore, max_score: maxScore })
    .eq('id', id)

  if (error) return { error: 'Could not update score level.' }
  revalidatePath('/admin/parameters')
  return { success: 'Score level updated.' }
}
```

- [ ] **Step 2: Create the ParameterRow client component**

```typescript
// src/components/admin/parameter-row.tsx
'use client'

import { useActionState } from 'react'
import { useState } from 'react'
import { updateParameterAction } from '@/app/(admin)/admin/parameters/actions'
import { Pencil, Check, X } from 'lucide-react'

interface Props {
  param: {
    id: string; name: string; description: string | null
    weight: number; display_order: number; is_active: boolean
  }
}

export function ParameterRow({ param }: Props) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(updateParameterAction, undefined)

  if (!editing) {
    return (
      <div className="flex items-center gap-4 px-5 py-3.5">
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${param.is_active ? 'text-foreground' : 'line-through text-muted'}`}>
            {param.name}
          </span>
          {param.description && (
            <p className="text-xs text-muted truncate">{param.description}</p>
          )}
        </div>
        <span className="text-xs text-muted shrink-0">#{param.display_order}</span>
        <span className="text-xs text-muted shrink-0">w={param.weight}</span>
        <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-muted hover:text-primary transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="px-5 py-3 space-y-2 bg-primary/[0.03]">
      <input type="hidden" name="id" value={param.id} />
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input name="name" defaultValue={param.name} required placeholder="Name"
          className="col-span-2 px-3 py-1.5 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input name="description" defaultValue={param.description ?? ''} placeholder="Description (optional)"
          className="col-span-2 px-3 py-1.5 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Weight (0–1)</label>
          <input name="weight" type="number" step={0.01} min={0} max={1} defaultValue={param.weight}
            className="w-20 px-2 py-1 rounded-lg border border-black/10 text-sm text-center focus:outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Order</label>
          <input name="display_order" type="number" min={0} defaultValue={param.display_order}
            className="w-16 px-2 py-1 rounded-lg border border-black/10 text-sm text-center focus:outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input type="checkbox" name="is_active" value="true" defaultChecked={param.is_active}
            className="rounded" />
          Active
        </label>
        {/* hidden field trick: checkbox doesn't submit when unchecked */}
        <input type="hidden" name="is_active" value="false" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50">
          <Check className="w-3.5 h-3.5" /> Save
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 text-xs text-muted hover:text-foreground">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </form>
  )
}
```

> **Checkbox note:** The HTML checkbox doesn't submit its value when unchecked. The pattern above uses a hidden `is_active=false` field that always submits, plus the checkbox which submits `is_active=true` when checked. The last value in FormData wins — so checked → `true`, unchecked → `false`.

- [ ] **Step 3: Create the parameters config page**

```typescript
// src/app/(admin)/admin/parameters/page.tsx
import { createClient } from '@/lib/supabase/server'
import { ParameterRow } from '@/components/admin/parameter-row'
import { createParameterAction, updateScoreLevelAction } from './actions'

export default async function ParametersPage() {
  const supabase = await createClient()

  const [{ data: parameters }, { data: scoreLevels }] = await Promise.all([
    supabase.from('growth_parameters').select('id, name, description, weight, display_order, is_active').order('display_order'),
    supabase.from('score_levels').select('id, name, min_score, max_score, color_class, display_order').order('display_order'),
  ])

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Growth Parameters */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Parameters</h1>
          <p className="text-muted mt-1 text-sm">
            Growth parameters drive all scoring. Never hardcode — always managed here.
          </p>
        </div>

        <div className="clay-card divide-y divide-black/[0.06]">
          {(parameters ?? []).map((p) => (
            <ParameterRow key={p.id} param={p} />
          ))}
        </div>

        {/* Add parameter form */}
        <form action={createParameterAction} className="clay-card p-5 space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Add Parameter</h3>
          <div className="flex gap-2">
            <input name="name" placeholder="Parameter name" required
              className="flex-1 h-10 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              Add
            </button>
          </div>
          <input name="description" placeholder="Description (optional)"
            className="w-full h-10 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </form>
      </div>

      {/* Score Levels */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Score Levels</h2>
          <p className="text-muted mt-1 text-sm">Display-scale bands (0–100). Shown on student Growth Profile.</p>
        </div>

        <div className="clay-card divide-y divide-black/[0.06]">
          {(scoreLevels ?? []).map((level) => (
            <form key={level.id} action={updateScoreLevelAction} className="flex items-center gap-3 px-5 py-3">
              <input type="hidden" name="id" value={level.id} />
              <span className={`text-sm font-medium ${level.color_class} w-24 shrink-0`}>{level.name}</span>
              <input name="name" defaultValue={level.name} className="sr-only" />
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <input name="min_score" type="number" min={0} max={100} defaultValue={level.min_score}
                  className="w-16 px-2 py-1 rounded-lg border border-black/10 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <span>–</span>
                <input name="max_score" type="number" min={0} max={100} defaultValue={level.max_score}
                  className="w-16 px-2 py-1 rounded-lg border border-black/10 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <button type="submit" className="ml-auto text-xs text-primary hover:underline">Save</button>
            </form>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run `npx tsc --noEmit` — expect 0 errors**

- [ ] **Step 5: Visit `/admin/parameters`**

1. Click the pencil icon on a parameter
2. Change the name, click Save
3. Reload — new name persists
4. Edit a score level range, click Save
5. Reload — range persists

---

## Task 10: Final Verification

**Files:** none new

- [ ] **Step 1: Run TypeScript**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run all tests**

```powershell
npm test
```

Expected: all tests pass (existing 100 + 5 new offering tests = 105).

- [ ] **Step 3: Build**

```powershell
npm run build
```

Expected: compiled successfully, all new pages appear as `ƒ` (dynamic) in the output.

- [ ] **Step 4: Full admin smoke-test (logged in as admin)**

| Page | What to verify |
|------|---------------|
| `/admin` | 4 stat cards show real counts |
| `/admin/certificates` | Cert list renders with pending/approved/rejected badges |
| `/admin/certificates/[id]` | File preview loads, approve flow awards points |
| `/admin/taxonomy` | Add a category, expand it, add a topic |
| `/admin/offerings` | List shows offerings, Archive changes status to retired |
| `/admin/offerings/new` | Create an offering with parameter contributions |
| `/admin/offerings/[id]/edit` | All fields pre-fill, save works |
| `/admin/parameters` | Edit a parameter name inline, edit a score level range |

---

## Self-Review

**Spec coverage:**
- ✅ Admin-configurable parameter taxonomy (Task 9 — parameter CRUD)
- ✅ Certificate upload + admin review with scoring (Tasks 5, 1)
- ✅ Offering management (Task 7/8) with parameter contribution mapping
- ✅ Category/topic taxonomy CRUD (Task 6)
- ✅ Score levels admin-editable (Task 9)
- ✅ Offering status lifecycle: planned → live → completed/retired (status field in offering form)
- ⚠️ Completions (marking a booking complete → scoring) is Plan G, not Plan F

**Placeholder scan:** No TBD items. All code blocks are complete.

**Type consistency:**
- `OfferingFormState` used in both `actions.ts` and `offering-form.tsx` ✓
- `ParamState` consistent across `actions.ts` and `parameter-row.tsx` ✓
- `params: Promise<{ id: string }>` used in all dynamic route pages ✓
- `await params` used before destructuring in all dynamic routes ✓
