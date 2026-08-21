# School Location Cascade — Design

**Status:** approved design, not yet planned or built
**Date:** 2026-08-21
**Scope:** the student details form only. This is sub-project 0 of the ISC build — a
prerequisite that also stands on its own as an onboarding improvement.

---

## Goal

Replace the free-text **School name** field in the student details form with a
State → District → School cascade backed by the real CBSE schools register, so that
every student is attached to an identifiable school rather than a string they typed.

## Why this comes first

ISC runs a **State Championship** round. The competition cannot allocate entries to a
state round, cap wildcards per school, or attach a coordinator to their students
(Decision 1 = Option B) while "school" is an unvalidated free-text field. Today two
students at the same school can type `DPS` and `Delhi Public School` and the platform
has no idea they are the same place.

## Non-goals

Out of scope for this spec — each is its own later piece of work:

- The ISC 2026 page, track cards, or any entry flow
- School coordinator accounts, login, join codes, or their dashboard
- The admin review queue UI for user-added schools (the *data* to support it is in
  scope; the screen is not)
- Backfilling or de-duplicating schools beyond the one-time CBSE import

---

## Source data

`cbse_schools_master.xlsx` — 33,151 rows, 13 columns, one sheet. Verified before
designing:

| Property | Finding |
|---|---|
| Blank state / district / name | **0** — data is complete on the fields we need |
| `Aff. No.` uniqueness | **Unique across all 33,151 rows** — usable as the natural key |
| States / UTs | 38 values, including a non-geographic `FOREIGN SCHOOLS` bucket |
| Districts | 766 distinct |
| Duplicate names within one district | **1,310 cases** |
| Largest district | Bengaluru Urban, 729 schools (~21 KB of JSON) |
| Full dataset as JSON | ~1.57 MB |

### Three findings that shaped the design

**1. School names are not unique within a district.** 38 schools are named
`GOVT BOYS SR SEC SCHOOL` in New Delhi alone; 33 are named
`SRI CHAITANYA TECHNO SCHOOL` in Bengaluru Urban. A picker showing names alone is
unusable, and storing the name as the link is wrong. Address disambiguates them:

```
GOVT BOYS SR SEC SCHOOL   Hari Nagar Ashram, New Delhi   aff 2754001
GOVT BOYS SR SEC SCHOOL   Jangpura, New Delhi            aff 2754009
GOVT BOYS SR SEC SCHOOL   Pandara Road, New Delhi        aff 2754016
```

**2. All 36 official states/UTs are present, but districts have real gaps.** At least
33 districts are missing, concentrated where CBSE has no affiliated schools:

| State | In file | Actual | Missing |
|---|---|---|---|
| Arunachal Pradesh | 20 | 26 | 6 |
| Assam | 30 | 35 | 5 |
| Manipur | 11 | 16 | 5 |
| Nagaland | 12 | 17 | 5 |
| Meghalaya | 8 | 12 | 4 |
| Chhattisgarh | 30 | 33 | 3 |
| Mizoram | 8 | 11 | 3 |
| Sikkim | 4 | 6 | 2 |

A hand-authored "complete" district list is not a safe fix — it would be transcribed
from memory and silently wrong. The escape hatch below covers it instead.

**3. The full dataset is too large to ship to the browser, but a single district is
not.** 1.57 MB versus 21 KB worst case. This is what makes instant client-side
filtering viable without a server round-trip per keystroke.

---

## Data model

### New table: `schools`

```sql
CREATE TABLE schools (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliation_no TEXT UNIQUE,                    -- CBSE Aff. No.; NULL for user-added
  name           TEXT NOT NULL,
  state          TEXT NOT NULL,
  district       TEXT NOT NULL,
  address        TEXT,
  pincode        TEXT,
  level          TEXT,                           -- Senior Secondary / Secondary / Middle
  source         TEXT NOT NULL DEFAULT 'cbse'    CHECK (source IN ('cbse','user_added')),
  review_status  TEXT NOT NULL DEFAULT 'approved'
                 CHECK (review_status IN ('approved','pending','rejected')),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX schools_state_district_idx ON schools (state, district)
  WHERE review_status = 'approved';
```

