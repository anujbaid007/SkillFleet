# Plan B — Business Logic: Scoring Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all SkillFleet growth-scoring calculations as pure TypeScript functions with Vitest tests — no database calls, no Next.js imports, fully deterministic.

**Architecture:** All functions live in `src/lib/scoring/`. They accept plain data objects (numbers, dates, config rows from the DB) and return plain values. The DB fetching happens in Server Actions (later plans) — these functions only compute. This makes every rule testable in isolation, reusable across onboarding, dashboards, and admin tools, and _explainable_ (each input → output chain traces back to a source record).

**Tech Stack:** Vitest 2, vite-tsconfig-paths, TypeScript

## Global Constraints

- **Pure functions only** — NO Supabase imports, NO `next/*` imports, NO side effects, NO `console.log`
- **Internal scale 0–1000**, **display scale 0–100** — every function signature must make clear which it uses; never mix them
- **Growth parameters are NEVER hardcoded** — all functions accept parameter data as arguments; no `if (parameterName === 'Fitness')` anywhere
- **All arithmetic:** `Math.round()` for rounding; `Math.max(0, Math.min(MAX, v))` for clamping
- **Deterministic tests** — time-dependent functions accept an optional `asOf?: Date` parameter so tests never depend on the actual current date
- **Weights from DB:** baseline formula uses `testWeight=0.45`, `certWeight=0.30`, `questionnaireWeight=0.25` (from `baseline_config` table — but these are always passed in as arguments, never imported)
- **No commits to main** — all work on branch `feature/growth-platform-phase1`; commit only after reviewing passing tests

---

## File Structure

### New files
```
vitest.config.ts                          # Vitest + @/ path alias config

src/lib/scoring/
  types.ts                                # All shared interfaces for scoring functions
  conversions.ts                          # internalToDisplay, displayToInternal
  age-band.ts                             # ageBandFor(dob, bands, asOf?)
  score-level.ts                          # scoreLevelFor(displayScore, levels)
  baseline.ts                             # calcBaselineForParameter(input, config)
  progress.ts                             # parameterStatus, pointsToTarget
  offering.ts                             # applyOfferingPoints, totalDisplayScore
  index.ts                                # barrel re-export of everything
  __tests__/
    conversions.test.ts
    age-band.test.ts
    score-level.test.ts
    baseline.test.ts
    progress.test.ts
    offering.test.ts
```

### Modified files
```
package.json                              # add "test" and "test:watch" scripts
```

---

## Task 0: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts only)

**Interfaces:**
- Produces: `npm test` command that runs all `*.test.ts` files under `src/`

- [ ] **Step 1: Install Vitest and path-alias plugin**

```bash
npm install --save-dev vitest vite-tsconfig-paths
```

Expected: vitest and vite-tsconfig-paths appear in `package.json` devDependencies.

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add test scripts to `package.json`**

Add to the `"scripts"` block (keep existing scripts, add these two):
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test to verify the setup**

Create `src/lib/scoring/__tests__/setup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs and path aliases resolve', async () => {
    // @/ imports are tested in Task 1 once types.ts exists.
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run the smoke test**

```bash
npx vitest run src/lib/scoring/__tests__/setup.test.ts --reporter=verbose
```

Expected output:
```
✓ src/lib/scoring/__tests__/setup.test.ts (1)
  ✓ vitest setup > runs and path aliases resolve

