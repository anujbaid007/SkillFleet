# Plan C: Student Onboarding Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/onboarding` page with a real 3-step wizard (questionnaire → starter assessment → optional certificate upload) that computes each student's baseline growth scores and marks onboarding complete.

**Architecture:** The onboarding page (Server Component) fetches all questions and parameters from the DB and passes them as props to a Client Component wizard. The wizard collects answers across 3 steps, then calls a `complete_onboarding` SECURITY DEFINER RPC that atomically writes `questionnaire_responses`, `assessment_results`, `student_parameter_scores`, and `score_contributions` before setting `onboarding_completed = true`. Certificate uploads happen client-side via Supabase Storage; the metadata record is written by a separate Server Action.

**Tech Stack:** Next.js 16.2.6 App Router · React 19 `useTransition` · Supabase (postgres RPC + Storage) · `@supabase/ssr` · Tailwind CSS v4 Claymorphism · `motion/react` · Vitest 2

## Global Constraints

- **DO NOT** touch the `happyfleet` Supabase project — use `bbioktywqkfvpzmakdxt` only.
- **DO NOT** commit, push, or touch the `main` branch — user reviews on localhost first.
- Admin client (service role key) is **server-only** — NEVER import in client components.
- Parameters are **NEVER hardcoded** — always fetched from DB.
- Assessment correct answers are **NEVER sent to the client** — the select excludes `is_correct`.
- Internal score scale: **0–1000** (DB). Display scale: **0–100** (UI). Use `internalToDisplay` from `@/lib/scoring`.
- Baseline formula: `ROUND(testPoints × test_weight + certPoints × cert_weight + questionnairePoints × questionnaire_weight)` clamped `[0, 1000]`. Weights are read from `baseline_config` table at runtime.
- At onboarding, `certPoints = 0` — no cert has been admin-reviewed yet.
- Private storage bucket `certificates` — store the storage **path** (e.g. `{uuid}/1704067200.jpg`), not a URL.
- Claymorphism design: `.clay-card`, `.clay-button bg-cta text-white`.
- Animations: `motion/react` (NOT `framer-motion`).
- Tailwind CSS v4 — all colour tokens defined in `src/app/globals.css` `@theme inline` block. No `tailwind.config.ts`.
- Read `node_modules/next/dist/docs/01-app/02-guides/forms.md` for Next.js 16 Server Action patterns before writing form code.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/0007_onboarding_seed.sql` | Create | Seed questionnaire (5 Q) + assessment (8 Q) with option scores |
| `supabase/migrations/0008_complete_onboarding_rpc.sql` | Create | `complete_onboarding(…)` SECURITY DEFINER RPC |
| `src/lib/scoring/aggregation.ts` | Create | Pure `aggregateByParameter` helper |
| `src/lib/scoring/__tests__/aggregation.test.ts` | Create | 8 Vitest unit tests |
| `src/lib/scoring/index.ts` | Modify | Add `aggregation` to barrel exports |
| `src/lib/types/database.ts` | Modify | Add `complete_onboarding` Function type |
| `src/app/onboarding/actions.ts` | Create | `submitOnboardingAction`, `saveCertRecordAction` |
| `src/components/onboarding/questionnaire-step.tsx` | Create | Step 1 UI — radio questions |
| `src/components/onboarding/assessment-step.tsx` | Create | Step 2 UI — MCQ quiz |
| `src/components/onboarding/certificate-step.tsx` | Create | Step 3 UI — optional file upload |
| `src/components/onboarding/onboarding-wizard.tsx` | Create | Wizard orchestrating all 3 steps |
| `src/app/onboarding/page.tsx` | Rewrite | Server Component — fetch data, render wizard |

---

## Task 0: Seed Questionnaire + Assessment Data

**Files:**
- Create: `supabase/migrations/0007_onboarding_seed.sql`

**Interfaces:**
- Produces: 5 active `questionnaire_questions` rows, ~20 `questionnaire_options`, ~25 `questionnaire_option_scores`; 1 active `assessments` row, 8 `assessment_questions`, 32 `assessment_options`, ~12 `assessment_option_scores`
- All parameter IDs are looked up by `name` — no hardcoding

- [ ] **Step 1: Create the seed migration**

Create `supabase/migrations/0007_onboarding_seed.sql` with this exact content:

```sql
-- =============================================
-- QUESTIONNAIRE SEED (5 questions, ~25 option scores)
-- =============================================
DO $$
DECLARE
  q1 UUID := gen_random_uuid(); q2 UUID := gen_random_uuid();
  q3 UUID := gen_random_uuid(); q4 UUID := gen_random_uuid();
  q5 UUID := gen_random_uuid();

  -- Q1 options
  q1a UUID := gen_random_uuid(); q1b UUID := gen_random_uuid();
  q1c UUID := gen_random_uuid(); q1d UUID := gen_random_uuid();
  -- Q2 options
  q2a UUID := gen_random_uuid(); q2b UUID := gen_random_uuid();
  q2c UUID := gen_random_uuid(); q2d UUID := gen_random_uuid();
  -- Q3 options
  q3a UUID := gen_random_uuid(); q3b UUID := gen_random_uuid();
  q3c UUID := gen_random_uuid(); q3d UUID := gen_random_uuid();
  -- Q4 options
  q4a UUID := gen_random_uuid(); q4b UUID := gen_random_uuid();
  q4c UUID := gen_random_uuid(); q4d UUID := gen_random_uuid();
  -- Q5 options
  q5a UUID := gen_random_uuid(); q5b UUID := gen_random_uuid();
  q5c UUID := gen_random_uuid(); q5d UUID := gen_random_uuid();

  -- Parameter IDs (looked up by name — never hardcoded)
  p_iq      UUID; p_eq       UUID; p_fitness  UUID;
  p_social  UUID; p_comm     UUID; p_mindful  UUID;
  p_creative UUID; p_leader  UUID; p_digital  UUID; p_finance UUID;