One index is enough. Every read is "give me this district's schools", which that index
serves; name matching happens in the browser afterwards. A trigram index for
server-side name search is deliberately **not** added — nothing in this design queries
that way. Add it if the admin review screen later needs cross-district name search.

`source` and `review_status` follow the pattern already used on `offerings` for
vendor-submitted content, so the admin review concept is not a new idea in this
codebase.

**Visibility rule.** Only `review_status = 'approved'` rows are offered in search.
A `pending` row stays linked to the student who created it — their profile works
immediately — but is not shown to anyone else until an admin approves it. This stops
one student's typo from becoming everyone's dropdown option.

### Changes to `user_profiles`

```sql
ALTER TABLE user_profiles
  ADD COLUMN school_id       UUID REFERENCES schools(id) ON DELETE SET NULL,
  ADD COLUMN school_state    TEXT,
  ADD COLUMN school_district TEXT;
```

`school_id` is the authoritative link. `school_state`, `school_district` and the
existing `school_name` are denormalised copies.

**Why denormalise:** ISC's state round needs to group students by state constantly,
and `school_name` is already denormalised on this table today, so this follows the
existing shape rather than introducing a second pattern. The cost is that an admin
edit to a `schools` row leaves stale copies on profiles — acceptable because school
records are near-static, and correctable with a resync query if it ever matters.

`city` is unchanged and stays alongside the new fields. A district can span several
towns, so it is not redundant.

---

## Import

A migration creates the schema. A separate, idempotent script loads the data —
32,882 rows is too much to reasonably hold in a migration file.

- **Excluded:** the 269 `FOREIGN SCHOOLS` rows. ISC is a national competition with
  state-level rounds, and a "Foreign Schools" pseudo-state cannot be placed in one.
- **Result:** 32,882 schools · 36 states/UTs · 740 districts. (37 raw values become
  36 once the two legacy UT entries are merged — see below.)
- **Idempotency:** `ON CONFLICT (affiliation_no) DO UPDATE` so re-running is safe.

### Normalisation applied on import

Source data is ALL CAPS with legacy spellings. Store display-ready values:

| Source | Stored |
|---|---|
| `CHATTISGARH` | Chhattisgarh |
| `TAMILNADU` | Tamil Nadu |
| `ANDAMAN & NICOBAR` | Andaman & Nicobar Islands |
| `JAMMU & KASHMIR` | Jammu & Kashmir |
| `DADAR & NAGAR HAVELI` + `DAMAN & DIU` | Dadra & Nagar Haveli and Daman & Diu |
| `PM SHRI KENDRIYA VIDYALAYA NO.I` | PM Shri Kendriya Vidyalaya No.I |

The last two rows are judgement calls worth noting:

- **The UT merge** reflects the 2020 legal merger of the two territories (and fixes
  `DADAR` → `DADRA`, a source typo). Affects 43 schools. The merged UT keeps three
  districts — Dadra and Nagar Haveli, Daman, Diu — which is correct for the real UT.
- **Title-casing** is a display improvement, but it must not mangle acronyms. `DAV`,
  `KV`, `St.`, roman numerals and similar need a preserve-list; a naive
  `.title()` produces `Dav`, `Kv`. Search must be case-insensitive regardless, so
  casing never affects matching.

---

## Form behaviour

Field order, as agreed:

```
Class / Grade  →  State  →  District  →  School name  →  City  →  Parent's mobile
```

### The cascade

| Field | Locked until | Control |
|---|---|---|
| State | — | Searchable dropdown, 36 options |
| District | a state is chosen | Searchable dropdown, that state's districts |
| School name | a district is chosen | Search-as-you-type over that district's schools |