Test Files  1 passed (1)
Tests       1 passed (1)
```

- [ ] **Step 6: Delete the smoke test** — it has served its purpose.

```bash
del src\lib\scoring\__tests__\setup.test.ts
```

---

## Task 1: Types + Score Conversions

**Files:**
- Create: `src/lib/scoring/types.ts`
- Create: `src/lib/scoring/conversions.ts`
- Test: `src/lib/scoring/__tests__/conversions.test.ts`

**Interfaces:**
- Produces:
  - `AgeBand`, `ScoreLevel`, `ParameterTarget`, `BaselineInput`, `BaselineConfig`, `ProgressStatus` types
  - `internalToDisplay(internal: number): number` — converts 0–1000 → 0–100 (clamped, rounded)
  - `displayToInternal(display: number): number` — converts 0–100 → 0–1000 (clamped, rounded)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scoring/__tests__/conversions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { internalToDisplay, displayToInternal } from '@/lib/scoring/conversions'

describe('internalToDisplay', () => {
  it('converts 0 → 0', () => expect(internalToDisplay(0)).toBe(0))
  it('converts 500 → 50', () => expect(internalToDisplay(500)).toBe(50))
  it('converts 1000 → 100', () => expect(internalToDisplay(1000)).toBe(100))
  it('rounds 994 → 99', () => expect(internalToDisplay(994)).toBe(99))
  it('rounds 995 → 100', () => expect(internalToDisplay(995)).toBe(100))
  it('clamps values above 1000 to 100', () => expect(internalToDisplay(1200)).toBe(100))
  it('clamps negative values to 0', () => expect(internalToDisplay(-50)).toBe(0))
})

describe('displayToInternal', () => {
  it('converts 0 → 0', () => expect(displayToInternal(0)).toBe(0))
  it('converts 50 → 500', () => expect(displayToInternal(50)).toBe(500))
  it('converts 100 → 1000', () => expect(displayToInternal(100)).toBe(1000))
  it('clamps values above 100 to 1000', () => expect(displayToInternal(150)).toBe(1000))
  it('clamps negative values to 0', () => expect(displayToInternal(-10)).toBe(0))
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npx vitest run src/lib/scoring/__tests__/conversions.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module '@/lib/scoring/conversions'`

- [ ] **Step 3: Create `src/lib/scoring/types.ts`**

```typescript
// All shared types for the scoring engine.
// Internal scale = 0–1000 (stored in DB).
// Display scale = 0–100 (shown in UI, used in score_levels and parameter_targets).

export interface AgeBand {
  id: string
  label: string       // 'Junior' | 'Explorer' | 'Builder' | 'Achiever'
  min_age: number     // inclusive
  max_age: number     // inclusive
  display_order: number
}

export interface ScoreLevel {
  id: string
  name: string        // 'Seed' | 'Sprout' | 'Growing' | 'Thriving' | 'Flourishing'
  min_score: number   // display scale 0–100, inclusive
  max_score: number   // display scale 0–100, inclusive
  color_class: string // Tailwind class, e.g. 'text-accent-teal'
  display_order: number
}

export interface ParameterTarget {
  parameter_id: string
  age_band_id: string
  target_min: number  // display scale 0–100, inclusive
  target_max: number  // display scale 0–100, inclusive
}

export interface BaselineInput {
  /** Raw sum of assessment option scores for this parameter. Internal scale 0–1000. */
  testPoints: number
  /** Sum of cert points currently active (points_provisional for pending certs +
   *  points_approved for approved certs). Internal scale 0–1000.
   *  The 50% provisional fraction is pre-computed by the DB trigger — not applied here. */
  certPoints: number
  /** Sum of questionnaire option scores for this parameter. Internal scale 0–1000. */
  questionnairePoints: number
}

export interface BaselineConfig {
  testWeight: number           // 0.45 from baseline_config.test_weight
  certWeight: number           // 0.30 from baseline_config.cert_weight
  questionnaireWeight: number  // 0.25 from baseline_config.questionnaire_weight
}

export type ProgressStatus = 'below_target' | 'on_target' | 'above_target'
```

- [ ] **Step 4: Create `src/lib/scoring/conversions.ts`**

```typescript
// Score scale conversions.
// Internal scale: 0–1000 (stored in student_parameter_scores, score_contributions, etc.)
// Display scale:  0–100  (shown in UI, used in score_levels and parameter_targets)

/** Converts an internal score (0–1000) to display scale (0–100). Clamps then rounds. */
export function internalToDisplay(internal: number): number {
  return Math.round(Math.max(0, Math.min(1000, internal)) / 10)
}

/** Converts a display score (0–100) to internal scale (0–1000). Clamps then rounds. */
export function displayToInternal(display: number): number {
  return Math.round(Math.max(0, Math.min(100, display)) * 10)
}
```

- [ ] **Step 5: Run tests to confirm PASS**

```bash
npx vitest run src/lib/scoring/__tests__/conversions.test.ts --reporter=verbose
```

Expected:
```
✓ src/lib/scoring/__tests__/conversions.test.ts (12)
  ✓ internalToDisplay > converts 0 → 0
  ✓ internalToDisplay > converts 500 → 50
  ... (all 12 pass)

Test Files  1 passed (1)
Tests       12 passed (12)
```

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (no errors).

---

## Task 2: Age Band Lookup

**Files:**
- Create: `src/lib/scoring/age-band.ts`
- Test: `src/lib/scoring/__tests__/age-band.test.ts`