BEGIN
  SELECT id INTO p_iq       FROM growth_parameters WHERE name = 'IQ / Cognitive';
  SELECT id INTO p_eq       FROM growth_parameters WHERE name = 'EQ / Emotional Intelligence';
  SELECT id INTO p_fitness  FROM growth_parameters WHERE name = 'Fitness / Physical';
  SELECT id INTO p_social   FROM growth_parameters WHERE name = 'Social Skills';
  SELECT id INTO p_comm     FROM growth_parameters WHERE name = 'Communication';
  SELECT id INTO p_mindful  FROM growth_parameters WHERE name = 'Mindfulness / Mental Wellness';
  SELECT id INTO p_creative FROM growth_parameters WHERE name = 'Creativity';
  SELECT id INTO p_leader   FROM growth_parameters WHERE name = 'Leadership';
  SELECT id INTO p_digital  FROM growth_parameters WHERE name = 'Digital Literacy';
  SELECT id INTO p_finance  FROM growth_parameters WHERE name = 'Financial Literacy';

  -- Questions
  INSERT INTO questionnaire_questions (id, text, display_order) VALUES
    (q1, 'Which activities do you enjoy the most?', 1),
    (q2, 'When you face a hard problem, what do you usually do first?', 2),
    (q3, 'How comfortable are you using technology (computers, apps, the internet)?', 3),
    (q4, 'What do you usually do when you receive pocket money or a gift of money?', 4),
    (q5, 'In a group project, which role do you naturally take on?', 5);

  -- Q1 options + scores
  INSERT INTO questionnaire_options (id, question_id, text, display_order) VALUES
    (q1a, q1, 'Solving puzzles, reading, or learning new facts', 1),
    (q1b, q1, 'Drawing, music, writing, or creative projects', 2),
    (q1c, q1, 'Sports, dance, yoga, or outdoor activities', 3),
    (q1d, q1, 'Hanging out and doing things with friends', 4);
  INSERT INTO questionnaire_option_scores (option_id, parameter_id, points) VALUES
    (q1a, p_iq,      200),
    (q1b, p_creative, 200),
    (q1c, p_fitness,  200),
    (q1d, p_social,   200);

  -- Q2 options + scores
  INSERT INTO questionnaire_options (id, question_id, text, display_order) VALUES
    (q2a, q2, 'Break it into smaller parts and think it through logically', 1),
    (q2b, q2, 'Ask a friend, teacher, or look it up together with someone', 2),
    (q2c, q2, 'Try a completely different or creative approach', 3),
    (q2d, q2, 'Take a breath, calm myself, then try again', 4);
  INSERT INTO questionnaire_option_scores (option_id, parameter_id, points) VALUES
    (q2a, p_iq,      160), (q2a, p_eq,      80),
    (q2b, p_social,  160), (q2b, p_comm,    80),
    (q2c, p_creative,160), (q2c, p_leader,  80),
    (q2d, p_mindful, 200);

  -- Q3 options + scores (Digital Literacy)
  INSERT INTO questionnaire_options (id, question_id, text, display_order) VALUES
    (q3a, q3, 'Very comfortable — I learn new apps and tools quickly', 1),
    (q3b, q3, 'Comfortable with everyday use (browsing, messaging, streaming)', 2),
    (q3c, q3, 'I can do the basics but prefer not to use tech too much', 3),
    (q3d, q3, 'I am still learning and get confused sometimes', 4);
  INSERT INTO questionnaire_option_scores (option_id, parameter_id, points) VALUES
    (q3a, p_digital, 200),
    (q3b, p_digital, 140),
    (q3c, p_digital,  80),
    (q3d, p_digital,  40);

  -- Q4 options + scores (Financial Literacy)
  INSERT INTO questionnaire_options (id, question_id, text, display_order) VALUES
    (q4a, q4, 'Save most of it and plan what I want to buy later', 1),
    (q4b, q4, 'Save some and spend some on things I enjoy', 2),
    (q4c, q4, 'Spend it on things I like right away', 3),
    (q4d, q4, 'Give some to family or donate a part of it', 4);
  INSERT INTO questionnaire_option_scores (option_id, parameter_id, points) VALUES
    (q4a, p_finance, 200),
    (q4b, p_finance, 140),
    (q4c, p_finance,  60),
    (q4d, p_finance, 100);

  -- Q5 options + scores (Leadership, Communication, Social)
  INSERT INTO questionnaire_options (id, question_id, text, display_order) VALUES
    (q5a, q5, 'Organise the team, assign tasks, and keep things on track', 1),
    (q5b, q5, 'Share ideas and encourage others to contribute', 2),
    (q5c, q5, 'Work on my part carefully and support the group', 3),
    (q5d, q5, 'Prefer working alone but I do what the group decides', 4);
  INSERT INTO questionnaire_option_scores (option_id, parameter_id, points) VALUES
    (q5a, p_leader, 200), (q5a, p_comm,   120),
    (q5b, p_comm,   160), (q5b, p_social, 120),
    (q5c, p_social, 140),
    (q5d, p_social,  60);
END $$;

-- =============================================
-- ASSESSMENT SEED (8 questions, correct answers award parameter points)
-- =============================================
DO $$
DECLARE
  asmt UUID := gen_random_uuid();

  aq1 UUID := gen_random_uuid(); aq2 UUID := gen_random_uuid();
  aq3 UUID := gen_random_uuid(); aq4 UUID := gen_random_uuid();
  aq5 UUID := gen_random_uuid(); aq6 UUID := gen_random_uuid();
  aq7 UUID := gen_random_uuid(); aq8 UUID := gen_random_uuid();

  -- Q1 opts
  o1a UUID := gen_random_uuid(); o1b UUID := gen_random_uuid();
  o1c UUID := gen_random_uuid(); o1d UUID := gen_random_uuid();
  -- Q2 opts
  o2a UUID := gen_random_uuid(); o2b UUID := gen_random_uuid();
  o2c UUID := gen_random_uuid(); o2d UUID := gen_random_uuid();
  -- Q3 opts
  o3a UUID := gen_random_uuid(); o3b UUID := gen_random_uuid();
  o3c UUID := gen_random_uuid(); o3d UUID := gen_random_uuid();
  -- Q4 opts
  o4a UUID := gen_random_uuid(); o4b UUID := gen_random_uuid();
  o4c UUID := gen_random_uuid(); o4d UUID := gen_random_uuid();
  -- Q5 opts
  o5a UUID := gen_random_uuid(); o5b UUID := gen_random_uuid();
  o5c UUID := gen_random_uuid(); o5d UUID := gen_random_uuid();
  -- Q6 opts
  o6a UUID := gen_random_uuid(); o6b UUID := gen_random_uuid();
  o6c UUID := gen_random_uuid(); o6d UUID := gen_random_uuid();
  -- Q7 opts
  o7a UUID := gen_random_uuid(); o7b UUID := gen_random_uuid();
  o7c UUID := gen_random_uuid(); o7d UUID := gen_random_uuid();
  -- Q8 opts
  o8a UUID := gen_random_uuid(); o8b UUID := gen_random_uuid();
  o8c UUID := gen_random_uuid(); o8d UUID := gen_random_uuid();

  p_iq      UUID; p_finance  UUID; p_digital UUID;
  p_social  UUID; p_mindful  UUID; p_creative UUID;