A locked field is visibly disabled and says why — *"Select a state first"* — rather
than silently doing nothing. Changing a parent field clears its children.

### School search

On district selection, fetch that district's approved schools once (~21 KB worst
case) and filter in the browser as the student types. No debounced request per
keystroke; the list narrows instantly.

Each result renders on two lines, because names alone are ambiguous:

```
┌────────────────────────────────────────┐
│ Govt Boys Sr Sec School                │
│ Hari Nagar Ashram, New Delhi           │
├────────────────────────────────────────┤
│ Govt Boys Sr Sec School                │
│ Jangpura, New Delhi                    │
├────────────────────────────────────────┤
│ + My school isn't listed               │
└────────────────────────────────────────┘
```

Matching is case-insensitive and matches on any word boundary, so `sec school`,
`govt boys`, and `boys sr` all find the row above.

### Escape hatches

**"My school isn't listed"** — always the last option in the school dropdown. Reveals
a text input. On submit, creates a `schools` row with `source = 'user_added'`,
`review_status = 'pending'`, `created_by = <student>`, and the already-chosen state
and district. The student proceeds immediately; an admin reconciles later.

**"My district isn't listed"** — last option in the district dropdown, needed because
of the district gaps documented above. Reveals a text input for the district, and
forces the school field into manual mode too (by definition there are no schools to
list). Produces the same `pending` school row, with the typed district.

Both hatches are deliberate dead-ends into the same review queue, so an admin sees
one list of things to fix rather than two.

---

## Existing students

There are 10 today, with values like `DPS`, `VPMS`, `Delhi Public School`. None can
be matched to a `schools` row reliably — `DPS` alone is ambiguous across hundreds of
Delhi Public Schools nationally. They are re-collected rather than guessed.

**Mechanism — reuse the gate that already exists.** `isStudentDetailsComplete()` in
`src/lib/profile/details.ts` is already the single source of truth for "has this
student given their required details", and the platform layout, login action and
onboarding page all redirect on it. Adding `school_state` and `school_district` to
that check automatically routes every existing student to `/onboarding/details` on
their next page load, because those columns are null for all of them. No separate
migration flow, no new redirect logic.

The form shows their previous free-text value as a hint while they re-pick, so they
know what they had entered before:

> Previously entered: **DPS** — please find your school in the list below.

---

## Validation

Server-side, in the details action — client-side disabling is a convenience, not a
guarantee:

- `school_state` must be a known state, or accompany a `user_added` school
- `school_district` must belong to the chosen state, or accompany a `user_added` school
- `school_id` must exist, and its state/district must match what was submitted
- A manual school name must be non-empty and ≤ 100 characters (the longest real name
  in the source is 100)
- Existing class/branch, city and mobile validation is unchanged

---

## Testing

**Unit** (Vitest, alongside the existing `src/lib/profile/__tests__/details.test.ts`):

- `isStudentDetailsComplete` — false when state or district is missing, true when
  complete; this is the mechanism that re-gates existing users, so it is the highest
  value test here
- Title-casing preserves `DAV`, `KV`, `St.`, roman numerals; does not produce `Dav`
- Search matching is case-insensitive and matches on word boundaries
- Validation rejects a district that does not belong to the submitted state

**Integration** (against the live DB, in a rolled-back transaction — the pattern used
throughout this project):

- Import is idempotent: running twice leaves 32,882 rows, not 65,764
- A `pending` user-added school is not returned by district search for another student
- RLS: a student can read approved schools; only an admin can approve one

**Manual:** the cascade locks and clears correctly; both escape hatches produce a
`pending` row; an existing student is redirected once and only once.

---

## Notes for the implementer

- `AGENTS.md` applies: this Next.js version has breaking changes from training data.
  Read the relevant guide in `node_modules/next/dist/docs/` before writing code.
- No new Postgres extension is needed.
- Migration numbering continues from `0044`.
- Supabase MCP is disconnected; migrations are applied via the Management API helper
  script used throughout this session.
