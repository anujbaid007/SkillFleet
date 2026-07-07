# Student Dashboard & Growth Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/dashboard` placeholder and create the `/profile` page so students can see their 10 growth parameter scores with animated bars and level badges; give parents a children-list dashboard.

**Architecture:** Server Components fetch `student_parameter_scores` + `growth_parameters` + `score_levels` from Supabase in parallel. The scoring engine from Plan B provides `internalToDisplay` (0–1000 → 0–100) and `scoreLevelFor` (0–100 → level row). `ScoreBar` is a Client Component (`motion/react`) that animates the fill on mount. `ParameterCard` is a Server Component that composes name + badge + bar. No new utility functions are written — Plan B's scoring engine covers all the math.

**Tech Stack:** Next.js 16.2.6 App Router, React 19, Supabase PostgREST (fully typed — all tables in `database.ts`), Tailwind CSS v4 (`@theme inline` CSS variables), `motion/react` v12, `lucide-react` v1.14.

## Global Constraints

- Supabase project: `bbioktywqkfvpzmakdxt` only — never touch `happyfleet`
- No commits, no push, no main branch changes — user reviews on localhost first
- Admin service-role key is server-only; never imported in Client Components
- Score internal scale 0–1000 stored in `student_parameter_scores`; display scale 0–100 used by `score_levels` and all UI — convert with `internalToDisplay()` from `@/lib/scoring`
- Tailwind colors live in `src/app/globals.css` `@theme inline` block, NOT `tailwind.config.ts`
- Animation: `import { motion } from 'motion/react'` — NOT `framer-motion`
- `get_my_children` RPC returns `{ student_id, full_name, email, relationship }[]` — field is `student_id`, not `id`
- `score_levels.color_class` values are: `'text-accent-yellow'`, `'text-accent-teal'`, `'text-primary'`, `'text-accent-purple'`, `'text-accent-pink'`
- Vitest test count stays at 86 — no new utility functions, so no new unit tests

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/dashboard/score-bar.tsx` | Create | `'use client'` — animated progress bar; width = `internalToDisplay(total)%`; color from `levelColorClass` via CSS-var map |
| `src/components/dashboard/parameter-card.tsx` | Create | Server Component — clay card with parameter name, level badge, ScoreBar |
| `src/app/(platform)/dashboard/page.tsx` | Rewrite | Student: onboarding gate + overall stat + top-3 cards + link to `/profile`; Parent: children list |
| `src/app/(platform)/profile/page.tsx` | Create | Student only: full 10-parameter grid (2 cols on desktop) |

---

### Task 0: ScoreBar component

**Files:**
- Create: `src/components/dashboard/score-bar.tsx`

**Interfaces:**
- Consumes: `motion` from `motion/react`
- Produces: `<ScoreBar total={number} levelColorClass={string} className?={string} />`
  - `total` — raw internal score 0–1000
  - `levelColorClass` — `score_levels.color_class` value, e.g. `'text-accent-teal'`

- [ ] **Step 1: Create the file**

```tsx
// src/components/dashboard/score-bar.tsx
'use client'

import { motion } from 'motion/react'

// `score_levels.color_class` is a `text-*` Tailwind class. We need the
// corresponding background color for the bar fill. We can't do
// `bg-${cls.replace('text-','')}` because Tailwind's scanner won't detect
// dynamically-constructed class names — so we map to CSS variables instead.
const LEVEL_BAR_COLOR: Record<string, string> = {
  'text-accent-yellow': 'var(--color-accent-yellow)',
  'text-accent-teal':   'var(--color-accent-teal)',
  'text-primary':       'var(--color-primary)',
  'text-accent-purple': 'var(--color-accent-purple)',
  'text-accent-pink':   'var(--color-accent-pink)',
}

interface ScoreBarProps {
  /** Raw internal score 0–1000 (sum of baseline_score + accrued_score) */
  total: number
  /** score_levels.color_class value, e.g. 'text-accent-teal' */
  levelColorClass: string
  className?: string
}