BEGIN
  SELECT id INTO p_iq       FROM growth_parameters WHERE name = 'IQ / Cognitive';
  SELECT id INTO p_finance  FROM growth_parameters WHERE name = 'Financial Literacy';
  SELECT id INTO p_digital  FROM growth_parameters WHERE name = 'Digital Literacy';
  SELECT id INTO p_social   FROM growth_parameters WHERE name = 'Social Skills';
  SELECT id INTO p_mindful  FROM growth_parameters WHERE name = 'Mindfulness / Mental Wellness';
  SELECT id INTO p_creative FROM growth_parameters WHERE name = 'Creativity';

  INSERT INTO assessments (id, title, description) VALUES
    (asmt, 'SkillFleet Starter Quiz',
     'A quick 8-question quiz to help us understand your strengths.');

  INSERT INTO assessment_questions (id, assessment_id, text, display_order) VALUES
    (aq1, asmt, 'You buy 3 items costing ₹25 each and pay with ₹100. How much change do you get?', 1),
    (aq2, asmt, 'Which of these is a renewable energy source?', 2),
    (aq3, asmt, 'What does "saving" money mean?', 3),
    (aq4, asmt, 'A train travels at 60 km/h. How far does it travel in 2.5 hours?', 4),
    (aq5, asmt, 'Which skill best helps you stay calm when things go wrong?', 5),
    (aq6, asmt, 'What does a password manager do?', 6),
    (aq7, asmt, 'In a team project one member is struggling. What is the best response?', 7),
    (aq8, asmt, 'Which of these is NOT a primary colour in painting?', 8);

  -- Q1: ₹25 change (correct: o1a) → IQ + Finance
  INSERT INTO assessment_options (id, question_id, text, is_correct, display_order) VALUES
    (o1a, aq1, '₹25', true,  1), (o1b, aq1, '₹15', false, 2),
    (o1c, aq1, '₹35', false, 3), (o1d, aq1, '₹10', false, 4);
  INSERT INTO assessment_option_scores (option_id, parameter_id, points) VALUES
    (o1a, p_iq, 120), (o1a, p_finance, 80);

  -- Q2: Solar power (correct: o2b) → IQ
  INSERT INTO assessment_options (id, question_id, text, is_correct, display_order) VALUES
    (o2a, aq2, 'Coal',        false, 1), (o2b, aq2, 'Solar power', true,  2),
    (o2c, aq2, 'Diesel',      false, 3), (o2d, aq2, 'Natural gas', false, 4);
  INSERT INTO assessment_option_scores (option_id, parameter_id, points) VALUES
    (o2b, p_iq, 120);

  -- Q3: Setting aside money now (correct: o3c) → Finance
  INSERT INTO assessment_options (id, question_id, text, is_correct, display_order) VALUES
    (o3a, aq3, 'Spending money before you earn more',          false, 1),
    (o3b, aq3, 'Hiding money so others cannot find it',        false, 2),
    (o3c, aq3, 'Setting aside money now to use in the future', true,  3),
    (o3d, aq3, 'Borrowing money from a friend',                false, 4);
  INSERT INTO assessment_option_scores (option_id, parameter_id, points) VALUES
    (o3c, p_finance, 160);

  -- Q4: 150 km (correct: o4a) → IQ
  INSERT INTO assessment_options (id, question_id, text, is_correct, display_order) VALUES
    (o4a, aq4, '150 km', true,  1), (o4b, aq4, '90 km',  false, 2),
    (o4c, aq4, '120 km', false, 3), (o4d, aq4, '160 km', false, 4);
  INSERT INTO assessment_option_scores (option_id, parameter_id, points) VALUES
    (o4a, p_iq, 160);

  -- Q5: Deep breaths + calm approach (correct: o5b) → Mindfulness
  INSERT INTO assessment_options (id, question_id, text, is_correct, display_order) VALUES
    (o5a, aq5, 'Ignore the problem and hope it goes away',  false, 1),
    (o5b, aq5, 'Take deep breaths and approach it calmly',  true,  2),
    (o5c, aq5, 'Get angry and walk away',                   false, 3),
    (o5d, aq5, 'Panic and give up',                         false, 4);
  INSERT INTO assessment_option_scores (option_id, parameter_id, points) VALUES
    (o5b, p_mindful, 160);

  -- Q6: Stores and fills in passwords (correct: o6c) → Digital Literacy
  INSERT INTO assessment_options (id, question_id, text, is_correct, display_order) VALUES
    (o6a, aq6, 'Saves your internet history',                    false, 1),
    (o6b, aq6, 'Blocks harmful websites',                         false, 2),
    (o6c, aq6, 'Stores and fills in your passwords securely',     true,  3),
    (o6d, aq6, 'Speeds up your internet connection',              false, 4);
  INSERT INTO assessment_option_scores (option_id, parameter_id, points) VALUES
    (o6c, p_digital, 160);

  -- Q7: Offer to help and share the work (correct: o7a) → Social Skills
  INSERT INTO assessment_options (id, question_id, text, is_correct, display_order) VALUES
    (o7a, aq7, 'Offer to help and share the work together',   true,  1),
    (o7b, aq7, 'Tell the teacher to handle it',               false, 2),
    (o7c, aq7, 'Ignore it and focus only on your own tasks',  false, 3),
    (o7d, aq7, 'Complain to other team members about them',   false, 4);
  INSERT INTO assessment_option_scores (option_id, parameter_id, points) VALUES
    (o7a, p_social, 160);

  -- Q8: Green is NOT a primary colour (correct: o8b) → Creativity + IQ
  -- Primary colours in painting: Red, Blue, Yellow. Green is secondary.
  INSERT INTO assessment_options (id, question_id, text, is_correct, display_order) VALUES
    (o8a, aq8, 'Red',    false, 1), (o8b, aq8, 'Green', true,  2),
    (o8c, aq8, 'Blue',   false, 3), (o8d, aq8, 'Yellow', false, 4);
  INSERT INTO assessment_option_scores (option_id, parameter_id, points) VALUES
    (o8b, p_creative, 120), (o8b, p_iq, 80);
END $$;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `apply_migration` Supabase MCP tool:
- Project ID: `bbioktywqkfvpzmakdxt`
- Migration name: `0007_onboarding_seed`
- Paste the SQL above as the query

- [ ] **Step 3: Verify seed data**

Run this SQL via `execute_sql` to confirm the data landed:
```sql
SELECT COUNT(*) AS questions FROM questionnaire_questions;
SELECT COUNT(*) AS options   FROM questionnaire_options;
SELECT COUNT(*) AS scores    FROM questionnaire_option_scores;
SELECT COUNT(*) AS asmt_q    FROM assessment_questions;
SELECT COUNT(*) AS asmt_opts FROM assessment_options;
SELECT COUNT(*) AS asmt_scores FROM assessment_option_scores;
```
Expected: `5, 20, 25, 8, 32, 12` (approximately — exact counts depend on option_scores rows above).

---

## Task 1: Aggregation Utility + Unit Tests

