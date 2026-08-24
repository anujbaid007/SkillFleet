# Coordinator Signup & Dashboard — Design

**Status:** approved design, not yet planned or built
**Date:** 2026-08-22
**Scope:** a new `coordinator` account type — signup, school claim, admin approval, and a
roster dashboard. First piece of the actual ISC build (sub-project after the schools
directory and its review queue).

---

## Goal

Let a teacher sign up as their school's official coordinator, claim their school from the
directory we already built, and — once an admin approves the claim — see a roster of every
student already linked to that school.

## Why this exists, and what changed since we first discussed it

We originally designed a coordinator "join code" (`XAVR-2026`) because, at the time, a
coordinator's signup was the *only* way a school got created. That's no longer true: the
CBSE schools directory and its `State → District → School` cascade now exist, and every
student already links to a real `schools.id`. So a coordinator doesn't need to hand out a
code — they need to be **linked to the same school row** a coordinator's students already
picked. The roster falls out of a query, not a code system.

## Non-goals

Explicitly out of scope — none of this exists yet, and the dashboard is designed to not
need it to ship something real today:

- ISC track entries, submissions, or judging (sub-project 2+). The dashboard's Attempt
  Status / Qualify Status columns are placeholders until that exists.
- The ISC 2026 landing page or any track screen.
- Puzzle Master — Skill Fleet has said the sponsor (Brainweave) is expected to design and
  host that track's screen; revisit once that's confirmed.
- Multiple coordinators per school. The source document says a school "appoints an
  official coordinator" — singular. One active coordinator per school for v1; an admin can
  reassign by rejecting the current claim.

---

## Why signup is two steps, not one

The form we agreed on — name/email/password/phone, then school, board, and student
count — cannot all be submitted in one `auth.signUp()` call the way student signup does
for the family fields. The reason is concrete, not stylistic:

`resolveSchoolId()` and `add_pending_school()` both require `auth.uid()` — they run as the
signed-in coordinator, so they can defend against a tampered submission (checking a picked
school's state/district actually match, exactly as they already do for students). Before
the account exists, there is no `auth.uid()` to check against. Cramming school-resolution
logic into the `handle_new_user()` trigger would mean re-implementing that same defensive
check in a second place in SQL — a second copy of logic that's already written and tested.

So this mirrors a pattern already in the codebase: **student signup itself works the same
way** — `handle_new_user()` creates the account and family from metadata, and school
selection happens afterward, once logged in, on `/onboarding/details`. Coordinator signup
follows the identical shape:

1. `/signup/coordinator` — creates the account (`role = 'coordinator'`).
2. `/onboarding/coordinator` — school, board, student count. Submitted through the same
   `resolveSchoolId()` a student's account page already uses, plus a new RPC that turns the
   resolved school into a claim.

Nothing about the fields or the coordinator's experience changes — it's still one
continuous journey. Only the plumbing follows the pattern that's already proven correct.

---

## Data model

### `user_profiles.role`

Check constraint widens to `'student', 'admin', 'vendor', 'coordinator'`.

### `schools` gains four columns

```sql
ALTER TABLE schools
  ADD COLUMN coordinator_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN coordinator_status   TEXT NOT NULL DEFAULT 'none'
                                   CHECK (coordinator_status IN ('none','pending','approved','rejected')),
  ADD COLUMN board                TEXT,
  ADD COLUMN student_count_range  TEXT;
```

**Board is backfilled, not asked twice.** The entire CBSE directory is, by definition,
CBSE — asking a coordinator to confirm the board of a school we already know is CBSE would
be redundant. On migration: `UPDATE schools SET board = 'CBSE' WHERE source = 'cbse'`.
The board field in the coordinator's form pre-fills from this when it exists, and stays
editable — the coordinator is the authoritative human here, and any change they make is
visible to the admin at claim-review time regardless.

This pre-fill needs one small addition: `getSchoolsAction`'s `SchoolOption` currently
returns `{ id, name, address, pincode }` — it needs `board` added so the client can fill
the field the moment a school is picked, with no second round trip. A freshly created
school (via the escape hatch) simply has no `board` to pre-fill from, which is correct —
the coordinator is telling us for the first time.

**A rejected claim doesn't lock the school.** `apply_as_coordinator` accepts a new claim
when `coordinator_status` is `'none'` or `'rejected'` — a decline just means someone else
(or the same person, corrected) can try again, the same shape as a declined family-join
request keeping its own account rather than being stuck.

---

## Signup — Step 1: the account

`/signup/coordinator`, under the existing `(auth)` route group so it shares the same
layout as `/login` and `/signup`. Fields: full name, email, password, phone. No date of
birth, no family — a coordinator is an adult signing up for themselves.

`handle_new_user()` gains a branch: when `raw_user_meta_data->>'signup_type' = 'coordinator'`,
skip the family-creation logic entirely and insert `role = 'coordinator'` instead of the
hardcoded `'student'`. `family_id` stays `NULL` — every function that reads it
(`my_family_id()`, `same_family()`, and everything built on them) already treats a `NULL`
family as "not in a family," so a coordinator existing outside the family system requires
no other change.

On success, same as student signup: if email confirmation is required, show "check your
inbox"; otherwise sign in and continue to Step 2.

## Signup — Step 2: the school

`/onboarding/coordinator`. The same `SchoolLocationFields` cascade component every student
already uses (State → District → School, including the "isn't listed" escape hatch), plus
the two new fields directly beneath it, since they describe the school, not the
coordinator:

- **Board of School** — the same `SearchableSelect`, options `CBSE`, `ICSE / ISC`,
  `State Board`, `IB (International Baccalaureate)`, `IGCSE / Cambridge`, `NIOS`, with a
  final "Other" option that reveals free text — the same escape-hatch shape as the
  district and school fields.
- **Total number of students** — a plain `<select>` (short, fixed list, no search needed —
  same reasoning that kept Class/Grade a native select): `1–100`, `101–300`, `301–600`,
  `601–1,000`, `1,000+`.

Submitting calls `resolveSchoolId()` (unchanged, already handles both a picked school and
a typed-in one), then a new RPC:

```sql
apply_as_coordinator(p_school_id UUID, p_board TEXT, p_student_count_range TEXT) → TEXT
```

- Confirms the caller's own `role = 'coordinator'`.
- Refuses with `'already_has_coordinator'` if the school has a `pending` or `approved`
  claim belonging to a **different** `auth.uid()`. The same coordinator calling again —
  correcting the board or student count before it's reviewed — updates their own pending
  claim in place rather than being refused.
- Otherwise sets `coordinator_id = auth.uid()`, `coordinator_status = 'pending'`, and the
  submitted `board` / `student_count_range` (the coordinator's submission is authoritative,
  not merely a fallback for a blank field).

The coordinator lands on a **"Your application is under review"** screen — visually the
same pattern as the existing family pending-approval banner, reworded for this context.

---

## Admin review — extending the page we already built, not a new one

Two cases, because a claim can attach to a school in two different states:

**Case A — claiming a school that is itself still pending.** The coordinator typed in a
school the directory didn't have. This shows as a coordinator block *inside the existing
pending-school row* on `/admin/schools`, alongside the school's own approve / reject /
merge controls. The two decisions stay independent — an admin can approve the school while
rejecting this particular claim on it (say, the person doesn't seem to be from that
school), so they are two separate action blocks in one row, not one combined button.

**Case B — claiming a school that is already approved** (any of the 32,882 CBSE schools).
There's no school-level decision to attach this to, so it appears in a new second section
on the same page: **"Coordinator applications."**

New RPC, mirroring `admin_review_school` exactly:

```sql
admin_review_coordinator_claim(p_school_id UUID, p_decision TEXT, p_notes TEXT) → TEXT
```

`approve` sets `coordinator_status = 'approved'`. `reject` requires a reason (same rule as
rejecting a school) and resets `coordinator_id = NULL`, `coordinator_status = 'none'` — a
clean slate, not a permanent mark against the school.

---

## The coordinator's own view

One RPC drives all three states, `get_my_coordinator_school()`:

```sql
RETURNS TABLE (school_id UUID, school_name TEXT, coordinator_status TEXT, review_notes TEXT)
```

- **`pending`** → the waiting screen.
- **`rejected`** → the admin's reason, with a way back into `/onboarding/coordinator` to
  correct and resubmit.
- **`approved`** → the real dashboard: `get_school_roster()` returns every `role =
  'student'` profile whose `school_id` matches, grouped by class using the same
  `CLASS_OPTIONS` order the rest of the app already sorts by. The explicit role filter is
  defensive — nothing else sets `school_id` for a non-student today, but the function
  shouldn't rely on that staying true by accident.

Per student: name, class, and two columns that are real UI today but placeholder data —
**Attempt Status** and **Qualify Status** both read *"Opens when ISC 2026 launches."* No
rework needed later; they start populating the moment entries and judging exist.

This ships real value on day one regardless: a coordinator can see *"142 students from
your school are already on SkillFleet"* — true today, independent of ISC.

Both RPCs are `SECURITY DEFINER`, the same reason `get_family_students` and
`get_my_family` are — a coordinator has no RLS-visible reason to read other students'
profiles directly, so the function checks authorization once, explicitly, rather than
leaning on a row policy.

---

## Routing and layout

A new `(coordinator)` route group, mirroring `(vendor)` exactly: its own `layout.tsx`
guarding on `role === 'coordinator'`, its own nav. `(platform)/layout.tsx` gains one more
line alongside its existing admin/vendor redirects:

```ts
if (profile.role === 'coordinator') redirect('/coordinator')
```

## Discoverability

A single line on `/login`, the same weight as the existing student-signup link — *"Are you
a school coordinator? Apply here"* — linking to `/signup/coordinator`. Not a primary call
to action; this is a rare account type next to the main student flow.

---

## Testing

**Unit** — `parseSchoolSelection`/`validateSchoolSelection` are already tested and unchanged;
new coverage needed for whatever board/student-count validation lands in the server action
(non-empty checks, valid option membership).

**Integration**, against the live DB in a rolled-back transaction, the pattern used
throughout this project:

- Signing up with `signup_type = 'coordinator'` produces `role = 'coordinator'`, `family_id
  IS NULL` — confirms the trigger branch actually took.
- `apply_as_coordinator` on a school with no existing claim succeeds; on one with an
  `approved` claim from someone else, returns `already_has_coordinator`.
- `admin_review_coordinator_claim` reject resets `coordinator_id` to `NULL` and a second
  `apply_as_coordinator` from a different user then succeeds — proves a rejection doesn't
  lock the school.
- `get_school_roster()` returns nothing for a `pending` coordinator and the real roster for
  an `approved` one — proves the gate is enforced at the RPC, not just the UI.
- A non-admin calling `admin_review_coordinator_claim` gets `forbidden`.

**Manual:** the two-step signup end to end; the admin queue shows Case A (inline) and Case
B (new section) correctly for two differently-seeded claims; the coordinator's own view
transitions pending → rejected → resubmit → approved → real roster.