**Interfaces:**
- Consumes: `AgeBand` from `@/lib/scoring/types`
- Produces: `ageBandFor(dateOfBirth: Date | string, bands: AgeBand[], asOf?: Date): AgeBand | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scoring/__tests__/age-band.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ageBandFor } from '@/lib/scoring/age-band'
import type { AgeBand } from '@/lib/scoring/types'

// Mirrors the seed data from supabase/migrations/0002_seed_data.sql
const BANDS: AgeBand[] = [
  { id: 'b1', label: 'Junior',   min_age: 6,  max_age: 9,  display_order: 1 },
  { id: 'b2', label: 'Explorer', min_age: 10, max_age: 12, display_order: 2 },
  { id: 'b3', label: 'Builder',  min_age: 13, max_age: 15, display_order: 3 },
  { id: 'b4', label: 'Achiever', min_age: 16, max_age: 18, display_order: 4 },
]

// Fixed reference date so tests are never time-dependent
const AS_OF = new Date('2024-06-01')

describe('ageBandFor', () => {
  it('returns Junior for age 6 (min boundary)', () => {
    // DOB 2018-01-01 → age 6 on 2024-06-01
    expect(ageBandFor('2018-01-01', BANDS, AS_OF)?.label).toBe('Junior')
  })

  it('returns Junior for age 9 (max boundary)', () => {
    // DOB 2015-01-01 → age 9 on 2024-06-01
    expect(ageBandFor('2015-01-01', BANDS, AS_OF)?.label).toBe('Junior')
  })

  it('returns Explorer for age 10', () => {
    expect(ageBandFor('2014-01-01', BANDS, AS_OF)?.label).toBe('Explorer')
  })

  it('returns Builder for age 14', () => {
    expect(ageBandFor('2010-01-01', BANDS, AS_OF)?.label).toBe('Builder')
  })

  it('returns Achiever for age 17', () => {
    expect(ageBandFor('2007-01-01', BANDS, AS_OF)?.label).toBe('Achiever')
  })

  it('returns null when age is below all bands (age 4)', () => {
    expect(ageBandFor('2020-01-01', BANDS, AS_OF)).toBeNull()
  })

  it('returns null when age is above all bands (age 20)', () => {
    expect(ageBandFor('2004-01-01', BANDS, AS_OF)).toBeNull()
  })

  it('treats birthday on asOf date as already turned (inclusive)', () => {
    // DOB 2014-06-01, asOf 2024-06-01 → birthday is today → age 10 → Explorer
    expect(ageBandFor('2014-06-01', BANDS, AS_OF)?.label).toBe('Explorer')
  })

  it('does not increment age when birthday is tomorrow', () => {
    // DOB 2014-06-02, asOf 2024-06-01 → birthday not yet → age 9 → Junior
    expect(ageBandFor('2014-06-02', BANDS, AS_OF)?.label).toBe('Junior')
  })

  it('accepts a Date object as well as a string', () => {
    expect(ageBandFor(new Date('2018-01-01'), BANDS, AS_OF)?.label).toBe('Junior')
  })

  it('uses real current date when asOf is omitted (smoke test — just checks no throw)', () => {
    expect(() => ageBandFor('2010-01-01', BANDS)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npx vitest run src/lib/scoring/__tests__/age-band.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module '@/lib/scoring/age-band'`

- [ ] **Step 3: Create `src/lib/scoring/age-band.ts`**

```typescript
import type { AgeBand } from '@/lib/scoring/types'

/**
 * Returns the age band that matches the student's age as of `asOf` (defaults to today).
 * Returns null if the student's age falls outside all bands.
 */
export function ageBandFor(
  dateOfBirth: Date | string,
  bands: AgeBand[],
  asOf: Date = new Date()
): AgeBand | null {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth

  let age = asOf.getFullYear() - dob.getFullYear()
  const monthDiff = asOf.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age--
  }

  return bands.find((b) => age >= b.min_age && age <= b.max_age) ?? null
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
npx vitest run src/lib/scoring/__tests__/age-band.test.ts --reporter=verbose
```

Expected: `Tests  11 passed (11)`

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output.

---

## Task 3: Score Level Lookup

**Files:**
- Create: `src/lib/scoring/score-level.ts`
- Test: `src/lib/scoring/__tests__/score-level.test.ts`