**Files:**
- Create: `src/lib/scoring/aggregation.ts`
- Create: `src/lib/scoring/__tests__/aggregation.test.ts`
- Modify: `src/lib/scoring/index.ts`

**Interfaces:**
- Produces: `aggregateByParameter(rows: {parameter_id: string; points: number}[]): Record<string, number>`
- Consumes: nothing from earlier tasks — this is a pure utility
- Later tasks (RPC, Server Action) use this type for documentation; the actual aggregation happens in SQL inside the RPC

- [ ] **Step 1: Write the failing test**

Create `src/lib/scoring/__tests__/aggregation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { aggregateByParameter } from '@/lib/scoring/aggregation'

const P1 = 'aaaaaaaa-0000-0000-0000-000000000001'
const P2 = 'bbbbbbbb-0000-0000-0000-000000000002'
const P3 = 'cccccccc-0000-0000-0000-000000000003'

describe('aggregateByParameter', () => {
  it('returns empty object for empty input', () =>
    expect(aggregateByParameter([])).toEqual({}))

  it('single row accumulates correctly', () =>
    expect(aggregateByParameter([{ parameter_id: P1, points: 100 }]))
      .toEqual({ [P1]: 100 }))

  it('sums multiple rows for the same parameter', () =>
    expect(aggregateByParameter([
      { parameter_id: P1, points: 100 },
      { parameter_id: P1, points: 200 },
    ])).toEqual({ [P1]: 300 }))

  it('accumulates two parameters independently', () =>
    expect(aggregateByParameter([
      { parameter_id: P1, points: 100 },
      { parameter_id: P2, points: 200 },
      { parameter_id: P1, points: 50 },
    ])).toEqual({ [P1]: 150, [P2]: 200 }))

  it('handles three distinct parameters', () =>
    expect(aggregateByParameter([
      { parameter_id: P1, points: 100 },
      { parameter_id: P2, points: 200 },
      { parameter_id: P3, points: 300 },
    ])).toEqual({ [P1]: 100, [P2]: 200, [P3]: 300 }))

  it('supports zero points', () =>
    expect(aggregateByParameter([{ parameter_id: P1, points: 0 }]))
      .toEqual({ [P1]: 0 }))

  it('supports negative points (score reversals)', () =>
    expect(aggregateByParameter([
      { parameter_id: P1, points: 100 },
      { parameter_id: P1, points: -40 },
    ])).toEqual({ [P1]: 60 }))

  it('does not include parameters absent from input', () => {
    const result = aggregateByParameter([{ parameter_id: P1, points: 100 }])
    expect(result[P2]).toBeUndefined()
  })
})
```

- [ ] **Step 2: Verify test fails**

```powershell
npm test -- --reporter=verbose src/lib/scoring/__tests__/aggregation.test.ts
```
Expected: `FAIL — Cannot find module '@/lib/scoring/aggregation'`

- [ ] **Step 3: Implement `aggregateByParameter`**

Create `src/lib/scoring/aggregation.ts`:

```typescript
/**
 * Sums raw DB point rows by parameter_id.
 *
 * Pass the result of joining questionnaire_option_scores (or
 * assessment_option_scores) with the student's chosen options.
 * Returns a map { [parameter_id]: total_points } for parameters
 * that appear at least once. Missing parameters default to 0 in
 * callers — do not include them here to keep the map sparse.
 */
export function aggregateByParameter(
  rows: { parameter_id: string; points: number }[]
): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.parameter_id] = (acc[row.parameter_id] ?? 0) + row.points
    return acc
  }, {})
}
```

- [ ] **Step 4: Verify tests pass**

```powershell
npm test -- --reporter=verbose src/lib/scoring/__tests__/aggregation.test.ts
```
Expected: `8 passed`

- [ ] **Step 5: Add to barrel export**

Edit `src/lib/scoring/index.ts` — append one line:

```typescript
export * from '@/lib/scoring/aggregation'
```

- [ ] **Step 6: Run full test suite to confirm no regressions**

```powershell
npm test
```
Expected: `Test Files 7 passed (7) / Tests 86 passed (86)`

---

## Task 2: `complete_onboarding` RPC + Database Type Update

**Files:**
- Create: `supabase/migrations/0008_complete_onboarding_rpc.sql`
- Modify: `src/lib/types/database.ts` (Functions section)

**Interfaces:**
- Produces: `complete_onboarding(p_questionnaire_answers JSONB, p_assessment_id UUID, p_assessment_answers JSONB) → text`
- Return values: `'ok'` | `'already_completed'` | `'not_student'` | `'not_authenticated'`
- Consumed by: Task 3 Server Action

- [ ] **Step 1: Create the RPC migration**

Create `supabase/migrations/0008_complete_onboarding_rpc.sql`:

```sql
-- complete_onboarding
-- Atomically: inserts questionnaire responses, scores the assessment,
-- computes per-parameter baseline scores, writes audit rows,
-- and marks onboarding complete.
--
-- p_questionnaire_answers: { "question_uuid": "chosen_option_uuid", ... }
-- p_assessment_answers:    { "question_uuid": "chosen_option_uuid", ... }
-- Only correct assessment options contribute test points.
-- certPoints = 0 (no cert reviewed at onboarding time).

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_questionnaire_answers JSONB,
  p_assessment_id         UUID,
  p_assessment_answers    JSONB
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student_id   UUID := auth.uid();
  v_role         text;
  v_completed    boolean;
  v_config       RECORD;
  v_param        RECORD;
  v_q_pts        BIGINT;
  v_t_pts        BIGINT;
  v_baseline     INT;
  v_result_id    UUID;
  v_scores_jsonb JSONB;
BEGIN
  -- Auth guard
  IF v_student_id IS NULL THEN
    RETURN 'not_authenticated';
  END IF;

  SELECT role, onboarding_completed
    INTO v_role, v_completed
    FROM public.user_profiles
   WHERE id = v_student_id;

  IF v_role IS DISTINCT FROM 'student' THEN
    RETURN 'not_student';
  END IF;

  -- Idempotency: harmless if called twice
  IF v_completed THEN
    RETURN 'already_completed';
  END IF;

  -- Read weights from DB — never hardcoded
  SELECT * INTO v_config FROM public.baseline_config LIMIT 1;

  -- 1. Insert questionnaire responses (upsert for safety)
  INSERT INTO public.questionnaire_responses (student_id, question_id, option_id)
  SELECT
    v_student_id,
    (kv.key)::UUID,
    (kv.value)::UUID
  FROM jsonb_each_text(p_questionnaire_answers) kv
  ON CONFLICT (student_id, question_id) DO UPDATE
    SET option_id = EXCLUDED.option_id;

  -- 2. Compute test score map: parameter_id → total points (correct answers only)
  SELECT jsonb_object_agg(sub.parameter_id::text, sub.total_pts)
    INTO v_scores_jsonb
    FROM (
      SELECT aos.parameter_id, SUM(aos.points) AS total_pts
        FROM jsonb_each_text(p_assessment_answers) kv
        JOIN public.assessment_options ao
          ON ao.id = (kv.value)::UUID AND ao.is_correct = true
        JOIN public.assessment_option_scores aos
          ON aos.option_id = ao.id
       GROUP BY aos.parameter_id
    ) sub;

  v_scores_jsonb := COALESCE(v_scores_jsonb, '{}');

  -- 3. Upsert assessment_results with scores JSONB
  INSERT INTO public.assessment_results (student_id, assessment_id, scores)
  VALUES (v_student_id, p_assessment_id, v_scores_jsonb)
  ON CONFLICT (student_id, assessment_id) DO UPDATE
    SET scores = EXCLUDED.scores,
        completed_at = NOW()
  RETURNING id INTO v_result_id;

  -- 4. For every active parameter: compute baseline and upsert scores
  FOR v_param IN
    SELECT id FROM public.growth_parameters WHERE is_active = true
  LOOP
    -- Questionnaire contribution
    SELECT COALESCE(SUM(qos.points), 0)
      INTO v_q_pts
      FROM public.questionnaire_responses qr
      JOIN public.questionnaire_option_scores qos ON qos.option_id = qr.option_id
     WHERE qr.student_id = v_student_id
       AND qos.parameter_id = v_param.id;

    -- Assessment contribution (from pre-computed JSONB above)
    v_t_pts := COALESCE((v_scores_jsonb ->> v_param.id::text)::BIGINT, 0);

    -- Baseline: ROUND(test * test_weight + 0 * cert_weight + q * q_weight)
    -- certPoints = 0 until admin approves a cert
    v_baseline := GREATEST(0, LEAST(1000,
      ROUND(
        v_t_pts * v_config.test_weight +
        v_q_pts * v_config.questionnaire_weight
      )::INT
    ));

    INSERT INTO public.student_parameter_scores (student_id, parameter_id, baseline_score, accrued_score)
    VALUES (v_student_id, v_param.id, v_baseline, 0)
    ON CONFLICT (student_id, parameter_id) DO UPDATE
      SET baseline_score = EXCLUDED.baseline_score,
          updated_at = NOW();

    -- Audit trail
    IF v_q_pts > 0 THEN
      INSERT INTO public.score_contributions
        (student_id, parameter_id, source_type, points, description)
      VALUES
        (v_student_id, v_param.id, 'baseline_questionnaire', v_q_pts,
         'Onboarding questionnaire');
    END IF;

    IF v_t_pts > 0 THEN
      INSERT INTO public.score_contributions
        (student_id, parameter_id, source_type, source_id, points, description)
      VALUES
        (v_student_id, v_param.id, 'baseline_test', v_result_id, v_t_pts,
         'Starter assessment');
    END IF;
  END LOOP;

  -- 5. Mark onboarding complete
  UPDATE public.user_profiles
     SET onboarding_completed = true,
         updated_at = NOW()
   WHERE id = v_student_id;

  RETURN 'ok';
END;
$$;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `apply_migration` tool:
- Project ID: `bbioktywqkfvpzmakdxt`
- Migration name: `0008_complete_onboarding_rpc`
- SQL: the full function above

- [ ] **Step 3: Smoke-test the RPC exists**

Run via `execute_sql`:
```sql
SELECT routine_name FROM information_schema.routines
 WHERE routine_schema = 'public' AND routine_name = 'complete_onboarding';