export function ScoreBar({ total, levelColorClass, className = '' }: ScoreBarProps) {
  // Convert to display scale (0–100) — same logic as internalToDisplay() in @/lib/scoring.
  // Inlined here to keep ScoreBar self-contained (no server-only lib imports in a 'use client').
  const displayPct = Math.min(Math.round(Math.max(0, total) / 10), 100)
  const barColor = LEVEL_BAR_COLOR[levelColorClass] ?? 'var(--color-primary)'

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-xs text-muted">
        <span>{total} pts</span>
        <span>{displayPct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${displayPct}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.1 }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors related to `score-bar.tsx`.

---

### Task 1: ParameterCard component

**Files:**
- Create: `src/components/dashboard/parameter-card.tsx`

**Interfaces:**
- Consumes: `ScoreBar` from Task 0
- Produces: `<ParameterCard name={string} total={number} levelName={string} levelColorClass={string} />`

- [ ] **Step 1: Create the file**

```tsx
// src/components/dashboard/parameter-card.tsx
// Server Component — no 'use client'. Renders ScoreBar (a Client Component)
// by passing serializable props across the SC→CC boundary.
import { ScoreBar } from './score-bar'

interface ParameterCardProps {
  name: string
  total: number
  levelName: string
  /** score_levels.color_class, e.g. 'text-accent-teal'. Applied to both the
   *  level badge text and the ScoreBar fill color. */
  levelColorClass: string
}

export function ParameterCard({ name, total, levelName, levelColorClass }: ParameterCardProps) {
  return (
    <div className="clay-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-foreground text-sm leading-tight">{name}</h3>
        <span className={`text-xs font-semibold shrink-0 ${levelColorClass}`}>{levelName}</span>
      </div>
      <ScoreBar total={total} levelColorClass={levelColorClass} />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

---

### Task 2: Student dashboard page

**Files:**
- Rewrite: `src/app/(platform)/dashboard/page.tsx`

**Interfaces:**
- Consumes:
  - `scoreLevelFor(displayScore: number, levels: ScoreLevel[]): ScoreLevel | null` — from `@/lib/scoring`
  - `internalToDisplay(internal: number): number` — from `@/lib/scoring`
  - `ScoreLevel` type — from `@/lib/scoring/types`
  - `student_parameter_scores` columns: `parameter_id`, `baseline_score`, `accrued_score` (fully typed in `database.ts`)
  - `get_my_children` RPC: returns `{ student_id: string; full_name: string | null; email: string; relationship: string }[]`
  - `ParameterCard` from Task 1
- Produces: student view (overall stat + top-3 grid) or parent view (children list)

- [ ] **Step 1: Rewrite the file**

```tsx
// src/app/(platform)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { ParameterCard } from '@/components/dashboard/parameter-card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  // ── Student view ─────────────────────────────────────────────────────
  if (profile.role === 'student') {
    // Students who haven't completed onboarding must finish it first.
    if (!profile.onboarding_completed) redirect('/onboarding')

    // Fetch scores, parameter metadata, and levels in parallel.
    const [{ data: rawScores }, { data: rawParameters }, { data: rawLevels }] =
      await Promise.all([
        supabase
          .from('student_parameter_scores')
          .select('parameter_id, baseline_score, accrued_score')
          .eq('student_id', user.id),
        supabase
          .from('growth_parameters')
          .select('id, name, display_order')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('score_levels')
          .select('id, name, min_score, max_score, color_class, display_order')
          .order('display_order'),
      ])

    const levels = (rawLevels ?? []) as ScoreLevel[]

    // Join parameters with scores, compute display values.
    const parameterScores = (rawParameters ?? []).map((gp) => {
      const row = (rawScores ?? []).find((s) => s.parameter_id === gp.id)
      const total = (row?.baseline_score ?? 0) + (row?.accrued_score ?? 0)
      const displayPct = internalToDisplay(total)
      const level = scoreLevelFor(displayPct, levels)
      return {
        parameterId: gp.id,
        name: gp.name,
        displayOrder: gp.display_order,
        total,
        levelName: level?.name ?? 'Seed',
        levelColorClass: level?.color_class ?? 'text-accent-yellow',
      }
    })

    // Overall = average total across all parameters.
    const avgTotal =
      parameterScores.length > 0
        ? Math.round(parameterScores.reduce((s, p) => s + p.total, 0) / parameterScores.length)
        : 0
    const avgDisplay = internalToDisplay(avgTotal)
    const avgLevel = scoreLevelFor(avgDisplay, levels)

    // Top 3 by total score descending for the "Strengths" section.
    const top3 = [...parameterScores].sort((a, b) => b.total - a.total).slice(0, 3)

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Welcome back, {firstName}!
          </h1>
          <p className="text-muted mt-1 text-sm">Here&apos;s how your growth is looking.</p>
        </div>

        {/* Overall stat card */}
        <div className="clay-card p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">{avgDisplay}%</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted uppercase tracking-wide font-medium mb-0.5">
              Overall Growth
            </p>
            <p
              className={`font-display text-xl font-bold ${avgLevel?.color_class ?? 'text-primary'}`}
            >
              {avgLevel?.name ?? 'Seed'}
            </p>
            <p className="text-xs text-muted">
              avg {avgTotal} pts &middot; {parameterScores.length} parameters
            </p>
          </div>
        </div>

        {/* Top 3 strengths */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Your Strengths</h2>
            <Link href="/profile" className="text-sm text-primary hover:underline font-medium">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {top3.map((p) => (
              <ParameterCard
                key={p.parameterId}
                name={p.name}
                total={p.total}
                levelName={p.levelName}
                levelColorClass={p.levelColorClass}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Parent view ──────────────────────────────────────────────────────
  if (profile.role === 'parent') {
    const { data: children } = await supabase.rpc('get_my_children')
    const kids = children ?? []

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Welcome, {firstName}!
          </h1>
          <p className="text-muted mt-1 text-sm">
            Track and support your children&apos;s growth.
          </p>
        </div>

        {kids.length === 0 ? (
          <div className="clay-card p-8 text-center space-y-3">
            <p className="font-medium text-foreground">No children linked yet.</p>
            <p className="text-muted text-sm">
              Link your child&apos;s SkillFleet account to start tracking their growth.
            </p>
            <Link
              href="/children"
              className="inline-block mt-2 clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
            >
              Link a Child →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Your Children</h2>
            {kids.map((child) => (
              <div key={child.student_id} className="clay-card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {child.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{child.full_name}</p>
                  <p className="text-xs text-muted truncate">{child.email}</p>
                </div>
                <Link
                  href="/children"
                  className="text-sm text-primary font-medium hover:underline shrink-0"
                >
                  Manage →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Admins are redirected by the platform layout before reaching here.
  redirect('/login')
}
```

- [ ] **Step 2: Type-check and build**

```powershell
npx tsc --noEmit
npm run build
```
Expected: TypeScript clean. Build succeeds. `/dashboard` appears as `ƒ` (dynamic Server Component).

- [ ] **Step 3: Test student view (browser)**

```powershell
npm run dev
```
1. Log in as a student who completed onboarding (e.g. Maya from testing)
2. `/dashboard` should show: "Welcome back, Maya!" heading, overall stat card (level name in level color), top-3 parameter cards with animated bars, "See all →" link
3. Verify the overall stat reflects real data: with Maya's scores (Financial ~143, Social ~142, IQ ~126, rest lower), average should be around 60 pts → ~6% → "Seed" level

- [ ] **Step 4: Test onboarding gate**

1. Sign up a new student but stop before completing onboarding (close the browser after signup confirmation)
2. Navigate directly to `/dashboard`
3. Expected: redirect to `/onboarding` (not the placeholder, not an error)

- [ ] **Step 5: Test parent view**

1. Log in as a parent who has linked children
2. `/dashboard` should show children list with avatar initials and email
3. Log in as a parent with no linked children
4. Expected: "No children linked yet." card with "Link a Child →" CTA

---

### Task 3: Growth profile page

**Files:**
- Create: `src/app/(platform)/profile/page.tsx`

**Interfaces:**
- Consumes: same scoring utilities as Task 2; `ParameterCard` from Task 1
- Produces: full 10-parameter grid, students only

- [ ] **Step 1: Create the file**

```tsx
// src/app/(platform)/profile/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { ParameterCard } from '@/components/dashboard/parameter-card'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  // Profile is student-only; parents and admins have their own views.
  if (profile.role !== 'student') redirect('/dashboard')
  if (!profile.onboarding_completed) redirect('/onboarding')

  const [{ data: rawScores }, { data: rawParameters }, { data: rawLevels }] =
    await Promise.all([
      supabase
        .from('student_parameter_scores')
        .select('parameter_id, baseline_score, accrued_score')
        .eq('student_id', user.id),
      supabase
        .from('growth_parameters')
        .select('id, name, display_order')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('score_levels')
        .select('id, name, min_score, max_score, color_class, display_order')
        .order('display_order'),
    ])

  const levels = (rawLevels ?? []) as ScoreLevel[]

  const parameterScores = (rawParameters ?? []).map((gp) => {
    const row = (rawScores ?? []).find((s) => s.parameter_id === gp.id)
    const total = (row?.baseline_score ?? 0) + (row?.accrued_score ?? 0)
    const displayPct = internalToDisplay(total)
    const level = scoreLevelFor(displayPct, levels)
    return {
      parameterId: gp.id,
      name: gp.name,
      total,
      levelName: level?.name ?? 'Seed',
      levelColorClass: level?.color_class ?? 'text-accent-yellow',
    }
  })

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {firstName}&apos;s Growth Profile
        </h1>
        <p className="text-muted mt-1 text-sm">
          Your scores across all {parameterScores.length} growth parameters. Points grow as you
          complete activities on SkillFleet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parameterScores.map((p) => (
          <ParameterCard
            key={p.parameterId}
            name={p.name}
            total={p.total}
            levelName={p.levelName}
            levelColorClass={p.levelColorClass}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check and build**

```powershell
npx tsc --noEmit
npm run build
```
Expected: TypeScript clean. `/profile` appears as `ƒ` in build output.

- [ ] **Step 3: Test in browser**

1. `npm run dev` (or still running from Task 2)
2. Log in as Maya, click "Growth Profile" in the sidebar nav (or navigate to `/profile`)
3. All 10 parameter cards render in 2-column grid (desktop), 1-column (mobile)
4. Bars animate from 0 to their score width on first render
5. Each card: parameter name top-left, level badge in level color top-right, pts + % in bar labels
6. Maya's top parameters (Financial ~143, Social ~142) show the highest bars; parameters with 0 pts (Fitness, Leadership, Mindfulness, EQ) show empty bars with "Seed" badge

- [ ] **Step 4: Test access controls**

1. Log in as a parent, navigate to `/profile` → should redirect to `/dashboard`
2. Log in as a student with `onboarding_completed = false`, navigate to `/profile` → should redirect to `/onboarding`

- [ ] **Step 5: Run tests to confirm no regressions**

```powershell
npm test
```
Expected: **86 tests pass** (no new tests — all scoring utilities were tested in Plan B).