**Interfaces:**
- Consumes: `ScoreLevel` from `@/lib/scoring/types`
- Produces: `scoreLevelFor(displayScore: number, levels: ScoreLevel[]): ScoreLevel | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scoring/__tests__/score-level.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { scoreLevelFor } from '@/lib/scoring/score-level'
import type { ScoreLevel } from '@/lib/scoring/types'

// Mirrors supabase/migrations/0002_seed_data.sql score_levels
const LEVELS: ScoreLevel[] = [
  { id: 'l1', name: 'Seed',        min_score: 0,  max_score: 20,  color_class: 'text-accent-yellow', display_order: 1 },
  { id: 'l2', name: 'Sprout',      min_score: 21, max_score: 40,  color_class: 'text-accent-teal',   display_order: 2 },
  { id: 'l3', name: 'Growing',     min_score: 41, max_score: 60,  color_class: 'text-primary',        display_order: 3 },
  { id: 'l4', name: 'Thriving',    min_score: 61, max_score: 80,  color_class: 'text-accent-purple',  display_order: 4 },
  { id: 'l5', name: 'Flourishing', min_score: 81, max_score: 100, color_class: 'text-accent-pink',    display_order: 5 },
]

describe('scoreLevelFor', () => {
  it('returns Seed for score 0 (min boundary)', () =>
    expect(scoreLevelFor(0, LEVELS)?.name).toBe('Seed'))

  it('returns Seed for score 20 (max boundary of Seed)', () =>
    expect(scoreLevelFor(20, LEVELS)?.name).toBe('Seed'))

  it('returns Sprout for score 21 (min boundary of Sprout)', () =>
    expect(scoreLevelFor(21, LEVELS)?.name).toBe('Sprout'))

  it('returns Sprout for score 40', () =>
    expect(scoreLevelFor(40, LEVELS)?.name).toBe('Sprout'))

  it('returns Growing for score 50', () =>
    expect(scoreLevelFor(50, LEVELS)?.name).toBe('Growing'))

  it('returns Thriving for score 61', () =>
    expect(scoreLevelFor(61, LEVELS)?.name).toBe('Thriving'))

  it('returns Thriving for score 80', () =>
    expect(scoreLevelFor(80, LEVELS)?.name).toBe('Thriving'))

  it('returns Flourishing for score 81', () =>
    expect(scoreLevelFor(81, LEVELS)?.name).toBe('Flourishing'))

  it('returns Flourishing for score 100 (max boundary)', () =>
    expect(scoreLevelFor(100, LEVELS)?.name).toBe('Flourishing'))

  it('returns the color_class along with the level', () =>
    expect(scoreLevelFor(50, LEVELS)?.color_class).toBe('text-primary'))

  it('returns null when score is below all levels', () =>
    expect(scoreLevelFor(-1, LEVELS)).toBeNull())

  it('returns null when score is above all levels', () =>
    expect(scoreLevelFor(101, LEVELS)).toBeNull())

  it('returns null for an empty levels array', () =>
    expect(scoreLevelFor(50, [])).toBeNull())
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npx vitest run src/lib/scoring/__tests__/score-level.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module '@/lib/scoring/score-level'`

- [ ] **Step 3: Create `src/lib/scoring/score-level.ts`**

```typescript
import type { ScoreLevel } from '@/lib/scoring/types'

/**
 * Returns the score level that contains `displayScore` (0–100 scale).
 * Returns null if the score falls outside all defined levels.
 */
export function scoreLevelFor(displayScore: number, levels: ScoreLevel[]): ScoreLevel | null {
  return levels.find((l) => displayScore >= l.min_score && displayScore <= l.max_score) ?? null
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
npx vitest run src/lib/scoring/__tests__/score-level.test.ts --reporter=verbose
```

Expected: `Tests  13 passed (13)`

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output.

---

## Task 4: Baseline Calculator

**Files:**
- Create: `src/lib/scoring/baseline.ts`
- Test: `src/lib/scoring/__tests__/baseline.test.ts`

**Interfaces:**
- Consumes: `BaselineInput`, `BaselineConfig` from `@/lib/scoring/types`
- Produces: `calcBaselineForParameter(input: BaselineInput, config: BaselineConfig): number`
  — returns internal score 0–1000

The formula is: `clamp(round(testPoints × testWeight + certPoints × certWeight + questionnairePoints × questionnaireWeight), 0, 1000)`

