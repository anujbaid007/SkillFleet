# SkillFleet Phase 1 — Plan A: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Supabase database schema, seed data, TypeScript types, Supabase clients, route-protection proxy, and all auth pages (login, signup for both roles, auth callback) so that every subsequent plan has a complete authenticated backend to build against.

**Architecture:** Supabase handles auth (email + password) and Postgres. Next.js 16 App Router uses route groups `(auth)`, `(platform)`, and `(admin)` to separate layouts without affecting URLs. `src/proxy.ts` (Next.js 16's renamed `middleware.ts`) enforces authentication on protected routes. Role checks happen in layouts, not the proxy, to keep the proxy fast and keep security checks close to data.

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript, Supabase Auth + Postgres, @supabase/ssr, @supabase/supabase-js, Tailwind CSS v4, motion/react, Baloo 2 + Inter fonts

## Global Constraints

- **Next.js 16:** `middleware.ts` is DEPRECATED — use `src/proxy.ts` with `export function proxy()` (or `export async function proxy()`)
- **`cookies()` is async** — always `const cookieStore = await cookies()`
- **Route Handler params are Promises** — always `const { id } = await ctx.params`
- **Cache:** use `revalidatePath()` from `next/cache` or `refresh()` from `next/cache` — NOT `router.refresh()` inside Server Actions
- **Tailwind CSS v4** — colors in `src/app/globals.css` `@theme inline` block; no `tailwind.config.ts`
- **Animation:** `import { motion } from "motion/react"` — NOT `framer-motion`
- **Design:** Claymorphism — use `.clay-card` and `.clay-button` CSS classes from `globals.css`
- **Fonts:** `font-display` = Baloo 2 (headings), `font-sans` = Inter (body)
- **Parameters are NEVER hardcoded** — always read from `growth_parameters` table
- **Payments are ALWAYS parent-only** — student accounts must never be allowed to make payments
- **Admin client** (service role key) is server-only — NEVER imported in client components
- **Supabase env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## File Structure

### New files created in this plan

```
.env.local                                          # Supabase env vars (gitignored)

supabase/
  migrations/
    0001_initial_schema.sql                         # Full DB schema
    0002_seed_data.sql                              # Default parameters, levels, age bands, config
    0003_storage_buckets.sql                        # Certificates storage bucket + RLS

src/
  proxy.ts                                          # Route protection (Next.js 16, replaces middleware.ts)

  lib/
    types/
      database.ts                                   # TypeScript types for all DB tables
    supabase/
      client.ts                                     # Browser Supabase client
      server.ts                                     # Server Supabase client (Server Components + Actions)
      admin.ts                                      # Admin Supabase client (service role — server only)

  app/
    auth/
      callback/
        route.ts                                    # Supabase auth callback (PKCE flow)

    (auth)/
      layout.tsx                                    # Auth layout (centered card, no navbar)
      login/
        page.tsx                                    # Login form
      signup/
        page.tsx                                    # Role chooser (Student / Parent)
        student/
          page.tsx                                  # Student signup form
        parent/
          page.tsx                                  # Parent signup form
          link-student/
            page.tsx                                # Link student after parent signup

    (platform)/
      layout.tsx                                    # Platform shell (sidebar + user menu)

    (admin)/
      layout.tsx                                    # Admin shell (sidebar, role-gated)

    actions/
      auth.ts                                       # 'use server' — login, signup, logout actions

  components/
    platform/
      platform-nav.tsx                              # Platform sidebar nav component
    admin/
      admin-nav.tsx                                 # Admin sidebar nav component
```

---

## Task 1: Install Dependencies + Environment Setup

**Files:**
- Create: `.env.local`
- Modify: `package.json` (via npm install)

**Interfaces:**
- Produces: `createBrowserClient`, `createServerClient` from `@supabase/ssr` available throughout project

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Create `.env.local`**

Create `c:\Users\Nikhil Koltharkar\Downloads\SkillFleet-main\.env.local`:

```bash
# Get these from your Supabase project dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# Razorpay (Phase 1 booking — add when available)
# RAZORPAY_KEY_ID=rzp_test_...
# RAZORPAY_KEY_SECRET=...
```

> **How to get these values:**
> 1. Go to supabase.com → your project → Settings → API
> 2. `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
> 3. `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> 4. `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`
>
> If you haven't created a Supabase project yet:
> - supabase.com → New project → India region → choose a strong DB password

- [ ] **Step 3: Verify `.env.local` is gitignored**

Check `c:\Users\Nikhil Koltharkar\Downloads\SkillFleet-main\.gitignore` — it should already contain `.env.local` (Next.js adds it by default). If not, add it.

- [ ] **Step 4: Verify dev server still starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000, no errors about missing modules.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @supabase/supabase-js and @supabase/ssr dependencies"
```

---

## Task 2: Database Schema Migration

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

**Interfaces:**
- Produces: All tables referenced by every other plan in Phase 1

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Create `supabase/migrations/0001_initial_schema.sql`**

```sql
-- =============================================
-- EXTENSIONS
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CONFIGURATION TABLES (all admin-editable)
-- =============================================

-- Growth parameters — names/weights come from DB, never hardcoded
CREATE TABLE growth_parameters (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT,
  weight        DECIMAL(5,4) NOT NULL DEFAULT 1.0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  display_order INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Age bands for student segmentation
CREATE TABLE age_bands (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  label         TEXT  NOT NULL,
  min_age       INT   NOT NULL,
  max_age       INT   NOT NULL,
  display_order INT   NOT NULL DEFAULT 0
);

-- Target score ranges per parameter per age band (display scale 0–100)
CREATE TABLE parameter_targets (
  parameter_id  UUID NOT NULL REFERENCES growth_parameters(id) ON DELETE CASCADE,
  age_band_id   UUID NOT NULL REFERENCES age_bands(id) ON DELETE CASCADE,
  target_min    INT  NOT NULL DEFAULT 0,
  target_max    INT  NOT NULL DEFAULT 60,
  PRIMARY KEY (parameter_id, age_band_id)
);

-- Named score levels (Seed, Sprout, Growing, Thriving, Flourishing) — display scale 0–100
CREATE TABLE score_levels (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT  NOT NULL,
  min_score     INT   NOT NULL,
  max_score     INT   NOT NULL,
  color_class   TEXT  NOT NULL DEFAULT 'text-primary',
  display_order INT   NOT NULL DEFAULT 0
);

-- Baseline calculation weights — single-row table, admin-editable
CREATE TABLE baseline_config (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  test_weight               DECIMAL(5,4) NOT NULL DEFAULT 0.45,
  cert_weight               DECIMAL(5,4) NOT NULL DEFAULT 0.30,
  cert_provisional_fraction DECIMAL(5,4) NOT NULL DEFAULT 0.50,
  questionnaire_weight      DECIMAL(5,4) NOT NULL DEFAULT 0.25,
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================
-- TAXONOMY
-- =============================================

CREATE TABLE categories (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT    NOT NULL,
  description   TEXT,
  display_order INT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE topics (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID    NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  description   TEXT,
  display_order INT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which parameters a topic develops (many-to-many)
CREATE TABLE topic_parameters (
  topic_id     UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES growth_parameters(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, parameter_id)
);

-- =============================================
-- OFFERINGS
-- =============================================

CREATE TABLE offerings (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id         UUID    REFERENCES topics(id),
  title            TEXT    NOT NULL,
  description      TEXT,
  type             TEXT    NOT NULL CHECK (type IN ('workshop', 'trip', 'event', 'competition')),
  source           TEXT    NOT NULL DEFAULT 'own' CHECK (source IN ('own', 'vendor')),
  status           TEXT    NOT NULL DEFAULT 'live' CHECK (status IN ('planned', 'live', 'completed', 'retired')),
  price_paise      INT     NOT NULL DEFAULT 0,        -- price in paise (₹1 = 100 paise)
  min_age          INT,
  max_age          INT,
  scheduled_at     TIMESTAMPTZ,
  duration_minutes INT,
  location         TEXT,
  image_url        TEXT,
  vendor_id        UUID    REFERENCES auth.users(id),
  interest_count   INT     NOT NULL DEFAULT 0,        -- for 'planned' offerings
  interest_threshold INT   NOT NULL DEFAULT 20,       -- threshold to trigger admin review
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Points awarded per parameter on completing this offering (internal 0–1000 scale)
CREATE TABLE offering_parameter_contributions (
  offering_id  UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES growth_parameters(id) ON DELETE CASCADE,
  points       INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (offering_id, parameter_id)
);

-- =============================================
-- USER PROFILES
-- =============================================

-- Extends Supabase auth.users — one row per auth user
CREATE TABLE user_profiles (
  id                   UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                 TEXT    NOT NULL CHECK (role IN ('student', 'parent', 'admin', 'vendor')),
  full_name            TEXT,
  date_of_birth        DATE,
  phone                TEXT,
  avatar_url           TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parent ↔ Student links
CREATE TABLE parent_student_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'guardian',
  UNIQUE (parent_id, student_id)
);

-- =============================================
-- GROWTH SCORES
-- =============================================

-- One row per student per parameter — the live score
CREATE TABLE student_parameter_scores (
  student_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parameter_id  UUID NOT NULL REFERENCES growth_parameters(id) ON DELETE CASCADE,
  baseline_score INT NOT NULL DEFAULT 0,   -- internal 0–1000
  accrued_score  INT NOT NULL DEFAULT 0,   -- internal 0–1000; from completed offerings
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, parameter_id)
);

-- Full audit trail — every point ever awarded or removed
CREATE TABLE score_contributions (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parameter_id UUID  NOT NULL REFERENCES growth_parameters(id) ON DELETE CASCADE,
  source_type  TEXT  NOT NULL CHECK (source_type IN (
    'baseline_test',
    'baseline_cert',
    'baseline_cert_approval',
    'baseline_questionnaire',
    'offering_completion',
    'cert_rejection'
  )),
  source_id    UUID,                         -- ID of the source record (booking, cert, assessment result)
  points       INT   NOT NULL,               -- negative for removals (cert rejection)
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ONBOARDING: QUESTIONNAIRE
-- =============================================

CREATE TABLE questionnaire_questions (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  text          TEXT    NOT NULL,
  display_order INT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE questionnaire_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questionnaire_questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);

-- Points per option per parameter (how answering this maps to score)
CREATE TABLE questionnaire_option_scores (
  option_id    UUID NOT NULL REFERENCES questionnaire_options(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES growth_parameters(id) ON DELETE CASCADE,
  points       INT  NOT NULL DEFAULT 0,    -- internal 0–1000
  PRIMARY KEY (option_id, parameter_id)
);

-- Student's submitted answers (one row per question per student)
CREATE TABLE questionnaire_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questionnaire_questions(id),
  option_id   UUID NOT NULL REFERENCES questionnaire_options(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, question_id)
);

-- =============================================
-- ONBOARDING: ASSESSMENTS (DIAGNOSTIC TESTS)
-- =============================================

CREATE TABLE assessments (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT    NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0
);

CREATE TABLE assessment_options (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID    NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT false,
  display_order INT   NOT NULL DEFAULT 0
);

-- Points awarded for correct answers per parameter
CREATE TABLE assessment_option_scores (
  option_id    UUID NOT NULL REFERENCES assessment_options(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES growth_parameters(id) ON DELETE CASCADE,
  points       INT  NOT NULL DEFAULT 0,    -- internal 0–1000
  PRIMARY KEY (option_id, parameter_id)
);

-- Student's completed assessment (scores aggregated by parameter)
CREATE TABLE assessment_results (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID  NOT NULL REFERENCES assessments(id),
  scores        JSONB NOT NULL DEFAULT '{}',   -- {parameter_id: points_earned}
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, assessment_id)
);

-- =============================================
-- CERTIFICATE UPLOADS
-- =============================================

CREATE TABLE certificate_uploads (
  id                  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url            TEXT  NOT NULL,
  file_name           TEXT,
  description         TEXT,
  parameter_id        UUID  REFERENCES growth_parameters(id),
  status              TEXT  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  points_provisional  INT   NOT NULL DEFAULT 0,   -- currently applied (50% of full)
  points_approved     INT   NOT NULL DEFAULT 0,   -- full value on approval
  admin_notes         TEXT,
  reviewed_by         UUID  REFERENCES auth.users(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- BOOKINGS
-- =============================================

CREATE TABLE bookings (
  id                    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offering_id           UUID  NOT NULL REFERENCES offerings(id),
  booked_by             UUID  NOT NULL REFERENCES auth.users(id),   -- always the parent_id
  status                TEXT  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status        TEXT  NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_order_id      TEXT,           -- Razorpay order ID
  payment_payment_id    TEXT,           -- Razorpay payment ID
  price_paise           INT   NOT NULL,
  score_applied         BOOLEAN NOT NULL DEFAULT false,   -- idempotency: was scoring triggered after completion?
  completion_marked_at  TIMESTAMPTZ,
  completion_marked_by  UUID  REFERENCES auth.users(id),  -- admin who marked complete
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all user-data tables
ALTER TABLE user_profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parameter_scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_contributions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_uploads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                   ENABLE ROW LEVEL SECURITY;

-- Helper function: check if the calling user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper function: check if caller is a parent of the given student
CREATE OR REPLACE FUNCTION is_parent_of(p_student_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_student_links
    WHERE parent_id = auth.uid() AND student_id = p_student_id
  );
$$;

-- user_profiles
CREATE POLICY "Users read own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins read all profiles"
  ON user_profiles FOR SELECT USING (is_admin());

CREATE POLICY "Service role bypass"
  ON user_profiles USING (auth.role() = 'service_role');

-- parent_student_links
CREATE POLICY "Parents see own links"
  ON parent_student_links FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Students see links to them"
  ON parent_student_links FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Parents insert links"
  ON parent_student_links FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- student_parameter_scores
CREATE POLICY "Students read own scores"
  ON student_parameter_scores FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Parents read linked student scores"
  ON student_parameter_scores FOR SELECT USING (is_parent_of(student_id));

CREATE POLICY "Admins read all scores"
  ON student_parameter_scores FOR SELECT USING (is_admin());

-- score_contributions
CREATE POLICY "Students read own contributions"
  ON score_contributions FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Parents read linked contributions"
  ON score_contributions FOR SELECT USING (is_parent_of(student_id));

-- questionnaire_responses
CREATE POLICY "Students manage own responses"
  ON questionnaire_responses FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Parents manage linked student responses"
  ON questionnaire_responses FOR ALL USING (is_parent_of(student_id));

-- assessment_results
CREATE POLICY "Students read own results"
  ON assessment_results FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Parents read linked results"
  ON assessment_results FOR SELECT USING (is_parent_of(student_id));

-- certificate_uploads
CREATE POLICY "Students manage own certs"
  ON certificate_uploads FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Parents manage linked student certs"
  ON certificate_uploads FOR ALL USING (is_parent_of(student_id));

CREATE POLICY "Admins manage all certs"
  ON certificate_uploads FOR ALL USING (is_admin());

-- bookings
CREATE POLICY "Students read own bookings"
  ON bookings FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Parents manage own bookings"
  ON bookings FOR ALL USING (auth.uid() = booked_by);

CREATE POLICY "Admins manage all bookings"
  ON bookings FOR ALL USING (is_admin());
```

- [ ] **Step 3: Apply this migration to your Supabase project**

**Option A — Supabase MCP (if available):**
Use the `mcp__plugin_supabase_supabase__apply_migration` tool with the SQL above and name `initial_schema`.

**Option B — Supabase SQL Editor:**
Go to Supabase Dashboard → SQL Editor → paste the SQL → Run.

**Option C — Supabase CLI:**
```bash
supabase db push
```

Expected result: All tables created with no errors. Verify in Supabase Dashboard → Table Editor.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_initial_schema.sql
git commit -m "feat: add initial database schema with RLS policies"
```

---

## Task 3: Seed Data Migration

**Files:**
- Create: `supabase/migrations/0002_seed_data.sql`

**Interfaces:**
- Produces: Default 10 growth parameters, 5 score levels, 4 age bands, baseline config, parameter targets

- [ ] **Step 1: Create `supabase/migrations/0002_seed_data.sql`**

```sql
-- =============================================
-- BASELINE CONFIG (single row)
-- =============================================

INSERT INTO baseline_config (test_weight, cert_weight, cert_provisional_fraction, questionnaire_weight)
VALUES (0.45, 0.30, 0.50, 0.25);

-- =============================================
-- SCORE LEVELS (display scale 0–100)
-- =============================================

INSERT INTO score_levels (name, min_score, max_score, color_class, display_order) VALUES
  ('Seed',        0,  20, 'text-accent-yellow', 1),
  ('Sprout',      21, 40, 'text-accent-teal',   2),
  ('Growing',     41, 60, 'text-primary',        3),
  ('Thriving',    61, 80, 'text-accent-purple',  4),
  ('Flourishing', 81, 100,'text-accent-pink',    5);

-- =============================================
-- AGE BANDS
-- =============================================

INSERT INTO age_bands (label, min_age, max_age, display_order) VALUES
  ('Junior',   6,  9,  1),
  ('Explorer', 10, 12, 2),
  ('Builder',  13, 15, 3),
  ('Achiever', 16, 18, 4);

-- =============================================
-- GROWTH PARAMETERS (10 default — all admin-editable)
-- =============================================

INSERT INTO growth_parameters (name, description, display_order) VALUES
  ('IQ / Cognitive',              'Reasoning, problem-solving, and academic thinking',                       1),
  ('EQ / Emotional Intelligence', 'Self-awareness, empathy, and emotional regulation',                       2),
  ('Fitness / Physical',          'Physical health, stamina, and motor skills',                              3),
  ('Social Skills',               'Collaboration, teamwork, and conflict resolution',                        4),
  ('Communication',               'Speaking, writing, presentation, and listening',                          5),
  ('Mindfulness / Mental Wellness','Resilience, stress management, focus, and self-regulation',              6),
  ('Creativity',                  'Arts, innovation, design thinking, and lateral reasoning',                7),
  ('Leadership',                  'Initiative, responsibility, and decision-making',                         8),
  ('Digital Literacy',            'Technology fluency, coding basics, and media literacy',                   9),
  ('Financial Literacy',          'Money concepts, budgeting basics, and entrepreneurial thinking',          10);

-- =============================================
-- PARAMETER TARGETS per age band
-- Default targets (admin can tune these later)
-- =============================================

DO $$
DECLARE
  v_param   RECORD;
  v_band    RECORD;
  v_tmin    INT;
  v_tmax    INT;
BEGIN
  FOR v_param IN SELECT id FROM growth_parameters LOOP
    FOR v_band IN SELECT id, label FROM age_bands LOOP
      CASE v_band.label
        WHEN 'Junior'   THEN v_tmin := 10; v_tmax := 35;
        WHEN 'Explorer' THEN v_tmin := 25; v_tmax := 50;
        WHEN 'Builder'  THEN v_tmin := 40; v_tmax := 65;
        WHEN 'Achiever' THEN v_tmin := 55; v_tmax := 80;
        ELSE                 v_tmin := 20; v_tmax := 60;
      END CASE;

      INSERT INTO parameter_targets (parameter_id, age_band_id, target_min, target_max)
      VALUES (v_param.id, v_band.id, v_tmin, v_tmax);
    END LOOP;
  END LOOP;
END $$;
```

- [ ] **Step 2: Apply the seed migration**

Same as Task 2 Step 3 — run via MCP, SQL Editor, or CLI.

Expected: `growth_parameters` has 10 rows, `score_levels` has 5 rows, `age_bands` has 4 rows, `parameter_targets` has 40 rows (10 × 4), `baseline_config` has 1 row.

- [ ] **Step 3: Create `supabase/migrations/0003_storage_buckets.sql`**

```sql
-- Private bucket for certificate file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  false,
  5242880,  -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Students can upload to their own folder (folder = their user ID)
CREATE POLICY "Students can upload own certs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'certificates'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Students can read own certs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'certificates'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Parents can upload and view certs for their linked students
CREATE POLICY "Parents can manage linked student certs" ON storage.objects
  FOR ALL USING (
    bucket_id = 'certificates'
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id::text = (storage.foldername(name))[1]
    )
  );

-- Admins can read all cert files
CREATE POLICY "Admins can read all certs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'certificates'
    AND is_admin()
  );
```

- [ ] **Step 4: Apply storage migration**

Run via MCP, SQL Editor, or CLI.

Expected: `certificates` bucket exists in Supabase → Storage.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_seed_data.sql supabase/migrations/0003_storage_buckets.sql
git commit -m "feat: add seed data and storage bucket migrations"
```

---

## Task 4: TypeScript Database Types

**Files:**
- Create: `src/lib/types/database.ts`

**Interfaces:**
- Produces: `Database` type imported by all Supabase clients; typed row types for all tables

- [ ] **Step 1: Create `src/lib/types/database.ts`**

```typescript
export type Role = 'student' | 'parent' | 'admin' | 'vendor'
export type OfferingType = 'workshop' | 'trip' | 'event' | 'competition'
export type OfferingSource = 'own' | 'vendor'
export type OfferingStatus = 'planned' | 'live' | 'completed' | 'retired'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type CertStatus = 'pending' | 'approved' | 'rejected'
export type ScoreSourceType =
  | 'baseline_test'
  | 'baseline_cert'
  | 'baseline_cert_approval'
  | 'baseline_questionnaire'
  | 'offering_completion'
  | 'cert_rejection'

export interface Database {
  public: {
    Tables: {
      growth_parameters: {
        Row: {
          id: string
          name: string
          description: string | null
          weight: number
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['growth_parameters']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['growth_parameters']['Insert']>
      }
      age_bands: {
        Row: {
          id: string
          label: string
          min_age: number
          max_age: number
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['age_bands']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['age_bands']['Insert']>
      }
      parameter_targets: {
        Row: {
          parameter_id: string
          age_band_id: string
          target_min: number
          target_max: number
        }
        Insert: Database['public']['Tables']['parameter_targets']['Row']
        Update: Partial<Database['public']['Tables']['parameter_targets']['Row']>
      }
      score_levels: {
        Row: {
          id: string
          name: string
          min_score: number
          max_score: number
          color_class: string
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['score_levels']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['score_levels']['Insert']>
      }
      baseline_config: {
        Row: {
          id: string
          test_weight: number
          cert_weight: number
          cert_provisional_fraction: number
          questionnaire_weight: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['baseline_config']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['baseline_config']['Insert']>
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      topics: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['topics']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['topics']['Insert']>
      }
      topic_parameters: {
        Row: { topic_id: string; parameter_id: string }
        Insert: Database['public']['Tables']['topic_parameters']['Row']
        Update: Partial<Database['public']['Tables']['topic_parameters']['Row']>
      }
      offerings: {
        Row: {
          id: string
          topic_id: string | null
          title: string
          description: string | null
          type: OfferingType
          source: OfferingSource
          status: OfferingStatus
          price_paise: number
          min_age: number | null
          max_age: number | null
          scheduled_at: string | null
          duration_minutes: number | null
          location: string | null
          image_url: string | null
          vendor_id: string | null
          interest_count: number
          interest_threshold: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['offerings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['offerings']['Insert']>
      }
      offering_parameter_contributions: {
        Row: { offering_id: string; parameter_id: string; points: number }
        Insert: Database['public']['Tables']['offering_parameter_contributions']['Row']
        Update: Partial<Database['public']['Tables']['offering_parameter_contributions']['Row']>
      }
      user_profiles: {
        Row: {
          id: string
          role: Role
          full_name: string | null
          date_of_birth: string | null
          phone: string | null
          avatar_url: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      parent_student_links: {
        Row: {
          id: string
          parent_id: string
          student_id: string
          relationship: string
        }
        Insert: Omit<Database['public']['Tables']['parent_student_links']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['parent_student_links']['Insert']>
      }
      student_parameter_scores: {
        Row: {
          student_id: string
          parameter_id: string
          baseline_score: number
          accrued_score: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['student_parameter_scores']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['student_parameter_scores']['Insert']>
      }
      score_contributions: {
        Row: {
          id: string
          student_id: string
          parameter_id: string
          source_type: ScoreSourceType
          source_id: string | null
          points: number
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['score_contributions']['Row'], 'id' | 'created_at'>
        Update: never
      }
      questionnaire_questions: {
        Row: {
          id: string
          text: string
          display_order: number
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['questionnaire_questions']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['questionnaire_questions']['Insert']>
      }
      questionnaire_options: {
        Row: {
          id: string
          question_id: string
          text: string
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['questionnaire_options']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['questionnaire_options']['Insert']>
      }
      questionnaire_option_scores: {
        Row: { option_id: string; parameter_id: string; points: number }
        Insert: Database['public']['Tables']['questionnaire_option_scores']['Row']
        Update: Partial<Database['public']['Tables']['questionnaire_option_scores']['Row']>
      }
      questionnaire_responses: {
        Row: {
          id: string
          student_id: string
          question_id: string
          option_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['questionnaire_responses']['Row'], 'id' | 'created_at'>
        Update: never
      }
      assessments: {
        Row: {
          id: string
          title: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['assessments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['assessments']['Insert']>
      }
      assessment_questions: {
        Row: {
          id: string
          assessment_id: string
          text: string
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['assessment_questions']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['assessment_questions']['Insert']>
      }
      assessment_options: {
        Row: {
          id: string
          question_id: string
          text: string
          is_correct: boolean
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['assessment_options']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['assessment_options']['Insert']>
      }
      assessment_option_scores: {
        Row: { option_id: string; parameter_id: string; points: number }
        Insert: Database['public']['Tables']['assessment_option_scores']['Row']
        Update: Partial<Database['public']['Tables']['assessment_option_scores']['Row']>
      }
      assessment_results: {
        Row: {
          id: string
          student_id: string
          assessment_id: string
          scores: Record<string, number>
          completed_at: string
        }
        Insert: Omit<Database['public']['Tables']['assessment_results']['Row'], 'id' | 'completed_at'>
        Update: never
      }
      certificate_uploads: {
        Row: {
          id: string
          student_id: string
          file_url: string
          file_name: string | null
          description: string | null
          parameter_id: string | null
          status: CertStatus
          points_provisional: number
          points_approved: number
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['certificate_uploads']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['certificate_uploads']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          student_id: string
          offering_id: string
          booked_by: string
          status: BookingStatus
          payment_status: PaymentStatus
          payment_order_id: string | null
          payment_payment_id: string | null
          price_paise: number
          score_applied: boolean
          completion_marked_at: string | null
          completion_marked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
    }
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean }
      is_parent_of: { Args: { p_student_id: string }; Returns: boolean }
    }
  }
}

// Convenience row types used throughout the app
export type GrowthParameter = Database['public']['Tables']['growth_parameters']['Row']
export type AgeBand = Database['public']['Tables']['age_bands']['Row']
export type ScoreLevel = Database['public']['Tables']['score_levels']['Row']
export type BaselineConfig = Database['public']['Tables']['baseline_config']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Offering = Database['public']['Tables']['offerings']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type CertificateUpload = Database['public']['Tables']['certificate_uploads']['Row']
export type StudentParameterScore = Database['public']['Tables']['student_parameter_scores']['Row']
export type ScoreContribution = Database['public']['Tables']['score_contributions']['Row']
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "feat: add TypeScript database types"
```

---

## Task 5: Supabase Clients

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`

**Interfaces:**
- Produces:
  - `createClient()` (browser) — for Client Components
  - `createClient()` (server) — for Server Components, Server Actions, Route Handlers
  - `adminClient` — service role client, for internal server-only operations (scoring API, cert review)

- [ ] **Step 1: Create `src/lib/supabase/client.ts` (browser)**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create `src/lib/supabase/server.ts` (server)**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookies can only be set in Server Actions or Route Handlers
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create `src/lib/supabase/admin.ts` (service role — server only)**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Service role client — bypasses RLS. NEVER import in client components.
// Only used in Server Actions and Route Handlers for admin operations.
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase browser, server, and admin clients"
```

---

## Task 6: Route Protection Proxy

**Files:**
- Create: `src/proxy.ts`

> **Next.js 16 note:** `middleware.ts` is deprecated and renamed to `proxy.ts`. The exported function must be named `proxy` (not `middleware`). The proxy runs on Node.js runtime by default.

**Interfaces:**
- Produces: Authentication enforcement on `/dashboard`, `/onboarding`, `/catalog`, `/booking`, `/parent`, `/admin` routes; auth pages redirect authenticated users to `/dashboard`

- [ ] **Step 1: Create `src/proxy.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/catalog',
  '/booking',
  '/parent',
  '/admin',
]

// Auth pages — redirect to /dashboard if already logged in
const AUTH_PATHS = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must call getUser() not getSession() for security
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Authenticated users visiting auth pages → send to dashboard
  if (user && AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Unauthenticated users visiting protected routes → send to login
  if (!user && PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)  // preserve intended destination
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except static files, images, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Verify dev server still starts**

```bash
npm run dev
```

Expected: no errors. Navigate to http://localhost:3000/dashboard — it should redirect to `/login` (which doesn't exist yet — you'll see a 404, which is expected at this stage).

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: add route protection proxy (Next.js 16)"
```

---

## Task 7: Auth Callback Route

**Files:**
- Create: `src/app/auth/callback/route.ts`

> This route is required by Supabase's PKCE auth flow. Supabase redirects here after email confirmation or OAuth.

**Interfaces:**
- Consumes: `code` query parameter from Supabase redirect
- Produces: Exchanges code for session, redirects to intended destination

- [ ] **Step 1: Create `src/app/auth/callback/route.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 2: Configure Supabase redirect URL**

In the Supabase dashboard:
- Go to Authentication → URL Configuration
- Set **Site URL** to `http://localhost:3000`
- Add `http://localhost:3000/auth/callback` to **Redirect URLs**
- (When deploying to production, add the production URL too)

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat: add Supabase PKCE auth callback route"
```

---

## Task 8: Auth Layout + Server Actions

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/actions/auth.ts`

**Interfaces:**
- Produces:
  - `loginAction(prevState, formData)` — Server Action for login
  - `signupStudentAction(prevState, formData)` — Server Action for student signup
  - `signupParentAction(prevState, formData)` — Server Action for parent signup
  - `linkStudentAction(prevState, formData)` — Server Action for linking student to parent
  - `logoutAction()` — Server Action for sign out

- [ ] **Step 1: Create `src/app/(auth)/layout.tsx`**

```tsx
import type { ReactNode } from 'react'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <Image
          src="/images/logo.webp"
          alt="SkillFleet"
          width={140}
          height={40}
          priority
        />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
```

> **Note:** If `/images/logo.webp` doesn't exist at that exact path, check `public/images/` for the actual logo filename and update accordingly.

- [ ] **Step 2: Create `src/app/actions/auth.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export type AuthFormState = {
  error?: string
  success?: string
} | undefined

// -------------------------------------------------------
// LOGIN
// -------------------------------------------------------

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Redirect based on role
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') redirect('/admin')
    if (profile?.role === 'student' && !profile.onboarding_completed) redirect('/onboarding')
    redirect('/dashboard')
  }

  redirect('/dashboard')
}

// -------------------------------------------------------
// STUDENT SIGNUP
// -------------------------------------------------------

export async function signupStudentAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email      = (formData.get('email') as string)?.trim().toLowerCase()
  const password   = formData.get('password') as string
  const fullName   = (formData.get('full_name') as string)?.trim()
  const dob        = formData.get('date_of_birth') as string   // YYYY-MM-DD

  if (!email || !password || !fullName || !dob) {
    return { error: 'All fields are required.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback?next=/onboarding`,
    },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Signup failed — please try again.' }

  // Create user profile using admin client (bypasses RLS during initial creation)
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .insert({
      id: data.user.id,
      role: 'student',
      full_name: fullName,
      date_of_birth: dob,
      onboarding_completed: false,
    })

  if (profileError) return { error: 'Profile creation failed: ' + profileError.message }

  redirect('/onboarding')
}

// -------------------------------------------------------
// PARENT SIGNUP
// -------------------------------------------------------

export async function signupParentAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email    = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string)?.trim()
  const phone    = (formData.get('phone') as string)?.trim()

  if (!email || !password || !fullName) {
    return { error: 'Email, password, and full name are required.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback?next=/signup/parent/link-student`,
    },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Signup failed — please try again.' }

  const { error: profileError } = await adminClient
    .from('user_profiles')
    .insert({
      id: data.user.id,
      role: 'parent',
      full_name: fullName,
      phone: phone || null,
      onboarding_completed: false,
    })

  if (profileError) return { error: 'Profile creation failed: ' + profileError.message }

  redirect('/signup/parent/link-student')
}

// -------------------------------------------------------
// LINK STUDENT TO PARENT
// -------------------------------------------------------

export async function linkStudentAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const studentEmail = (formData.get('student_email') as string)?.trim().toLowerCase()

  if (!studentEmail) {
    return { error: 'Student email is required.' }
  }

  const supabase = await createClient()
  const { data: { user: parent } } = await supabase.auth.getUser()

  if (!parent) return { error: 'Not authenticated.' }

  // Look up student by email via admin client (auth.users is not accessible via regular client)
  const { data: studentAuthUser, error: lookupError } = await adminClient.auth.admin
    .listUsers()

  if (lookupError) return { error: 'Could not search for student. Please try again.' }

  const studentUser = studentAuthUser.users.find(u => u.email === studentEmail)
  if (!studentUser) {
    return { error: 'No student account found with that email. Ask your child to sign up first.' }
  }

  // Verify the found user is actually a student
  const { data: studentProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', studentUser.id)
    .single()

  if (studentProfile?.role !== 'student') {
    return { error: 'That account is not a student account.' }
  }

  // Create the link
  const { error: linkError } = await adminClient
    .from('parent_student_links')
    .insert({
      parent_id: parent.id,
      student_id: studentUser.id,
      relationship: 'guardian',
    })

  if (linkError) {
    if (linkError.code === '23505') {
      return { error: 'This student is already linked to your account.' }
    }
    return { error: 'Could not link student: ' + linkError.message }
  }

  revalidatePath('/parent')
  redirect('/parent')
}

// -------------------------------------------------------
// LOGOUT
// -------------------------------------------------------

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 3: Add `NEXT_PUBLIC_SITE_URL` to `.env.local`**

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/layout.tsx src/app/actions/auth.ts
git commit -m "feat: add auth layout and server actions (login, signup, link student, logout)"
```

---

## Task 9: Login Page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `loginAction` from `@/app/actions/auth`
- Produces: `/login` route with form → calls loginAction → redirects to appropriate dashboard

- [ ] **Step 1: Create `src/app/(auth)/login/page.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { loginAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, undefined)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        Welcome back
      </h1>
      <p className="text-muted text-sm mb-6">
        Sign in to your SkillFleet account
      </p>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-muted">
          New student?{' '}
          <Link href="/signup/student" className="text-primary font-semibold hover:underline">
            Create a student account
          </Link>
        </p>
        <p className="text-sm text-muted">
          Parent or guardian?{' '}
          <Link href="/signup/parent" className="text-primary font-semibold hover:underline">
            Create a parent account
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Manually test login page**

```bash
npm run dev
```

Navigate to http://localhost:3000/login — the login form should render with the claymorphism style.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat: add login page"
```

---

## Task 10: Signup Pages

**Files:**
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/signup/student/page.tsx`
- Create: `src/app/(auth)/signup/parent/page.tsx`
- Create: `src/app/(auth)/signup/parent/link-student/page.tsx`

**Interfaces:**
- Consumes: `signupStudentAction`, `signupParentAction`, `linkStudentAction` from `@/app/actions/auth`
- Produces: `/signup`, `/signup/student`, `/signup/parent`, `/signup/parent/link-student` routes

- [ ] **Step 1: Create `src/app/(auth)/signup/page.tsx` (role chooser)**

```tsx
'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { GraduationCap, Heart } from 'lucide-react'

export default function SignupPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
        Join SkillFleet
      </h1>
      <p className="text-muted text-sm mb-8 text-center">
        Who are you signing up as?
      </p>

      <div className="grid grid-cols-1 gap-4">
        <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Link
            href="/signup/student"
            className="clay-card p-6 flex items-center gap-4 hover:border-primary/30 transition-colors block"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground text-lg">Student</h2>
              <p className="text-muted text-sm">Ages 13–18 with their own email</p>
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Link
            href="/signup/parent"
            className="clay-card p-6 flex items-center gap-4 hover:border-primary/30 transition-colors block"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent-teal/10 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-accent-teal" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground text-lg">Parent / Guardian</h2>
              <p className="text-muted text-sm">Enroll and track your child's growth</p>
            </div>
          </Link>
        </motion.div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 2: Create `src/app/(auth)/signup/student/page.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { signupStudentAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'

export default function StudentSignupPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signupStudentAction, undefined)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        Student sign up
      </h1>
      <p className="text-muted text-sm mb-6">
        Create your SkillFleet account
      </p>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="Arjun Sharma"
          />
        </div>

        <div>
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-foreground mb-1">
            Date of birth
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            required
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted mt-1">Minimum 8 characters</p>
        </div>

        {state?.error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create `src/app/(auth)/signup/parent/page.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { signupParentAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'

export default function ParentSignupPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signupParentAction, undefined)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        Parent sign up
      </h1>
      <p className="text-muted text-sm mb-6">
        Create your parent / guardian account
      </p>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
            Your full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="Priya Sharma"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
            Phone number <span className="text-muted font-normal">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="+91 98765 43210"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted mt-1">Minimum 8 characters</p>
        </div>

        {state?.error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 4: Create `src/app/(auth)/signup/parent/link-student/page.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { linkStudentAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'

export default function LinkStudentPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(linkStudentAction, undefined)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="clay-card p-8"
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        Link your child's account
      </h1>
      <p className="text-muted text-sm mb-6">
        Enter your child's SkillFleet account email. If they don't have one yet, ask them to sign up first.
      </p>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="student_email" className="block text-sm font-medium text-foreground mb-1">
            Child's email address
          </label>
          <input
            id="student_email"
            name="student_email"
            type="email"
            required
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            placeholder="child@example.com"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="clay-button w-full h-12 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Linking…' : 'Link account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/parent" className="text-primary font-semibold hover:underline">
          Skip for now → go to dashboard
        </Link>
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 5: Manually test all signup flows**

```bash
npm run dev
```

Test:
1. Navigate to http://localhost:3000/signup — role chooser appears
2. Click Student → http://localhost:3000/signup/student
3. Click Parent → http://localhost:3000/signup/parent
4. Sign up as student with valid data → redirects to `/onboarding` (404 is OK — that's Plan D)
5. Sign up as parent with valid data → redirects to `/signup/parent/link-student`

- [ ] **Step 6: Commit**

```bash
git add src/app/\(auth\)/signup/
git commit -m "feat: add signup pages (role chooser, student, parent, link student)"
```

---

## Task 11: Platform Layout Shell

**Files:**
- Create: `src/components/platform/platform-nav.tsx`
- Create: `src/app/(platform)/layout.tsx`

**Interfaces:**
- Consumes: `logoutAction` from `@/app/actions/auth`; `createClient()` from server for current user
- Produces: `/dashboard`, `/onboarding`, `/catalog`, `/booking`, `/parent` routes all wrapped in platform shell

- [ ] **Step 1: Create `src/components/platform/platform-nav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import {
  LayoutDashboard,
  Activity,
  BookOpen,
  ShoppingBag,
  Users,
  LogOut,
} from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import type { UserProfile } from '@/lib/types/database'

const studentNav = [
  { href: '/dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/profile',    label: 'Growth Profile',  icon: Activity },
  { href: '/catalog',    label: 'Explore',         icon: BookOpen },
  { href: '/bookings',   label: 'My Bookings',     icon: ShoppingBag },
]

const parentNav = [
  { href: '/parent',     label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/catalog',    label: 'Explore',         icon: BookOpen },
]

const adminNav = [
  { href: '/admin',      label: 'Admin',           icon: Users },
]

interface PlatformNavProps {
  profile: UserProfile
}

export function PlatformNav({ profile }: PlatformNavProps) {
  const pathname = usePathname()
  const navItems = profile.role === 'parent' ? parentNav
    : profile.role === 'admin' ? adminNav
    : studentNav

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-black/5 hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </div>

      <div className="px-3 pb-4 border-t border-black/[0.06] pt-3">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-foreground truncate">{profile.full_name}</p>
          <p className="text-xs text-muted capitalize">{profile.role}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
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

- [ ] **Step 2: Create `src/app/(platform)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PlatformNav } from '@/components/platform/platform-nav'

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Admin goes to admin layout
  if (profile.role === 'admin') redirect('/admin')

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col clay-card m-3 rounded-2xl overflow-hidden">
        <div className="px-4 py-5 border-b border-black/[0.06]">
          <Image
            src="/images/logo.webp"
            alt="SkillFleet"
            width={110}
            height={32}
            priority
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PlatformNav profile={profile} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create placeholder dashboard page to verify layout**

Create `src/app/(platform)/dashboard/page.tsx` temporarily:

```tsx
export default function DashboardPage() {
  return (
    <div className="clay-card p-8">
      <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="text-muted mt-2">Platform foundation is working. Plan D will build this out.</p>
    </div>
  )
}
```

- [ ] **Step 4: Manually test platform layout**

Log in as a student → should see sidebar with navigation links and the placeholder dashboard.

- [ ] **Step 5: Commit**

```bash
git add src/components/platform/platform-nav.tsx src/app/\(platform\)/layout.tsx src/app/\(platform\)/dashboard/page.tsx
git commit -m "feat: add platform layout shell with sidebar navigation"
```

---

## Task 12: Admin Layout Shell

**Files:**
- Create: `src/components/admin/admin-nav.tsx`
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/admin/page.tsx` (placeholder)

**Interfaces:**
- Consumes: `logoutAction`; user profile from Supabase
- Produces: `/admin` and all `/admin/*` routes wrapped in admin shell; non-admins get 403 redirect

- [ ] **Step 1: Create `src/components/admin/admin-nav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Sliders,
  FolderTree,
  HelpCircle,
  ClipboardList,
  Users,
  FileCheck,
  CheckSquare,
  LogOut,
} from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

const adminNavItems = [
  { href: '/admin',              label: 'Overview',         icon: LayoutDashboard, exact: true },
  { href: '/admin/parameters',   label: 'Parameters',       icon: Sliders },
  { href: '/admin/taxonomy',     label: 'Taxonomy',         icon: FolderTree },
  { href: '/admin/questionnaire',label: 'Questionnaire',    icon: HelpCircle },
  { href: '/admin/assessments',  label: 'Assessments',      icon: ClipboardList },
  { href: '/admin/users',        label: 'Users',            icon: Users },
  { href: '/admin/certificates', label: 'Certificates',     icon: FileCheck },
  { href: '/admin/completions',  label: 'Completions',      icon: CheckSquare },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 px-3 py-4 space-y-0.5">
        {adminNavItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-black/5 hover:text-foreground',
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

- [ ] **Step 2: Create `src/app/(admin)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Secure role check in layout — proxy only checks authentication
  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-black/[0.06]">
        <div className="px-4 py-5 border-b border-black/[0.06]">
          <Image
            src="/images/logo.webp"
            alt="SkillFleet Admin"
            width={110}
            height={32}
            priority
          />
          <span className="mt-1 block text-xs font-medium text-muted uppercase tracking-wider">
            Admin
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/(admin)/admin/page.tsx` (placeholder)**

```tsx
export default function AdminOverviewPage() {
  return (
    <div className="clay-card p-8">
      <h1 className="font-display text-3xl font-bold text-foreground">Admin Panel</h1>
      <p className="text-muted mt-2">Plan B will build the parameter management. Plan C will complete the admin panel.</p>
    </div>
  )
}
```

- [ ] **Step 4: Create an admin user for testing**

In the Supabase dashboard → Authentication → Users → Add user with email + password. Then run this SQL:

```sql
-- Replace with the actual user ID from Supabase Auth → Users
INSERT INTO user_profiles (id, role, full_name)
VALUES ('YOUR-ADMIN-USER-UUID', 'admin', 'Admin User');
```

- [ ] **Step 5: Manually test admin layout**

Log in as the admin user → should redirect to `/admin` with the admin sidebar.

Log in as a student and try to navigate to `/admin` → should redirect to `/` (403 block in layout).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/admin-nav.tsx src/app/\(admin\)/layout.tsx src/app/\(admin\)/admin/page.tsx
git commit -m "feat: add admin layout shell with role-gated sidebar"
```

---

## Plan A Self-Review

### Spec coverage

| Requirement | Covered in |
|---|---|
| Supabase schema — all tables | Task 2 |
| Seed data — 10 params, 5 levels, 4 age bands, baseline config | Task 3 |
| Storage bucket for cert uploads | Task 3 |
| RLS policies | Task 2 |
| TypeScript types for all tables | Task 4 |
| Browser Supabase client | Task 5 |
| Server Supabase client | Task 5 |
| Admin (service role) client | Task 5 |
| Route protection (proxy.ts — Next.js 16) | Task 6 |
| Auth callback (PKCE flow) | Task 7 |
| Login page + Server Action | Tasks 8–9 |
| Student signup page + Server Action | Tasks 8–10 |
| Parent signup page + Server Action | Tasks 8–10 |
| Parent ↔ student linking | Tasks 8–10 |
| Platform layout shell (sidebar) | Task 11 |
| Admin layout shell (role-gated) | Task 12 |

### What Plan A does NOT cover (by design)

- Scoring engine logic — Plan B
- Admin panel CRUD pages — Plan C
- Student Growth Profile, Onboarding, Catalog, Booking — Plan D

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-plan-a-foundation.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session using executing-plans

**Which approach?**