```
Expected: 1 row returned.

- [ ] **Step 4: Update database types**

Edit `src/lib/types/database.ts` — find the `Functions:` block and add `complete_onboarding` alongside the existing functions:

```typescript
    Functions: {
      complete_onboarding: {
        Args: {
          p_questionnaire_answers: Json
          p_assessment_id: string
          p_assessment_answers: Json
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_parent_of: { Args: { p_student_id: string }; Returns: boolean }
      link_student_with_password: {
        Args: { p_email: string; p_password: string }
        Returns: string
      }
      get_my_children: {
        Args: never
        Returns: {
          student_id: string
          full_name: string | null
          email: string
          relationship: string
        }[]
      }
      unlink_student: { Args: { p_student_id: string }; Returns: string }
    }
```

- [ ] **Step 5: Verify TypeScript is clean**

```powershell
npx tsc --noEmit
```
Expected: no errors.

---

## Task 3: Server Actions

**Files:**
- Create: `src/app/onboarding/actions.ts`

**Interfaces:**
- Produces:
  - `submitOnboardingAction(_prevState: OnboardingFormState, formData: FormData): Promise<OnboardingFormState>`
    - FormData keys: `questionnaire_answers` (JSON string), `assessment_id` (UUID string), `assessment_answers` (JSON string)
    - On success: redirects to `/dashboard` (throws — no return)
    - On error: returns `{ error: string }`
  - `saveCertRecordAction(formData: FormData): Promise<{ certId?: string; error?: string }>`
    - FormData keys: `file_url` (storage path), `file_name`, `description`, `parameter_id`
    - On success: returns `{ certId: string }`
- Consumes: `complete_onboarding` RPC from Task 2; `createClient` from `@/lib/supabase/server`

- [ ] **Step 1: Create the file**

Create `src/app/onboarding/actions.ts`:

```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type OnboardingFormState = { error?: string } | undefined

export async function submitOnboardingAction(
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const rawQ = formData.get('questionnaire_answers') as string | null
  const assessmentId = formData.get('assessment_id') as string | null
  const rawA = formData.get('assessment_answers') as string | null

  if (!rawQ || !assessmentId || !rawA) {
    return { error: 'Incomplete submission. Please complete all steps.' }
  }

  let qAnswers: Record<string, string>
  let aAnswers: Record<string, string>
  try {
    qAnswers = JSON.parse(rawQ)
    aAnswers = JSON.parse(rawA)
  } catch {
    return { error: 'Invalid answer format. Please try again.' }
  }

  const supabase = await createClient()
  const { data: status, error } = await supabase.rpc('complete_onboarding', {
    p_questionnaire_answers: qAnswers,
    p_assessment_id: assessmentId,
    p_assessment_answers: aAnswers,
  })

  if (error) {
    return { error: 'Could not save your answers. Please try again.' }
  }

  if (status === 'already_completed') {
    redirect('/dashboard')
  }

  if (status !== 'ok') {
    return { error: `Unexpected error (${status}). Please try again.` }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function saveCertRecordAction(
  formData: FormData
): Promise<{ certId?: string; error?: string }> {
  const fileUrl = formData.get('file_url') as string | null
  const fileName = formData.get('file_name') as string | null
  const description = (formData.get('description') as string | null)?.trim() || null
  const parameterId = (formData.get('parameter_id') as string | null) || null

  if (!fileUrl || !fileName) {
    return { error: 'Missing file information.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('certificate_uploads')
    .insert({
      student_id: user.id,
      file_url: fileUrl,
      file_name: fileName,
      description,
      parameter_id: parameterId,
      status: 'pending',
      points_provisional: 0,
      points_approved: 0,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Could not save certificate record.' }
  }

  return { certId: data.id }
}
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

---

## Task 4: Questionnaire Step Component

**Files:**
- Create: `src/components/onboarding/questionnaire-step.tsx`

**Interfaces:**
- Consumes:
  ```typescript
  interface QuestionnaireQuestion {
    id: string
    text: string
    options: { id: string; text: string }[]
  }
  interface QuestionnaireStepProps {
    questions: QuestionnaireQuestion[]
    answers: Record<string, string>   // { [questionId]: selectedOptionId }
    onChange: (questionId: string, optionId: string) => void
    onNext: () => void
  }
  ```
- Produces: UI only — no server calls

- [ ] **Step 1: Create the component**

Create `src/components/onboarding/questionnaire-step.tsx`:

```typescript
'use client'

import { motion } from 'motion/react'

interface QuestionnaireQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
}

interface Props {
  questions: QuestionnaireQuestion[]
  answers: Record<string, string>
  onChange: (questionId: string, optionId: string) => void
  onNext: () => void
}

export function QuestionnaireStep({ questions, answers, onChange, onNext }: Props) {
  const allAnswered = questions.length > 0 && questions.every((q) => !!answers[q.id])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">About You</h2>
        <p className="text-muted mt-1 text-sm">
          Answer honestly — there are no wrong answers. This shapes your personal growth profile.
        </p>
      </div>

      <div className="space-y-5">
        {questions.map((question, idx) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07, type: 'spring', stiffness: 80, damping: 18 }}
            className="clay-card p-5"
          >
            <p className="font-medium text-foreground mb-3">
              {idx + 1}. {question.text}
            </p>
            <div className="space-y-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id
                return (
                  <label
                    key={option.id}
                    className={[
                      'flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 transition-colors border-2 text-sm',
                      selected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-black/[0.06] bg-white text-foreground hover:border-primary/40',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={`q_${question.id}`}
                      value={option.id}
                      checked={selected}
                      onChange={() => onChange(question.id, option.id)}
                      className="sr-only"
                    />
                    {option.text}
                  </label>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!allAnswered}
          className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
        {!allAnswered && (
          <p className="text-center text-xs text-muted">
            Please answer all {questions.length} questions to continue.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

---

## Task 5: Assessment Step Component

**Files:**
- Create: `src/components/onboarding/assessment-step.tsx`

**Interfaces:**
- Consumes:
  ```typescript
  interface AssessmentQuestion {
    id: string
    text: string
    options: { id: string; text: string }[]  // NOTE: is_correct is NOT included (never sent to client)
  }
  interface Props {
    assessmentTitle: string
    questions: AssessmentQuestion[]
    answers: Record<string, string>
    onChange: (questionId: string, optionId: string) => void
    onNext: () => void
    onBack: () => void
  }
  ```

- [ ] **Step 1: Create the component**

Create `src/components/onboarding/assessment-step.tsx`:

```typescript
'use client'

import { motion } from 'motion/react'

interface AssessmentQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
}

interface Props {
  assessmentTitle: string
  questions: AssessmentQuestion[]
  answers: Record<string, string>
  onChange: (questionId: string, optionId: string) => void
  onNext: () => void
  onBack: () => void
}

export function AssessmentStep({
  assessmentTitle,
  questions,
  answers,
  onChange,
  onNext,
  onBack,
}: Props) {
  const allAnswered = questions.length > 0 && questions.every((q) => !!answers[q.id])
  const answeredCount = questions.filter((q) => !!answers[q.id]).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{assessmentTitle}</h2>
        <p className="text-muted mt-1 text-sm">
          Pick the best answer for each question. Your score isn't shown — this builds your growth profile.
        </p>
        <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          />
        </div>
        <p className="text-xs text-muted mt-1">
          {answeredCount} of {questions.length} answered
        </p>
      </div>

      <div className="space-y-5">
        {questions.map((question, idx) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, type: 'spring', stiffness: 80, damping: 18 }}
            className="clay-card p-5"
          >
            <p className="font-medium text-foreground mb-3">
              {idx + 1}. {question.text}
            </p>
            <div className="space-y-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id
                return (
                  <label
                    key={option.id}
                    className={[
                      'flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 transition-colors border-2 text-sm',
                      selected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-black/[0.06] bg-white text-foreground hover:border-primary/40',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={`aq_${question.id}`}
                      value={option.id}
                      checked={selected}
                      onChange={() => onChange(question.id, option.id)}
                      className="sr-only"
                    />
                    {option.text}
                  </label>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-12 rounded-xl border-2 border-black/[0.06] text-muted font-medium hover:border-primary/40 transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!allAnswered}
          className="flex-[2] clay-button bg-cta text-white h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

---

## Task 6: Certificate Upload Step Component

**Files:**
- Create: `src/components/onboarding/certificate-step.tsx`

**Interfaces:**
- Consumes:
  ```typescript
  interface GrowthParameter { id: string; name: string }
  interface Props {
    studentId: string
    parameters: GrowthParameter[]
    onNext: () => void   // called after upload OR when skipping
    onBack: () => void
  }
  ```
- Calls: `supabase.storage.from('certificates').upload(path, file)` directly (client-side, anon key is sufficient — bucket RLS checks `auth.uid()::text = folder`)
- Then calls: `saveCertRecordAction(fd)` Server Action to write the DB record
- Stores: `storageData.path` (NOT a public URL — bucket is private)

- [ ] **Step 1: Create the component**

Create `src/components/onboarding/certificate-step.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { saveCertRecordAction } from '@/app/onboarding/actions'

interface GrowthParameter {
  id: string
  name: string
}

interface UploadedCert {
  id: string
  fileName: string
  parameterName: string | null
}

interface Props {
  studentId: string
  parameters: GrowthParameter[]
  onNext: () => void
  onBack: () => void
}

const MAX_CERTS = 3
const MAX_BYTES = 5 * 1024 * 1024  // 5 MB

export function CertificateStep({ studentId, parameters, onNext, onBack }: Props) {
  const [uploaded, setUploaded] = useState<UploadedCert[]>([])
  const [description, setDescription] = useState('')
  const [parameterId, setParameterId] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''  // reset so same file can be re-chosen
    if (!file) return

    if (uploaded.length >= MAX_CERTS) {
      setUploadError(`You can upload up to ${MAX_CERTS} certificates.`)
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadError('File must be under 5 MB.')
      return
    }

    setUploadError(null)
    const desc = description.trim()
    const paramId = parameterId

    startTransition(async () => {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'bin'
      const storagePath = `${studentId}/${Date.now()}.${ext}`

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('certificates')
        .upload(storagePath, file, { upsert: false })

      if (storageErr || !storageData) {
        setUploadError('Upload failed. Please try again.')
        return
      }

      const fd = new FormData()
      fd.set('file_url', storageData.path)
      fd.set('file_name', file.name)
      fd.set('description', desc)
      fd.set('parameter_id', paramId)

      const result = await saveCertRecordAction(fd)
      if (result.error) {
        setUploadError(result.error)
        return
      }

      const param = parameters.find((p) => p.id === paramId)
      setUploaded((prev) => [
        ...prev,
        { id: result.certId!, fileName: file.name, parameterName: param?.name ?? null },
      ])
      setDescription('')
      setParameterId('')
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Certificates &amp; Achievements
        </h2>
        <p className="text-muted mt-1 text-sm">
          Have a certificate, award, or achievement? Upload it now and an admin will review it to
          add points to your profile. You can skip this step and add them later.
        </p>
      </div>

      {uploaded.length > 0 && (
        <div className="space-y-2">
          {uploaded.map((cert) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 clay-card p-4"
            >
              <CheckCircle className="w-5 h-5 text-accent-teal flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{cert.fileName}</p>
                {cert.parameterName && (
                  <p className="text-xs text-muted">{cert.parameterName}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {uploaded.length < MAX_CERTS && (
        <div className="clay-card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description{' '}
              <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. State-level chess winner, 2024"
              className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Related skill{' '}
              <span className="text-muted font-normal">(optional)</span>
            </label>
            <select
              value={parameterId}
              onChange={(e) => setParameterId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
            >
              <option value="">— Select a skill —</option>
              {parameters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <label
            className={[
              'flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors font-medium text-sm',
              isPending
                ? 'border-black/[0.06] text-muted cursor-not-allowed'
                : 'border-primary/40 text-primary hover:bg-primary/5',
            ].join(' ')}
          >
            <Upload className="w-4 h-4" />
            {isPending ? 'Uploading…' : 'Choose file (JPG, PNG, PDF · max 5 MB)'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              disabled={isPending}
              onChange={handleFileChange}
            />
          </label>

          {uploadError && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{uploadError}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="flex-1 h-12 rounded-xl border-2 border-black/[0.06] text-muted font-medium hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isPending}
          className="flex-[2] clay-button bg-cta text-white h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploaded.length > 0
            ? `Continue with ${uploaded.length} certificate${uploaded.length > 1 ? 's' : ''} →`
            : 'Skip for now →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

---

## Task 7: Onboarding Wizard

**Files:**
- Create: `src/components/onboarding/onboarding-wizard.tsx`

**Interfaces:**
- Consumes:
  - `QuestionnaireStep` from Task 4
  - `AssessmentStep` from Task 5
  - `CertificateStep` from Task 6
  - `submitOnboardingAction` from Task 3
  ```typescript
  interface OnboardingWizardProps {
    studentId: string
    questionnaire: {
      questions: { id: string; text: string; options: { id: string; text: string }[] }[]
    }
    assessment: {
      id: string
      title: string
      questions: { id: string; text: string; options: { id: string; text: string }[] }[]
    }
    parameters: { id: string; name: string }[]
  }
  ```
- On submit: calls `submitOnboardingAction(undefined, formData)` via `startTransition` — Next.js handles the redirect internally

- [ ] **Step 1: Create the wizard**

Create `src/components/onboarding/onboarding-wizard.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { QuestionnaireStep } from './questionnaire-step'
import { AssessmentStep } from './assessment-step'
import { CertificateStep } from './certificate-step'
import { submitOnboardingAction } from '@/app/onboarding/actions'

type Step = 'questionnaire' | 'assessment' | 'certificates' | 'submitting'

interface WizardQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
}

interface OnboardingWizardProps {
  studentId: string
  questionnaire: { questions: WizardQuestion[] }
  assessment: { id: string; title: string; questions: WizardQuestion[] }
  parameters: { id: string; name: string }[]
}

const STEP_LABELS: Record<Step, string> = {
  questionnaire: 'About You',
  assessment:    'Starter Quiz',
  certificates:  'Certificates',
  submitting:    'Submitting',
}

const PROGRESS_STEPS: Step[] = ['questionnaire', 'assessment', 'certificates']

export function OnboardingWizard({
  studentId,
  questionnaire,
  assessment,
  parameters,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>('questionnaire')
  const [qAnswers, setQAnswers] = useState<Record<string, string>>({})
  const [aAnswers, setAAnswers] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setStep('submitting')
    setSubmitError(null)

    const fd = new FormData()
    fd.set('questionnaire_answers', JSON.stringify(qAnswers))
    fd.set('assessment_id', assessment.id)
    fd.set('assessment_answers', JSON.stringify(aAnswers))

    startTransition(async () => {
      const result = await submitOnboardingAction(undefined, fd)
      // If redirect happened, this line is never reached.
      // Only reached on error.
      if (result?.error) {
        setSubmitError(result.error)
        setStep('certificates')
      }
    })
  }

  const progressIdx = PROGRESS_STEPS.indexOf(step as Step)

  return (
    <div className="w-full">
      {/* Progress bar */}
      {step !== 'submitting' && (
        <div className="flex items-center mb-8 gap-2">
          {PROGRESS_STEPS.map((s, idx) => {
            const done    = progressIdx > idx
            const current = progressIdx === idx
            return (
              <div key={s} className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors',
                    done    ? 'bg-primary text-white' :
                    current ? 'bg-cta text-white' :
                              'bg-black/10 text-muted',
                  ].join(' ')}
                >
                  {done ? '✓' : idx + 1}
                </div>
                <span
                  className={[
                    'text-sm font-medium truncate',
                    current ? 'text-foreground' : 'text-muted',
                  ].join(' ')}
                >
                  {STEP_LABELS[s]}
                </span>
                {idx < PROGRESS_STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-black/10 mx-1" />
                )}
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'questionnaire' && (
          <motion.div
            key="questionnaire"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          >
            <QuestionnaireStep
              questions={questionnaire.questions}
              answers={qAnswers}
              onChange={(qId, optId) =>
                setQAnswers((prev) => ({ ...prev, [qId]: optId }))
              }
              onNext={() => setStep('assessment')}
            />
          </motion.div>
        )}

        {step === 'assessment' && (
          <motion.div
            key="assessment"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          >
            <AssessmentStep
              assessmentTitle={assessment.title}
              questions={assessment.questions}
              answers={aAnswers}
              onChange={(qId, optId) =>
                setAAnswers((prev) => ({ ...prev, [qId]: optId }))
              }
              onNext={() => setStep('certificates')}
              onBack={() => setStep('questionnaire')}
            />
          </motion.div>
        )}

        {step === 'certificates' && (
          <motion.div
            key="certificates"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          >
            {submitError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">
                {submitError}
              </p>
            )}
            <CertificateStep
              studentId={studentId}
              parameters={parameters}
              onNext={handleSubmit}
              onBack={() => setStep('assessment')}
            />
          </motion.div>
        )}

        {step === 'submitting' && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="clay-card p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <motion.div
                className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Building your growth profile…
            </h2>
            <p className="text-muted mt-2 text-sm">This only takes a moment.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

---

## Task 8: Rewrite `/onboarding/page.tsx`

**Files:**
- Modify: `src/app/onboarding/page.tsx` (full rewrite)

**Interfaces:**
- Consumes:
  - `createClient` (server) for DB queries
  - `OnboardingWizard` from Task 7
- Auth guards (unchanged from placeholder):
  - No user → `/login`
  - `role !== 'student'` → `/dashboard`
  - `onboarding_completed` → `/dashboard`
- Fetches (server-side, never sent to client):
  - questionnaire questions + options (excludes `questionnaire_option_scores`)
  - assessment questions + options (excludes `assessment_option_scores` AND `is_correct`)
  - active growth parameters (for cert upload dropdown)
- Falls back gracefully if DB has no questionnaire or no assessment

- [ ] **Step 1: Rewrite the page**

Replace all content of `src/app/onboarding/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

// Local types for the nested Supabase selects.
// The generated database.ts does not include nested relation shapes,
// so we define them here for the page only.
interface RawOption {
  id: string
  text: string
  display_order: number
}

interface RawQuestion {
  id: string
  text: string
  display_order: number
  questionnaire_options: RawOption[]
}

interface RawAssessmentOption {
  id: string
  text: string
  display_order: number
  // is_correct intentionally excluded from select — never sent to client
}

interface RawAssessmentQuestion {
  id: string
  text: string
  display_order: number
  assessment_options: RawAssessmentOption[]
}

interface RawAssessment {
  id: string
  title: string
  assessment_questions: RawAssessmentQuestion[]
}

export default async function OnboardingPage() {
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
  if (profile.role !== 'student') redirect('/dashboard')
  if (profile.onboarding_completed) redirect('/dashboard')

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  // Fetch all questionnaire questions + options (scores NOT fetched — server only)
  const { data: rawQuestions } = (await supabase
    .from('questionnaire_questions')
    .select('id, text, display_order, questionnaire_options(id, text, display_order)')
    .eq('is_active', true)
    .order('display_order')) as unknown as { data: RawQuestion[] | null }

  // Fetch the first active assessment + questions + options (is_correct excluded)
  const { data: rawAssessments } = (await supabase
    .from('assessments')
    .select(
      'id, title, assessment_questions(id, text, display_order, assessment_options(id, text, display_order))'
    )
    .eq('is_active', true)
    .limit(1)) as unknown as { data: RawAssessment[] | null }

  // Active parameters for cert upload dropdown
  const { data: parameters } = await supabase
    .from('growth_parameters')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order')

  const rawAssessment = rawAssessments?.[0] ?? null

  // Sort nested arrays by display_order
  const questions = (rawQuestions ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    options: (q.questionnaire_options ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(({ id, text }) => ({ id, text })),
  }))

  const assessment = rawAssessment
    ? {
        id: rawAssessment.id,
        title: rawAssessment.title,
        questions: (rawAssessment.assessment_questions ?? [])
          .sort((a, b) => a.display_order - b.display_order)
          .map((q) => ({
            id: q.id,
            text: q.text,
            options: (q.assessment_options ?? [])
              .sort((a, b) => a.display_order - b.display_order)
              .map(({ id, text }) => ({ id, text })),
          })),
      }
    : null

  // Graceful fallback: no content configured yet
  if (!questions.length || !assessment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="clay-card w-full max-w-lg p-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome, {firstName}!
          </h1>
          <p className="text-muted mt-3">
            Onboarding content is still being prepared. Please check back soon.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome aboard, {firstName}! 🌱
          </h1>
          <p className="text-muted mt-2">
            Let's build your growth profile in 3 quick steps.
          </p>
        </div>

        <OnboardingWizard
          studentId={user.id}
          questionnaire={{ questions }}
          assessment={assessment}
          parameters={parameters ?? []}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Verify tests still pass**

```powershell
npm test
```
Expected: `Test Files 7 passed (7) / Tests 86 passed (86)`

---

## How to Test Plan C (Manual Flow)

1. **Start dev server**
   ```powershell
   npm run dev
   ```

2. **Sign up as a new student** at `/signup/student` (name, DOB 2010-01-01, email, strong password).
   - Should redirect to `/onboarding`.

3. **Step 1 — Questionnaire**: answer all 5 questions, click "Continue →".

4. **Step 2 — Starter Quiz**: answer all 8 MCQ questions (progress bar fills), click "Continue →".

5. **Step 3 — Certificates**: either upload a test PDF/image then click "Continue", or click "Skip for now →".
   - On upload: fill in a description, pick a skill, choose a file. It should show a green checkmark after uploading.

6. **Submitting screen**: spinning animation appears, then browser redirects to `/dashboard`.

7. **Verify DB writes** via `execute_sql`:
   ```sql
   -- Check the student's baseline scores were written
   SELECT p.name, sps.baseline_score
     FROM student_parameter_scores sps
     JOIN growth_parameters p ON p.id = sps.parameter_id
     JOIN auth.users u ON u.id = sps.student_id
    WHERE u.email = 'YOUR_TEST_EMAIL'
    ORDER BY p.display_order;

   -- Check onboarding_completed was set
   SELECT full_name, onboarding_completed
     FROM user_profiles
     JOIN auth.users u ON u.id = user_profiles.id
    WHERE u.email = 'YOUR_TEST_EMAIL';

   -- Check questionnaire responses
   SELECT COUNT(*) FROM questionnaire_responses
     JOIN auth.users u ON u.id = questionnaire_responses.student_id
    WHERE u.email = 'YOUR_TEST_EMAIL';

   -- Check assessment result
   SELECT scores FROM assessment_results
     JOIN auth.users u ON u.id = assessment_results.student_id
    WHERE u.email = 'YOUR_TEST_EMAIL';
   ```

8. **Second login** with the same student account → should redirect straight to `/dashboard` (not `/onboarding`).

9. **Login as admin** → `/admin` — no onboarding redirect.

10. **Login as parent** → `/dashboard` — no onboarding redirect.