The caller is responsible for computing `certPoints` correctly before calling this function:
- For a **pending** certificate: use `certificate_uploads.points_provisional` (already 50% of full)
- For an **approved** certificate: use `certificate_uploads.points_approved` (full value)
- Sum across all certs for the given parameter

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scoring/__tests__/baseline.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcBaselineForParameter } from '@/lib/scoring/baseline'
import type { BaselineConfig } from '@/lib/scoring/types'

// Mirrors supabase/migrations/0002_seed_data.sql baseline_config
const CFG: BaselineConfig = {
  testWeight: 0.45,
  certWeight: 0.30,
  questionnaireWeight: 0.25,
}

describe('calcBaselineForParameter', () => {
  it('returns 0 when all inputs are 0', () =>
    expect(calcBaselineForParameter({ testPoints: 0, certPoints: 0, questionnairePoints: 0 }, CFG)).toBe(0))

  it('applies testWeight only: test=1000 → 450', () =>
    expect(calcBaselineForParameter({ testPoints: 1000, certPoints: 0, questionnairePoints: 0 }, CFG)).toBe(450))

  it('applies certWeight only: cert=1000 → 300', () =>
    expect(calcBaselineForParameter({ testPoints: 0, certPoints: 1000, questionnairePoints: 0 }, CFG)).toBe(300))

  it('applies questionnaireWeight only: quest=1000 → 250', () =>
    expect(calcBaselineForParameter({ testPoints: 0, certPoints: 0, questionnairePoints: 1000 }, CFG)).toBe(250))

  it('sums all three: test=500 cert=400 quest=300 → 420', () => {
    // 500×0.45 + 400×0.30 + 300×0.25 = 225 + 120 + 75 = 420
    expect(calcBaselineForParameter({ testPoints: 500, certPoints: 400, questionnairePoints: 300 }, CFG)).toBe(420)
  })

  it('sums all three: test=800 cert=600 quest=400 → 640', () => {
    // 800×0.45 + 600×0.30 + 400×0.25 = 360 + 180 + 100 = 640
    expect(calcBaselineForParameter({ testPoints: 800, certPoints: 600, questionnairePoints: 400 }, CFG)).toBe(640)
  })

  it('clamps to 1000 when sum would exceed it', () => {
    // 1000×0.45 + 1000×0.30 + 1000×0.25 = 450+300+250 = 1000 → exactly at cap
    expect(calcBaselineForParameter({ testPoints: 1000, certPoints: 1000, questionnairePoints: 1000 }, CFG)).toBe(1000)
  })

  it('clamps output to 0 when all inputs are negative', () => {
    // Should not happen in practice, but the function must not return negative
    expect(calcBaselineForParameter({ testPoints: -500, certPoints: -500, questionnairePoints: -500 }, CFG)).toBe(0)
  })

  it('rounds fractional results: test=100 cert=100 quest=100 → 100', () => {
    // 100×0.45 + 100×0.30 + 100×0.25 = 45+30+25 = 100 (no rounding needed)
    expect(calcBaselineForParameter({ testPoints: 100, certPoints: 100, questionnairePoints: 100 }, CFG)).toBe(100)
  })

  it('rounds correctly when result has a fraction: test=333 cert=0 quest=0 → 150', () => {
    // 333×0.45 = 149.85 → rounds to 150
    expect(calcBaselineForParameter({ testPoints: 333, certPoints: 0, questionnairePoints: 0 }, CFG)).toBe(150)
  })

  it('works with weights that do not sum to 1 (custom config)', () => {
    const custom: BaselineConfig = { testWeight: 1.0, certWeight: 0, questionnaireWeight: 0 }
    expect(calcBaselineForParameter({ testPoints: 700, certPoints: 500, questionnairePoints: 300 }, custom)).toBe(700)
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npx vitest run src/lib/scoring/__tests__/baseline.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module '@/lib/scoring/baseline'`

- [ ] **Step 3: Create `src/lib/scoring/baseline.ts`**

```typescript
import type { BaselineInput, BaselineConfig } from '@/lib/scoring/types'

/**
 * Calculates the baseline score for a single growth parameter.
 *
 * Takes raw input point sums (already aggregated from questionnaire responses,
 * active certificate points, and assessment results) and returns an internal
 * score in the range 0–1000.
 *
 * Call this once per parameter per student after onboarding completes.
 * The cert_provisional_fraction is pre-applied by the DB when it stores
 * points_provisional — do not apply it again here.
 */
export function calcBaselineForParameter(input: BaselineInput, config: BaselineConfig): number {
  const raw =
    input.testPoints * config.testWeight +
    input.certPoints * config.certWeight +
    input.questionnairePoints * config.questionnaireWeight

  return Math.max(0, Math.min(1000, Math.round(raw)))
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
npx vitest run src/lib/scoring/__tests__/baseline.test.ts --reporter=verbose
```

Expected: `Tests  11 passed (11)`

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output.

---

## Task 5: Progress Status

**Files:**
- Create: `src/lib/scoring/progress.ts`
- Test: `src/lib/scoring/__tests__/progress.test.ts`

**Interfaces:**
- Consumes: `ParameterTarget`, `ProgressStatus` from `@/lib/scoring/types`
- Produces:
  - `parameterStatus(displayScore: number, target: ParameterTarget): ProgressStatus`
  - `pointsToTarget(displayScore: number, target: ParameterTarget): number` — how many display points needed to reach `target_min`; returns 0 when at or above target

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scoring/__tests__/progress.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parameterStatus, pointsToTarget } from '@/lib/scoring/progress'
import type { ParameterTarget } from '@/lib/scoring/types'

// Explorer band default target from seed data (target_min=25, target_max=50)
const EXPLORER_TARGET: ParameterTarget = {
  parameter_id: 'p1',
  age_band_id:  'b2',
  target_min: 25,
  target_max: 50,
}

describe('parameterStatus', () => {
  it('below_target when score < target_min', () =>
    expect(parameterStatus(20, EXPLORER_TARGET)).toBe('below_target'))

  it('below_target at target_min - 1', () =>
    expect(parameterStatus(24, EXPLORER_TARGET)).toBe('below_target'))

  it('on_target at exactly target_min', () =>
    expect(parameterStatus(25, EXPLORER_TARGET)).toBe('on_target'))

  it('on_target in the middle', () =>
    expect(parameterStatus(37, EXPLORER_TARGET)).toBe('on_target'))

  it('on_target at exactly target_max', () =>
    expect(parameterStatus(50, EXPLORER_TARGET)).toBe('on_target'))

  it('above_target at target_max + 1', () =>
    expect(parameterStatus(51, EXPLORER_TARGET)).toBe('above_target'))

  it('above_target well above range', () =>
    expect(parameterStatus(100, EXPLORER_TARGET)).toBe('above_target'))

  // Verify with Achiever band (target_min=55, target_max=80 from seed data)
  const ACHIEVER_TARGET: ParameterTarget = { parameter_id: 'p1', age_band_id: 'b4', target_min: 55, target_max: 80 }

  it('below_target for Achiever with score 54', () =>
    expect(parameterStatus(54, ACHIEVER_TARGET)).toBe('below_target'))

  it('on_target for Achiever with score 55', () =>
    expect(parameterStatus(55, ACHIEVER_TARGET)).toBe('on_target'))

  it('on_target for Achiever with score 80', () =>
    expect(parameterStatus(80, ACHIEVER_TARGET)).toBe('on_target'))

  it('above_target for Achiever with score 81', () =>
    expect(parameterStatus(81, ACHIEVER_TARGET)).toBe('above_target'))
})

describe('pointsToTarget', () => {
  it('returns gap when below target_min', () =>
    // Score 20, target_min 25 → needs 5 more display points
    expect(pointsToTarget(20, EXPLORER_TARGET)).toBe(5))

  it('returns 0 when at target_min', () =>
    expect(pointsToTarget(25, EXPLORER_TARGET)).toBe(0))

  it('returns 0 when on target', () =>
    expect(pointsToTarget(40, EXPLORER_TARGET)).toBe(0))

  it('returns 0 when above target_max', () =>
    expect(pointsToTarget(55, EXPLORER_TARGET)).toBe(0))

  it('returns 0 when score is exactly target_max', () =>
    expect(pointsToTarget(50, EXPLORER_TARGET)).toBe(0))

  it('returns correct gap near zero', () => {
    const low: ParameterTarget = { parameter_id: 'p1', age_band_id: 'b1', target_min: 10, target_max: 35 }
    expect(pointsToTarget(3, low)).toBe(7)
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npx vitest run src/lib/scoring/__tests__/progress.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module '@/lib/scoring/progress'`

- [ ] **Step 3: Create `src/lib/scoring/progress.ts`**

```typescript
import type { ParameterTarget, ProgressStatus } from '@/lib/scoring/types'

/**
 * Returns whether a student's display score is below, within, or above
 * the target range for their age band and this parameter.
 *
 * Both boundaries are inclusive: a score exactly at target_min or target_max
 * is 'on_target'.
 */
export function parameterStatus(
  displayScore: number,
  target: ParameterTarget
): ProgressStatus {
  if (displayScore < target.target_min) return 'below_target'
  if (displayScore > target.target_max) return 'above_target'
  return 'on_target'
}

/**
 * Returns how many display-scale points the student needs to reach target_min.
 * Returns 0 when already at or above target_min.
 * Used to show "X more points to reach target" in the dashboard.
 */
export function pointsToTarget(displayScore: number, target: ParameterTarget): number {
  return Math.max(0, target.target_min - displayScore)
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
npx vitest run src/lib/scoring/__tests__/progress.test.ts --reporter=verbose
```

Expected: `Tests  18 passed (18)`

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output.

---

## Task 6: Offering Points + Total Score + Barrel Export

**Files:**
- Create: `src/lib/scoring/offering.ts`
- Create: `src/lib/scoring/index.ts`
- Test: `src/lib/scoring/__tests__/offering.test.ts`

**Interfaces:**
- Consumes: `internalToDisplay` from `@/lib/scoring/conversions`
- Produces:
  - `applyOfferingPoints(currentAccruedScore: number, contributionPoints: number): number` — returns new accrued score, clamped to 0–1000 (internal)
  - `totalDisplayScore(baselineInternal: number, accruedInternal: number): number` — returns display score 0–100
- `index.ts` re-exports everything so callers use `import { ... } from '@/lib/scoring'`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scoring/__tests__/offering.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyOfferingPoints, totalDisplayScore } from '@/lib/scoring/offering'

describe('applyOfferingPoints', () => {
  it('adds points normally', () =>
    expect(applyOfferingPoints(500, 100)).toBe(600))

  it('clamps to 1000 when sum exceeds internal max', () =>
    expect(applyOfferingPoints(950, 100)).toBe(1000))

  it('stays at 1000 when already at max', () =>
    expect(applyOfferingPoints(1000, 50)).toBe(1000))

  it('returns 0 when both are 0', () =>
    expect(applyOfferingPoints(0, 0)).toBe(0))

  it('supports negative points for reversals (e.g. cert rejection)', () =>
    expect(applyOfferingPoints(500, -100)).toBe(400))

  it('clamps to 0 on large negative reversal', () =>
    expect(applyOfferingPoints(50, -200)).toBe(0))

  it('exact max boundary: 999 + 1 = 1000', () =>
    expect(applyOfferingPoints(999, 1)).toBe(1000))

  it('exact min boundary: 1 - 1 = 0', () =>
    expect(applyOfferingPoints(1, -1)).toBe(0))
})

describe('totalDisplayScore', () => {
  it('converts baseline + accrued to display scale', () =>
    // 300 + 200 = 500 internal → 50 display
    expect(totalDisplayScore(300, 200)).toBe(50))

  it('returns 0 when both are 0', () =>
    expect(totalDisplayScore(0, 0)).toBe(0))

  it('returns 100 when baseline alone is at max', () =>
    expect(totalDisplayScore(1000, 0)).toBe(100))

  it('clamps combined score to 1000 before conversion', () =>
    // 600 + 500 = 1100 → clamped to 1000 → display 100
    expect(totalDisplayScore(600, 500)).toBe(100))

  it('returns correct mid-range value', () =>
    // 450 + 200 = 650 internal → 65 display
    expect(totalDisplayScore(450, 200)).toBe(65))

  it('rounds correctly: 645 internal → 65 display (round(64.5) = 65)', () =>
    // 400 + 245 = 645 → round(64.5) = 65
    expect(totalDisplayScore(400, 245)).toBe(65))
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npx vitest run src/lib/scoring/__tests__/offering.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module '@/lib/scoring/offering'`

- [ ] **Step 3: Create `src/lib/scoring/offering.ts`**

```typescript
import { internalToDisplay } from '@/lib/scoring/conversions'

/**
 * Applies one offering's contribution points to a student's accrued score
 * for a single parameter.
 *
 * `contributionPoints` comes from `offering_parameter_contributions.points`.
 * It may be negative for score reversals (e.g. a rejected certificate that
 * previously had provisional points applied).
 *
 * Returns the new accrued score, clamped to the internal range [0, 1000].
 */
export function applyOfferingPoints(
  currentAccruedScore: number,
  contributionPoints: number
): number {
  return Math.max(0, Math.min(1000, currentAccruedScore + contributionPoints))
}

/**
 * Returns the combined display score (0–100) for one parameter.
 *
 * `baselineInternal`  = student_parameter_scores.baseline_score
 * `accruedInternal`   = student_parameter_scores.accrued_score
 *
 * The sum is clamped to [0, 1000] before converting to display scale,
 * so the result is always in [0, 100].
 */
export function totalDisplayScore(
  baselineInternal: number,
  accruedInternal: number
): number {
  const total = Math.max(0, Math.min(1000, baselineInternal + accruedInternal))
  return internalToDisplay(total)
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
npx vitest run src/lib/scoring/__tests__/offering.test.ts --reporter=verbose
```

Expected: `Tests  14 passed (14)`

- [ ] **Step 5: Create `src/lib/scoring/index.ts`**

```typescript
// Barrel export — import from '@/lib/scoring' instead of individual files.
export * from '@/lib/scoring/types'
export * from '@/lib/scoring/conversions'
export * from '@/lib/scoring/age-band'
export * from '@/lib/scoring/score-level'
export * from '@/lib/scoring/baseline'
export * from '@/lib/scoring/progress'
export * from '@/lib/scoring/offering'
```

- [ ] **Step 6: Run the entire test suite**

```bash
npx vitest run --reporter=verbose
```

Expected output (all tests across all files):
```
✓ src/lib/scoring/__tests__/conversions.test.ts  (12 tests)
✓ src/lib/scoring/__tests__/age-band.test.ts     (11 tests)
✓ src/lib/scoring/__tests__/score-level.test.ts  (13 tests)
✓ src/lib/scoring/__tests__/baseline.test.ts     (11 tests)
✓ src/lib/scoring/__tests__/progress.test.ts     (18 tests)
✓ src/lib/scoring/__tests__/offering.test.ts     (14 tests)

Test Files   6 passed (6)
Tests        79 passed (79)
```

- [ ] **Step 7: Final TypeScript check across the whole project**

```bash
npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 8: Commit**

```bash
git add src/lib/scoring/ vitest.config.ts package.json package-lock.json
git commit -m "feat(scoring): add pure scoring engine functions with Vitest tests"
```

---

## Self-Review

### Spec Coverage

| Requirement (from requirements doc) | Covered by |
|---|---|
| Scoring engine — increments parameter scores on offering completion | `applyOfferingPoints` (Task 6) |
| Score updates idempotent — caller controls when to call | Pure function; caller in later plan uses `score_applied` DB flag |
| Score updates auditable — every change traces to source | Functions return values; caller logs to `score_contributions` (later plan) |
| Partial credit / weighted contributions (different points per parameter) | Each offering contribution is per-parameter; caller loops per parameter |
| Baseline vs accrued distinguishable | `baseline_score` / `accrued_score` are separate inputs to `totalDisplayScore` |
| Deterministic, explainable baseline | `calcBaselineForParameter` is pure: same inputs always produce same output |
| Parameters never hardcoded | All functions accept parameter data as arguments |
| Admin-configurable weights | `BaselineConfig` is always an argument, never imported as a constant |
| Score scale 0–100 with named levels | `scoreLevelFor` + `internalToDisplay` (Tasks 1, 3) |
| Age-based benchmarks / targets | `parameterStatus` + `pointsToTarget` (Task 5) |
| Progress gap usable by AI recommender | `pointsToTarget` returns gap; recommender (Phase 3) will call it |

### Placeholder Scan

No TBDs, no "add appropriate error handling", no "similar to Task N" patterns. All steps contain complete code.

### Type Consistency

- `AgeBand`, `ScoreLevel`, `ParameterTarget`, `BaselineInput`, `BaselineConfig`, `ProgressStatus` — defined once in `types.ts`, imported everywhere else
- `internalToDisplay` called in `offering.ts` (Task 6) — matches signature defined in `conversions.ts` (Task 1) ✓
- `ParameterTarget` used in `progress.ts` (Task 5) — matches definition in `types.ts` (Task 1) ✓
- Barrel `index.ts` re-exports `ProgressStatus` from `types.ts` — not duplicated ✓
