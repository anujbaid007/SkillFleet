# ISC Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/admin/isc` and `/coordinator` from lists into analytics pages — geography, schools, classes, boards, timeline, stale drafts and CSV export for the admin; participation, per-track breakdown, nudge lists and a deadline countdown for the coordinator.

**Architecture:** Every number is computed by a pure function in `src/lib/` that takes plain arrays and returns plain rows, so the aggregation is unit-testable without a database. The pages stay server components that fetch rows through existing RLS-protected tables and hand them to those functions. **No migration is needed:** the `isc_entries_read` policy from `0048_isc_entries.sql` already grants an approved coordinator read access to their own school's entries, so the coordinator page can query `isc_entries` directly instead of extending `get_school_roster()`.

**Tech Stack:** Next.js 16 App Router (server components, `searchParams: Promise<…>`), TypeScript, Supabase JS client, Vitest, Tailwind v4 with the project's clay design tokens.

**Spec:** `docs/superpowers/specs/2026-08-24-isc-2026-entries-design.md` — the ISC entries design this analytics layer reports on. The analytics scope itself was agreed in conversation on 2026-08-25 and is restated in full under "Scope" below.

## Global Constraints

- **Never push, never touch `main`.** All work stays on `feature/nikhil`.
- **Supabase project `bbioktywqkfvpzmakdxt` only.** Never the `happyfleet` project.
- **`supabase/` is gitignored.** This plan adds no migration; if one ever became necessary it would be applied through `sbq.ps1` and never `git add`ed.
- **Read `node_modules/next/dist/docs/` before writing App Router code.** This is not the Next.js in your training data. `params` and `searchParams` are `Promise<{…}>` and must be awaited.
- **Server actions may only export async functions.** Pure helpers belong in `src/lib/`, never in a `'use server'` module.
- **Read is RLS, write is RPC.** No new write paths are introduced here; both pages are read-only.
- **Tests are Vitest.** Run with `npm test`. Test files live in a `__tests__` folder beside the code, named `<module>.test.ts`.
- **Type-check with `npx tsc --noEmit`** before each commit. It must be clean.
- **Dates are IST.** Every "day" an admin or coordinator sees is an `Asia/Kolkata` calendar day, never a UTC one — the whole audience is in India, and a 05:00 IST submission must not land on the previous day.
- **Class eligibility is Classes 5–12**, expressed only through `isEligibleClass()` from `src/lib/isc/validate.ts`. Never re-derive it from a hardcoded list.
- **Copy rules:** sentence case, plain verbs, no exclamation marks. A draft is never described as an entry — the agreed vocabulary is "Draft — not entered" vs "Entered".

## Scope

**Admin `/admin/isc` gains:**

1. Filter by state and by district
2. Top-schools table (entries / submitted / participating students)
3. Geographic table (state → schools, entries, submitted)
4. Class distribution across Classes 5–12
5. Board split (CBSE / ICSE / State / not recorded)
6. Submission timeline (submissions per IST day)
7. Not-submitted watchlist (drafts untouched for 7+ days)
8. CSV export of the currently filtered view

**Coordinator `/coordinator` gains:**

1. Stat tiles: students from the school on SkillFleet, how many have entered, total entries, submitted vs draft
2. Per-track breakdown of that school's entries
3. "Needs a nudge": eligible students sitting on a draft, and eligible students who have not entered at all
4. Class-wise participation across Classes 5–12
5. Roster search and filter
6. Deadline countdown per track

**Plus one data-quality fix (Task 1)** that the analytics depend on: `readSubmission` currently writes *every* field of a track on every save, storing `""` for fields the student never filled. That is how a submitted entry ended up carrying `language: ""`, which the existing "By language" panel would count as a real value. The stored rows were cleaned by hand already; this task stops the code re-creating them.

## File Structure

**New — pure libraries (no I/O, fully unit-tested):**

- `src/lib/isc/dates.ts` — IST calendar-day helpers. Owned separately so both `analytics.ts` and `validate.ts` can use them without a cycle.
- `src/lib/isc/submission.ts` — reads a posted `FormData` into a submission object. Moved out of the `'use server'` module so it can be tested.
- `src/lib/isc/analytics.ts` — admin aggregations over a flattened entry shape.
- `src/lib/isc/csv.ts` — CSV serialisation, including spreadsheet-formula neutralisation.
- `src/lib/coordinator/analytics.ts` — coordinator aggregations over the roster and the school's entries.

**New — components:**

- `src/components/admin/isc-insights.tsx` — the six admin insight panels (server, presentational).
- `src/components/admin/isc-export.tsx` — client "Download CSV" button.
- `src/components/coordinator/coordinator-stats.tsx` — tiles, per-track breakdown, class participation, deadline countdown.
- `src/components/coordinator/needs-nudge.tsx` — the two nudge lists.

**Modified:**

- `src/app/actions/isc.ts` — use the extracted `readSubmission`; add `getIscDeadlines()`.
- `src/app/(admin)/admin/isc/page.tsx` — widen the fetch (district, board, every participant's class), build `AnalyticsEntry[]`, render insights, honour the new filters, mount the export button.
- `src/components/admin/isc-entry-row.tsx` — carry `schoolDistrict` on the row type.
- `src/components/admin/isc-filters.tsx` — state and district selects.
- `src/app/(coordinator)/coordinator/page.tsx` — fetch entries and deadlines, render the analytics.
- `src/components/coordinator/school-roster.tsx` — becomes a client component with search and filters.
- `src/lib/isc/validate.ts` — add `countdownLabel()` beside `isTrackLocked()`, its sibling concern.

---

### Task 1: Stop storing answers the student never gave

An empty answer is absence of data, not a value. Writing `""` into the submission JSONB makes every submission-derived statistic wrong: the language panel counts a blank as a language, and the admin detail view prints an empty row for a field nobody touched.

Extracting the function out of `src/app/actions/isc.ts` is required, not cosmetic: a `'use server'` module may only export async functions, so a synchronous helper living there can never be unit-tested.

**Files:**

- Create: `src/lib/isc/submission.ts`
- Create: `src/lib/isc/__tests__/submission.test.ts`
- Modify: `src/app/actions/isc.ts` (delete the module-private `readSubmission`, import the new one)

**Interfaces:**

- Consumes: `TRACK_FIELDS`, `IscTrackId` from `@/lib/isc/tracks`
- Produces: `readSubmission(track: IscTrackId, formData: FormData): Record<string, string>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/isc/__tests__/submission.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readSubmission } from '../submission'

function form(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

describe('readSubmission', () => {
  it('reads the fields the track defines', () => {
    const out = readSubmission(
      'content_creator',
      form({
        video_url: 'https://youtu.be/abc',
        title: 'My film',
        theme_note: 'It answers the theme.',
        language: 'English',
      })
    )
    expect(out).toEqual({
      video_url: 'https://youtu.be/abc',
      title: 'My film',
      theme_note: 'It answers the theme.',
      language: 'English',
    })
  })

  it('omits fields the student left blank rather than storing an empty string', () => {
    const out = readSubmission('content_creator', form({ title: 'My film', language: '' }))
    expect(out).toEqual({ title: 'My film' })
    expect('language' in out).toBe(false)
    expect('video_url' in out).toBe(false)
  })

  it('treats whitespace as blank', () => {
    const out = readSubmission(
      'content_creator',
      form({ title: '   ', video_url: '  https://x.example.com  ' })
    )
    expect(out).toEqual({ video_url: 'https://x.example.com' })
  })

  it('ignores posted keys the track does not define', () => {
    const out = readSubmission(
      'content_creator',
      form({ title: 'My film', intent: 'submit', entry_id: 'abc' })
    )
    expect(out).toEqual({ title: 'My film' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/submission.test.ts`
Expected: FAIL with `Failed to resolve import "../submission"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/isc/submission.ts`:

```ts
import { TRACK_FIELDS, type IscTrackId } from '@/lib/isc/tracks'

/**
 * Reads the posted fields for a track into a plain submission object.
 *
 * Blank fields are omitted, not stored as "". An empty string is a value, and
 * storing one makes every count drawn from the submission wrong — a language
 * panel counts the blank as a language, and the admin detail view prints a row
 * for a field the student never touched. Absence is the honest representation.
 *
 * Safe for the edit history: isc_submission_diff() compares
 * COALESCE(submission ->> key, ''), so a missing key and an empty string are
 * already indistinguishable to it. Clearing a field still records a real
 * revision from its old value to ''.
 */
export function readSubmission(track: IscTrackId, formData: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const spec of TRACK_FIELDS[track]) {
    const value = ((formData.get(spec.key) as string) ?? '').trim()
    if (value) out[spec.key] = value
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/isc/__tests__/submission.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into the server action**

In `src/app/actions/isc.ts`, delete this block entirely:

```ts
/** Reads the posted fields for a track into a plain submission object. */
function readSubmission(track: IscTrackId, formData: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const spec of TRACK_FIELDS[track]) {
    out[spec.key] = ((formData.get(spec.key) as string) ?? '').trim()
  }
  return out
}
```

Then change the import at the top of the file from:

```ts
import { TRACK_FIELDS, trackById, trackBySlug, type IscTrackId } from '@/lib/isc/tracks'
```

to:

```ts
import { trackById, trackBySlug, type IscTrackId } from '@/lib/isc/tracks'
import { readSubmission } from '@/lib/isc/submission'
```

`TRACK_FIELDS` is no longer referenced anywhere in that file. `IscTrackId` still is, in `IscEntryDetail`.

- [ ] **Step 6: Type-check and run the whole suite**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm test`
Expected: all tests pass. If `tsc` reports `'TRACK_FIELDS' is declared but its value is never read`, the import edit in Step 5 was not applied.

- [ ] **Step 7: Commit**

```bash
git add src/lib/isc/submission.ts src/lib/isc/__tests__/submission.test.ts src/app/actions/isc.ts
git commit -m "fix: stop storing blank ISC answers as empty strings"
```

---

### Task 2: IST calendar-day helpers

Every date shown on either page is an Indian calendar day. `new Date().toISOString().slice(0, 10)` would put a 05:00 IST submission on the previous day, and a per-day timeline built that way is quietly wrong for the first five and a half hours of every day.

**Files:**

- Create: `src/lib/isc/dates.ts`
- Create: `src/lib/isc/__tests__/dates.test.ts`

**Interfaces:**

- Consumes: nothing
- Produces:
  - `istDay(value: string | Date): string` — `YYYY-MM-DD` in `Asia/Kolkata`, or `''` when the value cannot be parsed
  - `istDaysBetween(from: Date, to: Date): number` — whole IST calendar days from `from` to `to`; negative when `to` is earlier
  - `formatIstDay(day: string): string` — a `YYYY-MM-DD` day as `1 Sep 2026`, or the input unchanged if it is not that shape

- [ ] **Step 1: Write the failing test**

Create `src/lib/isc/__tests__/dates.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { istDay, istDaysBetween, formatIstDay } from '../dates'

describe('istDay', () => {
  it('returns the Indian calendar day, not the UTC one', () => {
    // 23:30 UTC on 31 Aug is 05:00 IST on 1 Sep.
    expect(istDay('2026-08-31T23:30:00Z')).toBe('2026-09-01')
  })

  it('keeps a mid-day UTC timestamp on the same day', () => {
    expect(istDay('2026-09-01T09:00:00Z')).toBe('2026-09-01')
  })

  it('accepts a Date as well as a string', () => {
    expect(istDay(new Date('2026-08-31T23:30:00Z'))).toBe('2026-09-01')
  })

  it('returns an empty string for junk rather than throwing', () => {
    expect(istDay('not a date')).toBe('')
    expect(istDay('')).toBe('')
  })
})

describe('istDaysBetween', () => {
  it('counts whole calendar days', () => {
    expect(istDaysBetween(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-08T00:00:00Z'))).toBe(
      7
    )
  })

  it('is zero within the same Indian day', () => {
    expect(
      istDaysBetween(new Date('2026-09-01T05:00:00Z'), new Date('2026-09-01T18:00:00Z'))
    ).toBe(0)
  })

  it('crosses the Indian midnight, not the UTC one', () => {
    // 10:00 UTC on 1 Sep is 15:30 IST on 1 Sep; 23:00 UTC is 04:30 IST on 2 Sep.
    expect(
      istDaysBetween(new Date('2026-09-01T10:00:00Z'), new Date('2026-09-01T23:00:00Z'))
    ).toBe(1)
  })

  it('is negative when the second date is earlier', () => {
    expect(istDaysBetween(new Date('2026-09-08T00:00:00Z'), new Date('2026-09-01T00:00:00Z'))).toBe(
      -7
    )
  })
})

describe('formatIstDay', () => {
  it('reads as a date a person would say out loud', () => {
    expect(formatIstDay('2026-09-01')).toBe('1 Sep 2026')
  })

  it('passes anything that is not a day string straight through', () => {
    expect(formatIstDay('')).toBe('')
    expect(formatIstDay('later')).toBe('later')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/dates.test.ts`
Expected: FAIL with `Failed to resolve import "../dates"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/isc/dates.ts`:

```ts
/**
 * IST calendar days.
 *
 * Every date either analytics page shows is an Indian calendar day. Slicing an
 * ISO string would put an 05:00 IST submission on the previous day, so a
 * per-day timeline built that way is wrong for the first five and a half hours
 * of every single day.
 *
 * Kept in its own module so both analytics.ts and validate.ts can use it
 * without importing each other.
 */

// en-CA formats as YYYY-MM-DD, which sorts lexicographically. Constructed once:
// Intl.DateTimeFormat is expensive and this is called per row.
const IST_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Already-collapsed day strings are parsed back as UTC midnight, so this
// formatter reads them in UTC. Re-applying the IST offset here would shift
// them a day.
const IST_LABEL = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** The Indian calendar day a moment falls on, as YYYY-MM-DD. '' if unparseable. */
export function istDay(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return IST_DAY.format(date)
}

/**
 * Whole Indian calendar days from `from` to `to`. Negative when `to` is
 * earlier. Both ends are collapsed to their day first, so 23:55 to 00:05 the
 * next morning is one day, not zero.
 */
export function istDaysBetween(from: Date, to: Date): number {
  const a = istDay(from)
  const b = istDay(to)
  if (!a || !b) return 0
  // Parsed back as UTC midnights: the arithmetic is then plain day counting
  // with no offset left in it, and independent of the runtime's own zone.
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** '2026-09-01' -> '1 Sep 2026'. Anything else is returned unchanged. */
export function formatIstDay(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day
  const parsed = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return day
  return IST_LABEL.format(parsed)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/isc/__tests__/dates.test.ts`
Expected: PASS, 11 tests.

If `formatIstDay` returns `1 Sept 2026` rather than `1 Sep 2026`, this Node build's ICU data uses the four-letter September abbreviation. Change the expectation to match what it actually emits and leave a comment saying why — do not hand-roll a month table to force the shorter form.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no output.

```bash
git add src/lib/isc/dates.ts src/lib/isc/__tests__/dates.test.ts
git commit -m "feat: IST calendar-day helpers for ISC analytics"
```

---

### Task 3: Admin analytics aggregations

The six admin panels are all counts over the same flattened row. Defining that row once, and every aggregation as a pure function over an array of it, keeps the page a fetch-and-render and makes every number testable without a database.

**Files:**

- Create: `src/lib/isc/analytics.ts`
- Create: `src/lib/isc/__tests__/analytics.test.ts`

**Interfaces:**

- Consumes: `IscTrackId` from `@/lib/isc/tracks`; `CLASS_OPTIONS` from `@/lib/profile/details`; `istDay`, `istDaysBetween` from `@/lib/isc/dates`
- Produces:
  - `interface AnalyticsEntry` — the flattened row every aggregation takes
  - `interface CountRow { label: string; count: number }`
  - `interface SchoolRow`, `interface StateRow`, `interface TimelinePoint`
  - `topSchools(entries: AnalyticsEntry[], limit?: number): SchoolRow[]`
  - `byState(entries: AnalyticsEntry[]): StateRow[]`
  - `byBoard(entries: AnalyticsEntry[]): CountRow[]`
  - `classDistribution(entries: AnalyticsEntry[], classByStudent: Map<string, string | null>): CountRow[]`
  - `submissionTimeline(entries: AnalyticsEntry[]): TimelinePoint[]`
  - `staleDrafts(entries: AnalyticsEntry[], now: Date, days?: number): AnalyticsEntry[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/isc/__tests__/analytics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  topSchools,
  byState,
  byBoard,
  classDistribution,
  submissionTimeline,
  staleDrafts,
  type AnalyticsEntry,
} from '../analytics'

function entry(over: Partial<AnalyticsEntry> = {}): AnalyticsEntry {
  return {
    entryId: 'e1',
    track: 'ai_for_impact',
    status: 'submitted',
    schoolId: 's1',
    schoolName: 'Delhi Public School',
    state: 'Delhi',
    district: 'New Delhi',
    board: 'CBSE',
    submittedAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T09:00:00Z',
    studentIds: ['u1'],
    ...over,
  }
}

describe('topSchools', () => {
  it('counts entries, submissions and distinct students per school', () => {
    const rows = topSchools([
      entry({ entryId: 'a', studentIds: ['u1', 'u2'] }),
      entry({ entryId: 'b', track: 'content_creator', status: 'draft', studentIds: ['u2'] }),
      entry({ entryId: 'c', schoolId: 's2', schoolName: 'Kendriya Vidyalaya', studentIds: ['u9'] }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      schoolName: 'Delhi Public School',
      entries: 2,
      submitted: 1,
      students: 2,
    })
  })

  it('ranks by submissions first, then by entries', () => {
    const rows = topSchools([
      entry({ entryId: 'a', schoolId: 's1', schoolName: 'One', status: 'draft' }),
      entry({ entryId: 'b', schoolId: 's1', schoolName: 'One', status: 'draft' }),
      entry({ entryId: 'c', schoolId: 's2', schoolName: 'Two', status: 'submitted' }),
    ])
    expect(rows.map((r) => r.schoolName)).toEqual(['Two', 'One'])
  })

  it('honours the limit', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      entry({ entryId: `e${i}`, schoolId: `s${i}`, schoolName: `School ${i}` })
    )
    expect(topSchools(many, 5)).toHaveLength(5)
  })
})

describe('byState', () => {
  it('counts distinct schools, entries and submissions per state', () => {
    const rows = byState([
      entry({ entryId: 'a', schoolId: 's1', state: 'Delhi' }),
      entry({ entryId: 'b', schoolId: 's2', state: 'Delhi', status: 'draft' }),
      entry({ entryId: 'c', schoolId: 's3', state: 'Kerala' }),
    ])
    expect(rows[0]).toEqual({ state: 'Delhi', schools: 2, entries: 2, submitted: 1 })
    expect(rows[1]).toEqual({ state: 'Kerala', schools: 1, entries: 1, submitted: 1 })
  })

  it('labels a missing state rather than dropping the entry', () => {
    const rows = byState([entry({ state: '' })])
    expect(rows[0].state).toBe('Unknown')
  })
})

describe('byBoard', () => {
  it('counts entries per board, largest first', () => {
    const rows = byBoard([
      entry({ entryId: 'a', board: 'CBSE' }),
      entry({ entryId: 'b', board: 'ICSE' }),
      entry({ entryId: 'c', board: 'CBSE' }),
    ])
    expect(rows).toEqual([
      { label: 'CBSE', count: 2 },
      { label: 'ICSE', count: 1 },
    ])
  })

  it('says so plainly when a school has no board on file', () => {
    expect(byBoard([entry({ board: '' })])).toEqual([{ label: 'Not recorded', count: 1 }])
  })
})

describe('classDistribution', () => {
  it('counts distinct participating students per class, in class order', () => {
    const classes = new Map<string, string | null>([
      ['u1', 'Class 9'],
      ['u2', 'Class 6'],
      ['u3', 'Class 9'],
    ])
    const rows = classDistribution(
      [
        entry({ entryId: 'a', studentIds: ['u1', 'u2'] }),
        entry({ entryId: 'b', studentIds: ['u1', 'u3'] }),
      ],
      classes
    )
    expect(rows).toEqual([
      { label: 'Class 6', count: 1 },
      { label: 'Class 9', count: 2 },
    ])
  })

  it('groups students with no class on file at the end', () => {
    const classes = new Map<string, string | null>([
      ['u1', 'Class 7'],
      ['u2', null],
    ])
    const rows = classDistribution([entry({ studentIds: ['u1', 'u2'] })], classes)
    expect(rows).toEqual([
      { label: 'Class 7', count: 1 },
      { label: 'Class not set', count: 1 },
    ])
  })

  it('omits classes nobody is in', () => {
    const classes = new Map<string, string | null>([['u1', 'Class 12']])
    const rows = classDistribution([entry({ studentIds: ['u1'] })], classes)
    expect(rows).toEqual([{ label: 'Class 12', count: 1 }])
  })
})

describe('submissionTimeline', () => {
  it('counts submissions per Indian day, oldest first', () => {
    const rows = submissionTimeline([
      entry({ entryId: 'a', submittedAt: '2026-09-01T09:00:00Z' }),
      entry({ entryId: 'b', submittedAt: '2026-08-31T23:30:00Z' }), // 05:00 IST on 1 Sep
      entry({ entryId: 'c', submittedAt: '2026-09-03T09:00:00Z' }),
    ])
    expect(rows).toEqual([
      { day: '2026-09-01', count: 2 },
      { day: '2026-09-03', count: 1 },
    ])
  })

  it('ignores drafts and entries with no submission time', () => {
    const rows = submissionTimeline([
      entry({ entryId: 'a', status: 'draft', submittedAt: null }),
      entry({ entryId: 'b', status: 'submitted', submittedAt: null }),
    ])
    expect(rows).toEqual([])
  })
})

describe('staleDrafts', () => {
  const now = new Date('2026-09-20T09:00:00Z')

  it('returns drafts untouched for at least the cutoff, oldest first', () => {
    const rows = staleDrafts(
      [
        entry({
          entryId: 'old',
          status: 'draft',
          submittedAt: null,
          updatedAt: '2026-09-01T09:00:00Z',
        }),
        entry({
          entryId: 'recent',
          status: 'draft',
          submittedAt: null,
          updatedAt: '2026-09-19T09:00:00Z',
        }),
        entry({
          entryId: 'older',
          status: 'draft',
          submittedAt: null,
          updatedAt: '2026-08-20T09:00:00Z',
        }),
      ],
      now,
      7
    )
    expect(rows.map((r) => r.entryId)).toEqual(['older', 'old'])
  })

  it('never lists a submitted entry, however old', () => {
    const rows = staleDrafts(
      [entry({ status: 'submitted', updatedAt: '2026-01-01T09:00:00Z' })],
      now,
      7
    )
    expect(rows).toEqual([])
  })

  it('includes a draft sitting exactly on the cutoff', () => {
    const rows = staleDrafts(
      [entry({ status: 'draft', submittedAt: null, updatedAt: '2026-09-13T09:00:00Z' })],
      now,
      7
    )
    expect(rows).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/analytics.test.ts`
Expected: FAIL with `Failed to resolve import "../analytics"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/isc/analytics.ts`:

```ts
import { CLASS_OPTIONS } from '@/lib/profile/details'
import { istDay, istDaysBetween } from '@/lib/isc/dates'
import type { IscTrackId } from '@/lib/isc/tracks'

/**
 * One ISC entry, flattened to exactly what the admin panels aggregate over.
 *
 * Deliberately not the database row: the page joins schools and members before
 * building these, so every aggregation below is a pure count with no lookups
 * and no async in it.
 */
export interface AnalyticsEntry {
  entryId: string
  track: IscTrackId
  status: string
  schoolId: string
  schoolName: string
  state: string
  district: string
  board: string
  submittedAt: string | null
  updatedAt: string
  /** Everyone on the entry with an account — the leader plus linked teammates. */
  studentIds: string[]
}

/** A labelled count. Used by every single-dimension panel. */
export interface CountRow {
  label: string
  count: number
}

export interface SchoolRow {
  schoolId: string
  schoolName: string
  state: string
  entries: number
  submitted: number
  students: number
}

export interface StateRow {
  state: string
  schools: number
  entries: number
  submitted: number
}

export interface TimelinePoint {
  day: string
  count: number
}

const isSubmitted = (e: AnalyticsEntry) => e.status === 'submitted'

/**
 * The schools carrying the cycle, ranked by finished work.
 *
 * Ranked on submissions before entries: a school with ten untouched drafts has
 * not done more than a school with one real submission, and ranking on the raw
 * count would say it had.
 */
export function topSchools(entries: AnalyticsEntry[], limit = 10): SchoolRow[] {
  const acc = new Map<string, SchoolRow & { studentSet: Set<string> }>()

  for (const e of entries) {
    let row = acc.get(e.schoolId)
    if (!row) {
      row = {
        schoolId: e.schoolId,
        schoolName: e.schoolName,
        state: e.state,
        entries: 0,
        submitted: 0,
        students: 0,
        studentSet: new Set<string>(),
      }
      acc.set(e.schoolId, row)
    }
    row.entries += 1
    if (isSubmitted(e)) row.submitted += 1
    for (const id of e.studentIds) row.studentSet.add(id)
  }

  return [...acc.values()]
    .map(({ studentSet, ...row }) => ({ ...row, students: studentSet.size }))
    .sort(
      (a, b) =>
        b.submitted - a.submitted ||
        b.entries - a.entries ||
        a.schoolName.localeCompare(b.schoolName)
    )
    .slice(0, limit)
}

/** Where the cycle is happening. A state-level round is planned from this. */
export function byState(entries: AnalyticsEntry[]): StateRow[] {
  const acc = new Map<string, StateRow & { schoolSet: Set<string> }>()

  for (const e of entries) {
    // An entry with no state is still an entry. Dropping it would make this
    // table's total quietly disagree with the headline count.
    const state = e.state || 'Unknown'
    let row = acc.get(state)
    if (!row) {
      row = { state, schools: 0, entries: 0, submitted: 0, schoolSet: new Set<string>() }
      acc.set(state, row)
    }
    row.entries += 1
    if (isSubmitted(e)) row.submitted += 1
    row.schoolSet.add(e.schoolId)
  }

  return [...acc.values()]
    .map(({ schoolSet, ...row }) => ({ ...row, schools: schoolSet.size }))
    .sort((a, b) => b.entries - a.entries || a.state.localeCompare(b.state))
}

/** CBSE / ICSE / State board split, from the school each entry belongs to. */
export function byBoard(entries: AnalyticsEntry[]): CountRow[] {
  const acc = new Map<string, number>()
  for (const e of entries) {
    const label = e.board?.trim() || 'Not recorded'
    acc.set(label, (acc.get(label) ?? 0) + 1)
  }
  return [...acc.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/**
 * Participating students by class.
 *
 * Counts students, not entries: a three-person team is three students, and a
 * student on two tracks is still one student.
 */
export function classDistribution(
  entries: AnalyticsEntry[],
  classByStudent: Map<string, string | null>
): CountRow[] {
  const seen = new Set<string>()
  const acc = new Map<string, number>()

  for (const e of entries) {
    for (const id of e.studentIds) {
      if (seen.has(id)) continue
      seen.add(id)
      const label = classByStudent.get(id)?.trim() || 'Class not set'
      acc.set(label, (acc.get(label) ?? 0) + 1)
    }
  }

  // Class order comes from CLASS_OPTIONS so this table reads in the same order
  // as every class dropdown in the app. Anything unrecognised sorts last.
  const known = CLASS_OPTIONS.filter((c) => acc.has(c))
  const unknown = [...acc.keys()].filter((c) => !CLASS_OPTIONS.includes(c)).sort()
  return [...known, ...unknown].map((label) => ({ label, count: acc.get(label) ?? 0 }))
}

/** Submissions per Indian day, oldest first. Drafts are not submissions. */
export function submissionTimeline(entries: AnalyticsEntry[]): TimelinePoint[] {
  const acc = new Map<string, number>()
  for (const e of entries) {
    if (!isSubmitted(e) || !e.submittedAt) continue
    const day = istDay(e.submittedAt)
    if (!day) continue
    acc.set(day, (acc.get(day) ?? 0) + 1)
  }
  return [...acc.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

/**
 * Drafts nobody has touched in a while — the entries most likely to be lost.
 *
 * Oldest first: the top of this list is where a nudge is worth the most.
 */
export function staleDrafts(entries: AnalyticsEntry[], now: Date, days = 7): AnalyticsEntry[] {
  return entries
    .filter((e) => e.status === 'draft' && istDaysBetween(new Date(e.updatedAt), now) >= days)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/isc/__tests__/analytics.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no output.

```bash
git add src/lib/isc/analytics.ts src/lib/isc/__tests__/analytics.test.ts
git commit -m "feat: ISC admin analytics aggregations"
```

---

### Task 4: Admin insight panels on /admin/isc

The page currently fetches only what the list needs. This task widens the fetch to cover district, board and every participant's class, builds `AnalyticsEntry[]`, and renders the six panels underneath the existing stats.

Note the fetch reordering: `user_profiles` must now be queried **after** `isc_entry_members`, because the class lookup covers teammates and not only leaders.

**Files:**

- Create: `src/components/admin/isc-insights.tsx`
- Modify: `src/app/(admin)/admin/isc/page.tsx`
- Modify: `src/components/admin/isc-entry-row.tsx`

**Interfaces:**

- Consumes: `AnalyticsEntry`, `CountRow`, `topSchools`, `byState`, `byBoard`, `classDistribution`, `submissionTimeline`, `staleDrafts` from `@/lib/isc/analytics`; `formatIstDay`, `istDay` from `@/lib/isc/dates`; `trackById` from `@/lib/isc/tracks`
- Produces:
  - `<IscInsights entries={AnalyticsEntry[]} classByStudent={Map<string, string | null>} now={Date} />`
  - `AdminIscEntry` gains a `schoolDistrict: string` field, consumed by Tasks 5 and 6

- [ ] **Step 1: Build the insights component**

Create `src/components/admin/isc-insights.tsx`:

```tsx
import type { ReactNode } from 'react'
import { formatIstDay, istDay } from '@/lib/isc/dates'
import { trackById } from '@/lib/isc/tracks'
import {
  topSchools,
  byState,
  byBoard,
  classDistribution,
  submissionTimeline,
  staleDrafts,
  type AnalyticsEntry,
  type CountRow,
} from '@/lib/isc/analytics'

function Panel({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="clay-card p-5">
      <h2 className="font-display font-bold text-foreground text-sm">{title}</h2>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>
}

/** A labelled count with a proportional bar, used by the class and board panels. */
function BarList({ rows, accent }: { rows: CountRow[]; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">{r.label}</span>
            <span className="text-muted tabular-nums">{r.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full ${accent}`}
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * The six panels that answer "how is the cycle going", as opposed to the row
 * list underneath, which answers "what did this one student send".
 *
 * Every panel describes the whole cycle, not the filtered view: the filters are
 * for finding one entry, and a denominator that moved every time a filter
 * changed would make the numbers impossible to compare.
 */
export function IscInsights({
  entries,
  classByStudent,
  now,
}: {
  entries: AnalyticsEntry[]
  classByStudent: Map<string, string | null>
  now: Date
}) {
  const schools = topSchools(entries, 10)
  const states = byState(entries)
  const boards = byBoard(entries)
  const classes = classDistribution(entries, classByStudent)
  const timeline = submissionTimeline(entries)
  const stale = staleDrafts(entries, now, 7)
  const peak = Math.max(1, ...timeline.map((p) => p.count))

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Top schools" sub="Ranked by submitted entries">
          {schools.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted uppercase tracking-wide">
                    <th className="text-left font-semibold pb-2">School</th>
                    <th className="text-right font-semibold pb-2">Entries</th>
                    <th className="text-right font-semibold pb-2">Submitted</th>
                    <th className="text-right font-semibold pb-2">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {schools.map((s) => (
                    <tr key={s.schoolId}>
                      <td className="py-2 pr-3">
                        <span className="block text-foreground font-medium">{s.schoolName}</span>
                        <span className="block text-muted">{s.state || 'State not recorded'}</span>
                      </td>
                      <td className="py-2 text-right text-muted tabular-nums">{s.entries}</td>
                      <td className="py-2 text-right text-green-700 font-semibold tabular-nums">
                        {s.submitted}
                      </td>
                      <td className="py-2 text-right text-muted tabular-nums">{s.students}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="By state" sub="Schools and entries in each state">
          {states.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted uppercase tracking-wide">
                    <th className="text-left font-semibold pb-2">State</th>
                    <th className="text-right font-semibold pb-2">Schools</th>
                    <th className="text-right font-semibold pb-2">Entries</th>
                    <th className="text-right font-semibold pb-2">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {states.map((s) => (
                    <tr key={s.state}>
                      <td className="py-2 pr-3 text-foreground font-medium">{s.state}</td>
                      <td className="py-2 text-right text-muted tabular-nums">{s.schools}</td>
                      <td className="py-2 text-right text-muted tabular-nums">{s.entries}</td>
                      <td className="py-2 text-right text-green-700 font-semibold tabular-nums">
                        {s.submitted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="By class" sub="Students taking part, not entries">
          {classes.length === 0 ? (
            <Empty>No students have entered yet.</Empty>
          ) : (
            <BarList rows={classes} accent="bg-primary" />
          )}
        </Panel>

        <Panel title="By board" sub="From each school's record">
          {boards.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <BarList rows={boards} accent="bg-accent-teal" />
          )}
        </Panel>

        <Panel title="Submissions per day" sub="Indian Standard Time">
          {timeline.length === 0 ? (
            <Empty>Nothing has been submitted yet.</Empty>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {timeline.map((p) => (
                <li key={p.day} className="flex items-center gap-2 text-xs">
                  <span className="text-muted w-20 shrink-0">{formatIstDay(p.day)}</span>
                  <span className="flex-1 h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-accent-pink"
                      style={{ width: `${(p.count / peak) * 100}%` }}
                    />
                  </span>
                  <span className="text-foreground font-semibold tabular-nums w-6 text-right">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Drafts going cold"
        sub="Started, then untouched for a week or more — the entries most likely to be lost"
      >
        {stale.length === 0 ? (
          <Empty>No draft has been sitting untouched for a week.</Empty>
        ) : (
          <>
            <ul className="divide-y divide-black/[0.06]">
              {stale.slice(0, 15).map((e) => (
                <li key={e.entryId} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0">
                    <span className="block text-foreground font-medium truncate">
                      {e.schoolName}
                    </span>
                    <span className="block text-muted">{trackById(e.track)?.name ?? e.track}</span>
                  </span>
                  <span className="text-muted shrink-0">
                    Last edited {formatIstDay(istDay(e.updatedAt))}
                  </span>
                </li>
              ))}
            </ul>
            {stale.length > 15 && (
              <p className="text-xs text-muted mt-2">
                Showing the 15 oldest of {stale.length}. Filter the list below by Draft to see them
                all.
              </p>
            )}
          </>
        )}
      </Panel>
    </div>
  )
}
```

- [ ] **Step 2: Widen the page's fetch**

In `src/app/(admin)/admin/isc/page.tsx`, replace the block that runs from `const leaderIds = [...new Set(all.map((r) => r.created_by))]` down to and including the `const { data: members } = ...` statement with the following. The reordering is the point: members are needed before profiles, because the class lookup covers teammates too.

```ts
  const schoolIds = [...new Set(all.map((r) => r.school_id))]

  // Members first: the class distribution counts every participant, so the
  // profile lookup below has to cover teammates and not only leaders.
  const { data: members } = all.length
    ? await supabase
        .from('isc_entry_members')
        .select('entry_id, user_id')
        .in(
          'entry_id',
          all.map((r) => r.id)
        )
    : { data: [] }

  const participantIds = [
    ...new Set([
      ...all.map((r) => r.created_by),
      ...(members ?? []).map((m) => m.user_id).filter((id): id is string => Boolean(id)),
    ]),
  ]

  const { data: leaders } = participantIds.length
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, school_class')
        .in('id', participantIds)
    : { data: [] }
  const { data: schools } = schoolIds.length
    ? await supabase.from('schools').select('id, name, state, district, board').in('id', schoolIds)
    : { data: [] }
```

- [ ] **Step 3: Build the class lookup and the analytics rows**

Still in `src/app/(admin)/admin/isc/page.tsx`, immediately after the existing line

```ts
  const leaderById = new Map((leaders ?? []).map((l) => [l.id, l.full_name]))
```

add:

```ts
  const classByStudent = new Map<string, string | null>(
    (leaders ?? []).map((l) => [l.id, l.school_class ?? null])
  )
```

Then replace the existing `sizeByEntry` / `studentIds` loop with this version, which also records who is on each entry:

```ts
  const sizeByEntry = new Map<string, number>()
  const studentsByEntry = new Map<string, string[]>()
  const studentIds = new Set<string>()
  for (const m of members ?? []) {
    sizeByEntry.set(m.entry_id, (sizeByEntry.get(m.entry_id) ?? 0) + 1)
    if (m.user_id) {
      studentIds.add(m.user_id)
      studentsByEntry.set(m.entry_id, [...(studentsByEntry.get(m.entry_id) ?? []), m.user_id])
    }
  }
```

Inside the existing `const enriched: AdminIscEntry[] = all.map(...)` block, add one line immediately after the `schoolState` line:

```ts
    schoolDistrict: schoolById.get(r.school_id)?.district ?? '',
```

and in `src/components/admin/isc-entry-row.tsx`, add the matching field to the interface, immediately after `schoolState: string`:

```ts
  schoolDistrict: string
```

Finally, after the `enriched` block, add the flattened analytics rows:

```ts
  // The same entries, flattened for the aggregations. Kept separate from
  // AdminIscEntry because the panels need school geography and the roster of
  // students, while a list row needs neither.
  const analytics: AnalyticsEntry[] = all.map((r) => ({
    entryId: r.id,
    track: r.track as IscTrackId,
    status: r.status,
    schoolId: r.school_id,
    schoolName: schoolById.get(r.school_id)?.name ?? 'Unknown school',
    state: schoolById.get(r.school_id)?.state ?? '',
    district: schoolById.get(r.school_id)?.district ?? '',
    board: schoolById.get(r.school_id)?.board ?? '',
    submittedAt: r.submitted_at,
    updatedAt: r.updated_at,
    studentIds: studentsByEntry.get(r.id) ?? [],
  }))
```

- [ ] **Step 4: Render the panels**

At the top of `src/app/(admin)/admin/isc/page.tsx`, add:

```ts
import { IscInsights } from '@/components/admin/isc-insights'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
```

Then in the returned JSX, insert the panels between the stats and the filters:

```tsx
      <Reveal delay={0.03}>
        <IscStatsPanel stats={stats} />
      </Reveal>

      <Reveal delay={0.04}>
        <IscInsights entries={analytics} classByStudent={classByStudent} now={new Date()} />
      </Reveal>

      <IscFilters
```

- [ ] **Step 5: Type-check, test and verify in the browser**

Run: `npx tsc --noEmit`
Expected: no output. A missing-`schoolDistrict` error means the Step 3 edits were only half applied — both the interface and the `enriched` map need it.

Run: `npm test`
Expected: all tests pass.

Start the dev server in the background and open `/admin/isc` signed in as an admin. Confirm: Top schools lists real schools with a non-zero Students column; By state lists at least one state; By class shows the classes of real participants; Submissions per day shows a bar for any day something was submitted; Drafts going cold either lists a draft or says none is a week old.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/isc-insights.tsx "src/app/(admin)/admin/isc/page.tsx" src/components/admin/isc-entry-row.tsx
git commit -m "feat: geography, school, class, board and timeline panels on admin ISC"
```

---

### Task 5: Filter admin entries by state and district

State is the level ISC actually rounds at, so it is the filter an admin reaches for most. District narrows it once a state is picked.

District options depend on the chosen state: showing every district in the country under an unselected state would be a list of hundreds.

**Files:**

- Modify: `src/components/admin/isc-filters.tsx`
- Modify: `src/app/(admin)/admin/isc/page.tsx`

**Interfaces:**

- Consumes: `AdminIscEntry.schoolState`, `AdminIscEntry.schoolDistrict` (added in Task 4)
- Produces: `<IscFilters schools={string[]} languages={string[]} states={string[]} districts={string[]} showing={number} total={number} />`

- [ ] **Step 1: Add the two selects**

In `src/components/admin/isc-filters.tsx`, change the props to:

```tsx
export function IscFilters({
  schools,
  languages,
  states,
  districts,
  showing,
  total,
}: {
  schools: string[]
  languages: string[]
  states: string[]
  districts: string[]
  showing: number
  total: number
}) {
```

Change the active-filter list to include the new keys:

```tsx
  const active = ['track', 'status', 'state', 'district', 'school', 'language', 'q'].filter((k) =>
    params.get(k)
  )
```

Replace the `set` helper so changing the state clears a district that no longer belongs to it — otherwise picking Kerala while "New Delhi" is still selected shows an empty list with no visible cause:

```tsx
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    // A district only means something inside its state. Changing the state must
    // drop it, or the list goes empty for a reason nothing on screen explains.
    if (key === 'state') next.delete('district')
    const qs = next.toString()
    router.push(qs ? `/admin/isc?${qs}` : '/admin/isc')
  }
```

Insert the two selects immediately after the status select and before the language select:

```tsx
        <select
          value={params.get('state') ?? ''}
          onChange={(e) => set('state', e.target.value)}
          aria-label="Filter by state"
          className={SELECT}
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={params.get('district') ?? ''}
          onChange={(e) => set('district', e.target.value)}
          aria-label="Filter by district"
          disabled={!params.get('state')}
          className={`${SELECT} disabled:opacity-50`}
        >
          <option value="">{params.get('state') ? 'All districts' : 'Pick a state first'}</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
```

- [ ] **Step 2: Feed the options and apply the filters**

In `src/app/(admin)/admin/isc/page.tsx`, widen the `searchParams` type:

```ts
  searchParams: Promise<{
    track?: string
    status?: string
    school?: string
    language?: string
    state?: string
    district?: string
    q?: string
  }>
```

Add the two clauses to the row filter, immediately after the `status` clause:

```ts
    if (params.state && e.schoolState !== params.state) return false
    if (params.district && e.schoolDistrict !== params.district) return false
```

Replace the `schoolNames` line with the three option lists. District options are scoped to the chosen state:

```ts
  const schoolNames = [...new Set(enriched.map((e) => e.schoolName))].sort()
  const states = [...new Set(enriched.map((e) => e.schoolState).filter(Boolean))].sort()
  // Scoped to the chosen state: an unscoped list would be every district in the
  // country, and picking one from another state would silently show nothing.
  const districts = [
    ...new Set(
      enriched
        .filter((e) => !params.state || e.schoolState === params.state)
        .map((e) => e.schoolDistrict)
        .filter(Boolean)
    ),
  ].sort()
```

And pass them:

```tsx
      <IscFilters
        schools={schoolNames}
        languages={LANGUAGE_OPTIONS}
        states={states}
        districts={districts}
        showing={rows.length}
        total={enriched.length}
      />
```

- [ ] **Step 3: Type-check and verify in the browser**

Run: `npx tsc --noEmit`
Expected: no output.

At `/admin/isc`: the district select is disabled and reads "Pick a state first". Choose a state — the URL gains `?state=…`, the row count drops, and the district select enables showing only that state's districts. Choose a district, then change the state: the district must clear, not persist.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/isc-filters.tsx "src/app/(admin)/admin/isc/page.tsx"
git commit -m "feat: filter ISC entries by state and district"
```

---

### Task 6: CSV export of the filtered view

An admin's next step after filtering is usually a spreadsheet — booking panels, mailing schools, handing a state list to a regional lead. Exporting the *filtered* view (unlike the panels, which always describe the whole cycle) is the point: filtering is how the export is chosen.

CSV cells that begin with `=`, `+`, `-` or `@` are executed as formulas by Excel and Sheets. A school name is text a stranger typed, so every cell is neutralised before it is written.

**Files:**

- Create: `src/lib/isc/csv.ts`
- Create: `src/lib/isc/__tests__/csv.test.ts`
- Create: `src/components/admin/isc-export.tsx`
- Modify: `src/app/(admin)/admin/isc/page.tsx`

**Interfaces:**

- Consumes: `toCsv` from `@/lib/isc/csv`; `formatIstDay`, `istDay` from `@/lib/isc/dates`; `trackById`, `IscTrackId` from `@/lib/isc/tracks`
- Produces:
  - `toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string`
  - `interface ExportRow` and `<IscExport rows={ExportRow[]} filename={string} />`

- [ ] **Step 1: Write the failing CSV test**

Create `src/lib/isc/__tests__/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toCsv } from '../csv'

describe('toCsv', () => {
  it('writes a header row and one line per row', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          ['1', '2'],
          ['3', '4'],
        ]
      )
    ).toBe('a,b\r\n1,2\r\n3,4')
  })

  it('quotes cells containing a comma, a quote or a newline', () => {
    expect(toCsv(['x'], [['Delhi, India']])).toBe('x\r\n"Delhi, India"')
    expect(toCsv(['x'], [['say "hi"']])).toBe('x\r\n"say ""hi"""')
    expect(toCsv(['x'], [['two\nlines']])).toBe('x\r\n"two\nlines"')
  })

  it('renders null and undefined as an empty cell', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,')
  })

  it('renders numbers without quoting them', () => {
    expect(toCsv(['n'], [[42]])).toBe('n\r\n42')
  })

  it('neutralises cells a spreadsheet would run as a formula', () => {
    // Excel and Sheets execute a leading =, +, - or @. A school name is text a
    // stranger typed and must never become a formula.
    expect(toCsv(['x'], [['=SUM(A1:A9)']])).toBe(`x\r\n'=SUM(A1:A9)`)
    expect(toCsv(['x'], [['@import']])).toBe(`x\r\n'@import`)
    expect(toCsv(['x'], [['+1']])).toBe(`x\r\n'+1`)
  })

  it('quotes a neutralised cell that also needs quoting', () => {
    expect(toCsv(['x'], [['=CONCAT(A1,B1)']])).toBe(`x\r\n"'=CONCAT(A1,B1)"`)
  })
})
```

The apostrophe alone does not trigger quoting — only a comma, a double quote or a newline does. That is why the first three expectations are bare and the fourth, which contains a comma, is quoted.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/csv.test.ts`
Expected: FAIL with `Failed to resolve import "../csv"`.

- [ ] **Step 3: Write the CSV implementation**

Create `src/lib/isc/csv.ts`:

```ts
/** Cells a spreadsheet would evaluate rather than display. */
const FORMULA_START = /^[=+\-@]/

/**
 * One CSV cell.
 *
 * A leading =, +, - or @ is prefixed with an apostrophe: Excel and Sheets
 * execute those, and a school name is text a stranger typed. The apostrophe is
 * the standard neutraliser and is not shown as part of the value.
 */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  if (/["\r\n,]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/**
 * Rows as CSV, CRLF-delimited because that is what Excel expects on Windows.
 * No trailing newline: a blank final line reads as an empty record.
 */
export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines = [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))]
  return lines.join('\r\n')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/isc/__tests__/csv.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Build the download button**

Create `src/components/admin/isc-export.tsx`:

```tsx
'use client'

import { Download } from 'lucide-react'
import { toCsv } from '@/lib/isc/csv'
import { trackById, type IscTrackId } from '@/lib/isc/tracks'
import { formatIstDay, istDay } from '@/lib/isc/dates'

/** Exactly the columns a screening spreadsheet needs. */
export interface ExportRow {
  schoolName: string
  schoolState: string
  schoolDistrict: string
  leaderName: string
  track: IscTrackId
  teamSize: number
  status: string
  language: string | null
  submittedAt: string | null
  updatedAt: string
}

const HEADERS = [
  'School',
  'State',
  'District',
  'Team leader',
  'Championship',
  'Team size',
  'Status',
  'Language',
  'Submitted on',
  'Last edited',
]

/**
 * Downloads what is on screen, filters and all — unlike the panels above, which
 * always describe the whole cycle. Choosing the export by filtering is the
 * point of the button.
 *
 * Built in the browser from props rather than fetched: the page has already
 * done the filtering, and a second server round trip could return a different
 * set from the one the admin is looking at.
 */
export function IscExport({ rows, filename }: { rows: ExportRow[]; filename: string }) {
  const download = () => {
    const csv = toCsv(
      HEADERS,
      rows.map((r) => [
        r.schoolName,
        r.schoolState,
        r.schoolDistrict,
        r.leaderName,
        trackById(r.track)?.name ?? r.track,
        r.teamSize,
        // The same vocabulary the student and the coordinator see. "Submitted"
        // here and "Entered" on screen would read as two different things.
        r.status === 'submitted' ? 'Entered' : 'Draft',
        r.language ?? '',
        r.submittedAt ? formatIstDay(istDay(r.submittedAt)) : '',
        formatIstDay(istDay(r.updatedAt)),
      ])
    )
    // A BOM so Excel opens Hindi titles as UTF-8 rather than mojibake. Written
    // as an escape, not a literal — an invisible character in source is a bug
    // waiting to be deleted by accident.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="h-9 px-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs font-semibold text-foreground hover:bg-black/[0.03] disabled:opacity-50 inline-flex items-center gap-1.5"
    >
      <Download className="w-3.5 h-3.5" />
      Download CSV
    </button>
  )
}
```

- [ ] **Step 6: Put the button on the page**

In `src/app/(admin)/admin/isc/page.tsx`, add the import:

```ts
import { IscExport } from '@/components/admin/isc-export'
```

and insert this immediately after the `<IscFilters … />` element:

```tsx
      <div className="flex items-center justify-end">
        <IscExport
          rows={rows.map((e) => ({
            schoolName: e.schoolName,
            schoolState: e.schoolState,
            schoolDistrict: e.schoolDistrict,
            leaderName: e.leaderName,
            track: e.track,
            teamSize: e.teamSize,
            status: e.status,
            language: e.language,
            submittedAt: e.submittedAt,
            updatedAt: e.updatedAt,
          }))}
          filename={`isc-2026-entries-${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>
```

- [ ] **Step 7: Type-check, test, verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm test`
Expected: all tests pass.

In the browser: click Download CSV with no filters and confirm the file has one row per entry plus a header. Apply a state filter and download again — the file must shrink to match the "Showing N of M" count.

- [ ] **Step 8: Commit**

```bash
git add src/lib/isc/csv.ts src/lib/isc/__tests__/csv.test.ts src/components/admin/isc-export.tsx "src/app/(admin)/admin/isc/page.tsx"
git commit -m "feat: CSV export of the filtered ISC entry list"
```

---

### Task 7: Coordinator aggregations and the deadline countdown

A coordinator's job is chasing participation at one school, so their numbers are about students, not entries: who has entered, who is sitting on a draft, who has not started. Entry counts answer the separate question of how much work the school has produced.

`countdownLabel` goes in `validate.ts` beside `isTrackLocked`, which is the same deadline read a different way.

**Files:**

- Create: `src/lib/coordinator/analytics.ts`
- Create: `src/lib/coordinator/__tests__/analytics.test.ts`
- Modify: `src/lib/isc/validate.ts`
- Modify: `src/lib/isc/__tests__/validate.test.ts`

**Interfaces:**

- Consumes: `isEligibleClass` from `@/lib/isc/validate`; `CLASS_OPTIONS` from `@/lib/profile/details`; `ISC_TRACKS`, `IscTrackId` from `@/lib/isc/tracks`; `istDaysBetween` from `@/lib/isc/dates`
- Produces:
  - `interface RosterEntryStatus { studentId: string; fullName: string | null; schoolClass: string | null; iscStatus: Record<string, string> }`
  - `rosterSummary(students: RosterEntryStatus[]): RosterSummary`
  - `entryCounts(entries: { track: string; status: string }[]): EntryCounts`
  - `classParticipation(students: RosterEntryStatus[]): ClassParticipation[]`
  - `needsNudge(students: RosterEntryStatus[]): NudgeLists`
  - `countdownLabel(deadlineIso: string, now: Date): string` — exported from `@/lib/isc/validate`

- [ ] **Step 1: Write the failing coordinator test**

Create `src/lib/coordinator/__tests__/analytics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  rosterSummary,
  entryCounts,
  classParticipation,
  needsNudge,
  type RosterEntryStatus,
} from '../analytics'

function student(over: Partial<RosterEntryStatus> = {}): RosterEntryStatus {
  return {
    studentId: 'u1',
    fullName: 'Maya Sharma',
    schoolClass: 'Class 9',
    iscStatus: {},
    ...over,
  }
}

describe('rosterSummary', () => {
  it('separates everyone on SkillFleet from those old enough to enter', () => {
    const s = rosterSummary([
      student({ studentId: 'a', schoolClass: 'Class 9' }),
      student({ studentId: 'b', schoolClass: 'Class 2' }),
      student({ studentId: 'c', schoolClass: null }),
    ])
    expect(s.students).toBe(3)
    expect(s.eligible).toBe(1)
  })

  it('counts an eligible student on any entry as entered', () => {
    const s = rosterSummary([
      student({ studentId: 'a', iscStatus: { ai_for_impact: 'draft' } }),
      student({ studentId: 'b', iscStatus: { content_creator: 'submitted' } }),
      student({ studentId: 'c', iscStatus: {} }),
    ])
    expect(s.entered).toBe(2)
    expect(s.notEntered).toBe(1)
  })

  it('counts a student with at least one submitted entry as finished', () => {
    const s = rosterSummary([
      student({
        studentId: 'a',
        iscStatus: { ai_for_impact: 'draft', content_creator: 'submitted' },
      }),
      student({ studentId: 'b', iscStatus: { ai_for_impact: 'draft' } }),
    ])
    expect(s.submittedStudents).toBe(1)
  })

  it('never counts an ineligible student as entered', () => {
    const s = rosterSummary([
      student({ schoolClass: 'Class 3', iscStatus: { ai_for_impact: 'draft' } }),
    ])
    expect(s.entered).toBe(0)
    expect(s.eligible).toBe(0)
  })
})

describe('entryCounts', () => {
  it('totals entries and splits them by status', () => {
    const c = entryCounts([
      { track: 'ai_for_impact', status: 'submitted' },
      { track: 'ai_for_impact', status: 'draft' },
      { track: 'content_creator', status: 'submitted' },
    ])
    expect(c.total).toBe(3)
    expect(c.submitted).toBe(2)
    expect(c.draft).toBe(1)
  })

  it('reports every track, including ones with nothing in them', () => {
    const c = entryCounts([{ track: 'ai_for_impact', status: 'submitted' }])
    expect(c.byTrack.ai_for_impact).toEqual({ submitted: 1, draft: 0 })
    expect(c.byTrack.entrepreneurship).toEqual({ submitted: 0, draft: 0 })
    expect(c.byTrack.content_creator).toEqual({ submitted: 0, draft: 0 })
  })

  it('ignores a track it does not recognise rather than inventing a row', () => {
    const c = entryCounts([{ track: 'puzzle_master', status: 'submitted' }])
    expect(c.total).toBe(1)
    expect(Object.keys(c.byTrack)).toHaveLength(3)
  })
})

describe('classParticipation', () => {
  it('covers only the classes ISC is open to, in class order', () => {
    const rows = classParticipation([
      student({ studentId: 'a', schoolClass: 'Class 9', iscStatus: { ai_for_impact: 'draft' } }),
      student({ studentId: 'b', schoolClass: 'Class 9' }),
      student({ studentId: 'c', schoolClass: 'Class 6' }),
      student({ studentId: 'd', schoolClass: 'Class 2' }),
    ])
    expect(rows).toEqual([
      { schoolClass: 'Class 6', students: 1, entered: 0 },
      { schoolClass: 'Class 9', students: 2, entered: 1 },
    ])
  })

  it('is empty when nobody at the school is old enough', () => {
    expect(classParticipation([student({ schoolClass: 'Class 1' })])).toEqual([])
  })
})

describe('needsNudge', () => {
  it('lists eligible students sitting on a draft', () => {
    const { drafts } = needsNudge([
      student({ studentId: 'a', fullName: 'Aman', iscStatus: { ai_for_impact: 'draft' } }),
      student({ studentId: 'b', fullName: 'Bina', iscStatus: { ai_for_impact: 'submitted' } }),
    ])
    expect(drafts.map((s) => s.fullName)).toEqual(['Aman'])
  })

  it('still lists a student who has one submission and one unfinished draft', () => {
    const { drafts } = needsNudge([
      student({ iscStatus: { ai_for_impact: 'submitted', content_creator: 'draft' } }),
    ])
    expect(drafts).toHaveLength(1)
  })

  it('lists eligible students who have not started at all', () => {
    const { notEntered } = needsNudge([
      student({ studentId: 'a', fullName: 'Aman', iscStatus: {} }),
      student({ studentId: 'b', fullName: 'Bina', iscStatus: { ai_for_impact: 'draft' } }),
    ])
    expect(notEntered.map((s) => s.fullName)).toEqual(['Aman'])
  })

  it('never nudges a student too young to enter', () => {
    const { drafts, notEntered } = needsNudge([student({ schoolClass: 'Class 3', iscStatus: {} })])
    expect(drafts).toEqual([])
    expect(notEntered).toEqual([])
  })

  it('sorts each list by name so it reads like a class list', () => {
    const { notEntered } = needsNudge([
      student({ studentId: 'a', fullName: 'Zara' }),
      student({ studentId: 'b', fullName: 'Aman' }),
    ])
    expect(notEntered.map((s) => s.fullName)).toEqual(['Aman', 'Zara'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/coordinator/__tests__/analytics.test.ts`
Expected: FAIL with `Failed to resolve import "../analytics"`.

- [ ] **Step 3: Write the coordinator implementation**

Create `src/lib/coordinator/analytics.ts`:

```ts
import { CLASS_OPTIONS } from '@/lib/profile/details'
import { isEligibleClass } from '@/lib/isc/validate'
import { ISC_TRACKS, type IscTrackId } from '@/lib/isc/tracks'

/**
 * One student on the roster, as far as these counts are concerned.
 *
 * Declared here rather than imported from the coordinator server action:
 * RosterStudent satisfies this structurally, and a lib should not depend on a
 * 'use server' module.
 */
export interface RosterEntryStatus {
  studentId: string
  fullName: string | null
  schoolClass: string | null
  /** Track id -> 'draft' | 'submitted'. An absent track means not started. */
  iscStatus: Record<string, string>
}

export interface RosterSummary {
  /** Everyone from the school with a SkillFleet account. */
  students: number
  /** Of those, the ones in Classes 5-12. */
  eligible: number
  /** Eligible students on at least one entry, draft or submitted. */
  entered: number
  notEntered: number
  /** Eligible students with at least one entry actually submitted. */
  submittedStudents: number
}

export interface EntryCounts {
  total: number
  submitted: number
  draft: number
  byTrack: Record<IscTrackId, { submitted: number; draft: number }>
}

export interface ClassParticipation {
  schoolClass: string
  students: number
  entered: number
}

export interface NudgeLists {
  /** Eligible students with an unfinished draft on any track. */
  drafts: RosterEntryStatus[]
  /** Eligible students who have not started anything. */
  notEntered: RosterEntryStatus[]
}

const eligible = (s: RosterEntryStatus) => isEligibleClass(s.schoolClass)
const statuses = (s: RosterEntryStatus) => Object.values(s.iscStatus ?? {})
const hasEntered = (s: RosterEntryStatus) => statuses(s).length > 0
const byName = (a: RosterEntryStatus, b: RosterEntryStatus) =>
  (a.fullName ?? '').localeCompare(b.fullName ?? '')

/**
 * The headline numbers, all about students.
 *
 * A coordinator chases people, not rows: "eleven of forty have entered" is
 * actionable in a way "fourteen entries" is not.
 */
export function rosterSummary(students: RosterEntryStatus[]): RosterSummary {
  const able = students.filter(eligible)
  const entered = able.filter(hasEntered).length
  return {
    students: students.length,
    eligible: able.length,
    entered,
    notEntered: able.length - entered,
    submittedStudents: able.filter((s) => statuses(s).includes('submitted')).length,
  }
}

/** How much work the school has produced, by entry rather than by student. */
export function entryCounts(entries: { track: string; status: string }[]): EntryCounts {
  const byTrack = ISC_TRACKS.reduce(
    (acc, t) => {
      acc[t.id] = { submitted: 0, draft: 0 }
      return acc
    },
    {} as Record<IscTrackId, { submitted: number; draft: number }>
  )

  let submitted = 0
  let draft = 0

  for (const e of entries) {
    if (e.status === 'submitted') submitted += 1
    else draft += 1
    // A track this build does not know about still counts toward the total but
    // gets no row: inventing one would put a heading on the page for a
    // championship that cannot be entered here.
    const row = byTrack[e.track as IscTrackId]
    if (!row) continue
    if (e.status === 'submitted') row.submitted += 1
    else row.draft += 1
  }

  return { total: entries.length, submitted, draft, byTrack }
}

/**
 * Participation class by class, across Classes 5-12 only.
 *
 * Younger classes are left out on purpose: they cannot enter, and a row reading
 * "0 of 12 entered" would look like a failure rather than a rule.
 */
export function classParticipation(students: RosterEntryStatus[]): ClassParticipation[] {
  const acc = new Map<string, ClassParticipation>()

  for (const s of students) {
    if (!eligible(s)) continue
    const key = s.schoolClass as string
    const row = acc.get(key) ?? { schoolClass: key, students: 0, entered: 0 }
    row.students += 1
    if (hasEntered(s)) row.entered += 1
    acc.set(key, row)
  }

  // CLASS_OPTIONS order, so this reads the same way as every class dropdown.
  return CLASS_OPTIONS.filter((c) => acc.has(c)).map((c) => acc.get(c) as ClassParticipation)
}

/**
 * Who to talk to next.
 *
 * A student with one submission and one unfinished draft is still on the draft
 * list: the unfinished entry is the thing that needs a nudge, and their other
 * success does not make it finish itself.
 */
export function needsNudge(students: RosterEntryStatus[]): NudgeLists {
  const able = students.filter(eligible)
  return {
    drafts: able.filter((s) => statuses(s).includes('draft')).sort(byName),
    notEntered: able.filter((s) => !hasEntered(s)).sort(byName),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/coordinator/__tests__/analytics.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Write the failing countdown test**

Append to `src/lib/isc/__tests__/validate.test.ts`:

```ts
describe('countdownLabel', () => {
  const now = new Date('2026-09-01T09:00:00Z') // 14:30 IST on 1 Sep

  it('counts whole days left', () => {
    expect(countdownLabel('2026-09-08T18:29:59Z', now)).toBe('7 days left')
  })

  it('reads naturally on the last day and the one before it', () => {
    expect(countdownLabel('2026-09-02T18:29:59Z', now)).toBe('1 day left')
    expect(countdownLabel('2026-09-01T18:29:59Z', now)).toBe('Closes today')
  })

  it('says so once the deadline has passed', () => {
    expect(countdownLabel('2026-08-30T18:29:59Z', now)).toBe('Closed')
  })

  it('does not invent a countdown when there is no deadline', () => {
    expect(countdownLabel('', now)).toBe('Deadline not set')
    expect(countdownLabel('whenever', now)).toBe('Deadline not set')
  })
})
```

Add `countdownLabel` to whatever that file already imports from `../validate` rather than replacing the import line.

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/lib/isc/__tests__/validate.test.ts`
Expected: FAIL — `countdownLabel is not a function`.

- [ ] **Step 7: Write countdownLabel**

Add this import at the top of `src/lib/isc/validate.ts`:

```ts
import { istDaysBetween } from '@/lib/isc/dates'
```

and append the function to the end of the file:

```ts
/**
 * How long a track is still open, in plain words.
 *
 * The sibling of isTrackLocked: same deadline, read as time remaining rather
 * than as a yes or no. Counted in Indian calendar days, so "1 day left" means
 * "until the end of tomorrow" to a student in India, which is what they will
 * take it to mean.
 */
export function countdownLabel(deadlineIso: string, now: Date): string {
  if (!deadlineIso) return 'Deadline not set'
  const deadline = new Date(deadlineIso)
  if (Number.isNaN(deadline.getTime())) return 'Deadline not set'
  if (now.getTime() > deadline.getTime()) return 'Closed'

  const days = istDaysBetween(now, deadline)
  if (days <= 0) return 'Closes today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}
```

- [ ] **Step 8: Run the tests and type-check**

Run: `npx vitest run src/lib/isc/__tests__/validate.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/coordinator/analytics.ts src/lib/coordinator/__tests__/analytics.test.ts src/lib/isc/validate.ts src/lib/isc/__tests__/validate.test.ts
git commit -m "feat: coordinator participation aggregations and deadline countdown"
```

---

### Task 8: Turn the coordinator dashboard into an analytics page

Right now the dashboard is a roster and a headline. This task puts the numbers above it: how many students have entered, what the school has produced per track, class-by-class participation, and how long is left.

No migration is needed. `isc_entries_read` already lets an approved coordinator select their own school's entries, and `isc_config_read` is open to every authenticated user — so both queries go straight through RLS.

**Files:**

- Create: `src/components/coordinator/coordinator-stats.tsx`
- Modify: `src/app/actions/isc.ts` (add `getIscDeadlines`)
- Modify: `src/app/(coordinator)/coordinator/page.tsx`

**Interfaces:**

- Consumes: `rosterSummary`, `entryCounts`, `classParticipation`, `RosterEntryStatus` from `@/lib/coordinator/analytics`; `countdownLabel` from `@/lib/isc/validate`; `ISC_TRACKS` from `@/lib/isc/tracks`
- Produces:
  - `getIscDeadlines(): Promise<Record<string, string>>` — track id to ISO deadline
  - `<CoordinatorStats students={RosterEntryStatus[]} entries={{ track: string; status: string }[]} deadlines={Record<string, string>} now={Date} />`

- [ ] **Step 1: Add the deadlines fetch**

In `src/app/actions/isc.ts`, immediately after the existing `getTrackDeadline` function, add:

```ts
/**
 * Every track's deadline in one round trip. getTrackDeadline answers for one
 * track; the coordinator dashboard shows all of them side by side and should
 * not make three queries to do it.
 */
export async function getIscDeadlines(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('isc_config').select('track, screening_deadline')
  const out: Record<string, string> = {}
  for (const row of (data ?? []) as { track: string; screening_deadline: string }[]) {
    out[row.track] = row.screening_deadline
  }
  return out
}
```

- [ ] **Step 2: Build the stats component**

Create `src/components/coordinator/coordinator-stats.tsx`:

```tsx
import { ISC_TRACKS } from '@/lib/isc/tracks'
import { countdownLabel } from '@/lib/isc/validate'
import {
  rosterSummary,
  entryCounts,
  classParticipation,
  type RosterEntryStatus,
} from '@/lib/coordinator/analytics'

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub: string
  accent: string
}) {
  return (
    <div className="clay-card p-5">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 ${accent}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  )
}

/**
 * A coordinator's console, above the roster.
 *
 * Deliberately student-first: "11 of 40 have entered" is something a
 * coordinator can act on this afternoon, where "14 entries" is not. Entry
 * counts still appear, but as the school's output rather than its headline.
 */
export function CoordinatorStats({
  students,
  entries,
  deadlines,
  now,
}: {
  students: RosterEntryStatus[]
  entries: { track: string; status: string }[]
  deadlines: Record<string, string>
  now: Date
}) {
  const summary = rosterSummary(students)
  const counts = entryCounts(entries)
  const classes = classParticipation(students)
  const pct = summary.eligible ? Math.round((summary.entered / summary.eligible) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Students"
          value={summary.students}
          sub={`${summary.eligible} in Classes 5–12`}
          accent="text-foreground"
        />
        <Tile
          label="Have entered"
          value={summary.entered}
          sub={`${pct}% of eligible students`}
          accent="text-primary"
        />
        <Tile
          label="Entries"
          value={counts.total}
          sub={`${counts.submitted} entered · ${counts.draft} still draft`}
          accent="text-accent-teal"
        />
        <Tile
          label="Yet to start"
          value={summary.notEntered}
          sub="Eligible, nothing begun"
          accent="text-accent-yellow"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">By championship</h2>
          <p className="text-xs text-muted mt-0.5">
            Your school&apos;s entries, and how long is left
          </p>
          <div className="mt-3 space-y-3">
            {ISC_TRACKS.map((t) => {
              const row = counts.byTrack[t.id]
              const total = row.submitted + row.draft
              const closing = countdownLabel(deadlines[t.id] ?? '', now)
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground font-medium">{t.name}</span>
                    <span className="text-muted shrink-0">{closing}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex-1 h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                      <span
                        className={`block h-full rounded-full bg-gradient-to-r ${t.gradient}`}
                        style={{ width: total ? `${(row.submitted / total) * 100}%` : '0%' }}
                      />
                    </span>
                    <span className="text-xs text-muted shrink-0">
                      {row.submitted} entered · {row.draft} draft
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">Class by class</h2>
          <p className="text-xs text-muted mt-0.5">
            Classes 5–12 only — younger students cannot enter ISC 2026
          </p>
          {classes.length === 0 ? (
            <p className="text-xs text-muted mt-3">
              No students from Classes 5–12 have joined SkillFleet yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {classes.map((c) => (
                <li key={c.schoolClass}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{c.schoolClass}</span>
                    <span className="text-muted">
                      {c.entered} of {c.students} entered
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(c.entered / Math.max(1, c.students)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Fetch the entries and render**

In `src/app/(coordinator)/coordinator/page.tsx`, add these imports:

```ts
import { createClient } from '@/lib/supabase/server'
import { getIscDeadlines } from '@/app/actions/isc'
import { CoordinatorStats } from '@/components/coordinator/coordinator-stats'
```

Replace the block from `const students = await getSchoolRoster()` to the end of the function with:

```tsx
  const students = await getSchoolRoster()
  const deadlines = await getIscDeadlines()

  // Straight through RLS: isc_entries_read already grants an approved
  // coordinator their own school's entries, so this needs no RPC. The
  // school_id filter is belt and braces — the policy scopes it either way.
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('isc_entries')
    .select('track, status')
    .eq('school_id', application.schoolId)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={Users}
        title={application.schoolName}
        subtitle={`${students.length} student${students.length === 1 ? '' : 's'} from your school on SkillFleet.`}
      />
      <CoordinatorStats
        students={students}
        entries={(entries ?? []) as { track: string; status: string }[]}
        deadlines={deadlines}
        now={new Date()}
      />
      <SchoolRoster students={students} />
    </div>
  )
}
```

- [ ] **Step 4: Type-check, test and verify in the browser**

Run: `npx tsc --noEmit`
Expected: no output. If `students` fails to satisfy `RosterEntryStatus[]`, check that `RosterStudent` still declares `studentId`, `fullName`, `schoolClass` and `iscStatus` — the two shapes match structurally and no cast should be needed.

Run: `npm test`
Expected: all tests pass.

Sign in as an approved coordinator and open `/coordinator`. Confirm: the four tiles show real numbers; "Have entered" is never larger than the eligible count in its own subtitle; By championship lists all three tracks with a countdown; Class by class lists only Classes 5–12.

- [ ] **Step 5: Commit**

```bash
git add src/components/coordinator/coordinator-stats.tsx src/app/actions/isc.ts "src/app/(coordinator)/coordinator/page.tsx"
git commit -m "feat: participation analytics on the coordinator dashboard"
```

---

### Task 9: Nudge lists and a searchable roster

The last piece is the one that turns numbers into a to-do list. A coordinator with forty students needs to know which two names to chase, and to be able to find a student by typing part of their name.

`SchoolRoster` becomes a client component for the search box. The grouping logic is unchanged; only the filtering is new.

**Files:**

- Create: `src/components/coordinator/needs-nudge.tsx`
- Modify: `src/components/coordinator/school-roster.tsx`
- Modify: `src/app/(coordinator)/coordinator/page.tsx`

**Interfaces:**

- Consumes: `needsNudge`, `RosterEntryStatus` from `@/lib/coordinator/analytics`; `RosterStudent` from `@/app/actions/coordinator`
- Produces: `<NeedsNudge students={RosterEntryStatus[]} />`

- [ ] **Step 1: Build the nudge lists**

Create `src/components/coordinator/needs-nudge.tsx`:

```tsx
import { AlertTriangle, UserPlus } from 'lucide-react'
import { needsNudge, type RosterEntryStatus } from '@/lib/coordinator/analytics'

function NameList({ students }: { students: RosterEntryStatus[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {students.map((s) => (
        <li
          key={s.studentId}
          className="text-xs font-medium text-foreground bg-black/[0.04] rounded-lg px-2 py-1"
        >
          {s.fullName ?? 'Student'}
          {s.schoolClass && <span className="text-muted"> · {s.schoolClass}</span>}
        </li>
      ))}
    </ul>
  )
}

/**
 * The two lists worth acting on today.
 *
 * Split rather than merged: a student sitting on a finished-looking draft needs
 * a different conversation from one who has not opened ISC at all, and one
 * combined list would hide that.
 */
export function NeedsNudge({ students }: { students: RosterEntryStatus[] }) {
  const { drafts, notEntered } = needsNudge(students)

  if (drafts.length === 0 && notEntered.length === 0) return null

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {drafts.length > 0 && (
        <div className="clay-card p-5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-accent-yellow/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-accent-yellow" />
            </span>
            <h2 className="font-display font-bold text-foreground text-sm">
              Sitting on a draft ({drafts.length})
            </h2>
          </div>
          <p className="text-xs text-muted mt-2">
            They have started, but a draft is not an entry. It only counts once they press Submit
            entry.
          </p>
          <NameList students={drafts} />
        </div>
      )}

      {notEntered.length > 0 && (
        <div className="clay-card p-5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-primary" />
            </span>
            <h2 className="font-display font-bold text-foreground text-sm">
              Yet to start ({notEntered.length})
            </h2>
          </div>
          <p className="text-xs text-muted mt-2">
            Eligible for ISC 2026 with nothing begun on any championship.
          </p>
          <NameList students={notEntered} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Make the roster searchable**

Replace the whole of `src/components/coordinator/school-roster.tsx` with:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { CLASS_OPTIONS } from '@/lib/profile/details'
import { ISC_TRACKS } from '@/lib/isc/tracks'
import type { RosterStudent } from '@/app/actions/coordinator'

const SHORT: Record<string, string> = {
  ai_for_impact: 'AI',
  entrepreneurship: 'YE',
  content_creator: 'CC',
}

/** One chip per enterable track: a single value cannot say which track. */
function AttemptChips({ status }: { status: Record<string, string> }) {
  return (
    <span className="flex flex-wrap gap-1">
      {ISC_TRACKS.map((t) => {
        const state = status[t.id]
        const cls =
          state === 'submitted'
            ? 'bg-primary/10 text-primary'
            : state === 'draft'
              ? 'bg-accent-yellow/15 text-accent-yellow'
              : 'bg-black/[0.05] text-muted'
        return (
          <span
            key={t.id}
            title={`${t.name}: ${state ?? 'not started'}`}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}
          >
            {SHORT[t.id]}
          </span>
        )
      })}
    </span>
  )
}

/**
 * Grouped by class, in the same order CLASS_OPTIONS defines everywhere else in
 * the app. Attempt Status is real: because teammates are linked to real
 * accounts, every member of a team reads as having entered, not only whoever
 * pressed Submit. Qualify Status stays a placeholder until judging exists.
 *
 * Filtering runs in the browser rather than through the URL: a roster is one
 * school's worth of students, all of them already on the page, and a
 * coordinator looking someone up is not a view worth linking to.
 */
export function SchoolRoster({ students }: { students: RosterStudent[] }) {
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [onlyEntered, setOnlyEntered] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => {
      if (q && !(s.fullName ?? '').toLowerCase().includes(q)) return false
      if (classFilter && s.schoolClass !== classFilter) return false
      if (onlyEntered && Object.keys(s.iscStatus ?? {}).length === 0) return false
      return true
    })
  }, [students, query, classFilter, onlyEntered])

  if (students.length === 0) {
    return (
      <div className="clay-card p-8 text-center text-muted text-sm">
        No students from your school have joined SkillFleet yet.
      </div>
    )
  }

  const classesPresent = CLASS_OPTIONS.filter((c) => students.some((s) => s.schoolClass === c))
  const filtering = Boolean(query.trim() || classFilter || onlyEntered)

  const byClass = new Map<string, RosterStudent[]>()
  for (const s of visible) {
    const key = s.schoolClass ?? 'Class not set'
    byClass.set(key, [...(byClass.get(key) ?? []), s])
  }

  const orderedClasses = [
    ...CLASS_OPTIONS.filter((c) => byClass.has(c)),
    ...(byClass.has('Class not set') ? ['Class not set'] : []),
  ]

  const control =
    'h-9 px-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs font-semibold text-foreground focus:outline-none focus:border-primary'

  return (
    <div className="space-y-4">
      <div className="clay-card p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search students"
              className="w-full h-9 pl-9 pr-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter by class"
            className={control}
          >
            <option value="">All classes</option>
            {classesPresent.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={onlyEntered}
              onChange={(e) => setOnlyEntered(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-black/[0.06] accent-primary"
            />
            Only students who have entered
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted">
            Showing <span className="font-semibold text-foreground">{visible.length}</span> of{' '}
            {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setClassFilter('')
                setOnlyEntered(false)
              }}
              className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="clay-card p-8 text-center text-muted text-sm">
          No students match these filters — try clearing one.
        </div>
      ) : (
        orderedClasses.map((cls) => (
          <div key={cls}>
            <h3 className="font-display font-bold text-foreground text-sm mb-2">{cls}</h3>
            <div className="clay-card divide-y divide-black/[0.06]">
              <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                <span>Student</span>
                <span>Attempt status</span>
                <span>Qualify status</span>
              </div>
              {(byClass.get(cls) ?? []).map((s) => (
                <div key={s.studentId} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
                  <span className="text-foreground font-medium">{s.fullName ?? 'Student'}</span>
                  <AttemptChips status={s.iscStatus} />
                  <span className="text-muted">Opens when ISC 2026 launches</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 3: Put the nudge lists on the page**

In `src/app/(coordinator)/coordinator/page.tsx`, add the import:

```ts
import { NeedsNudge } from '@/components/coordinator/needs-nudge'
```

and render it between the stats and the roster:

```tsx
      <CoordinatorStats
        students={students}
        entries={(entries ?? []) as { track: string; status: string }[]}
        deadlines={deadlines}
        now={new Date()}
      />
      <NeedsNudge students={students} />
      <SchoolRoster students={students} />
```

- [ ] **Step 4: Type-check, test, verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm test`
Expected: all tests pass.

At `/coordinator` as an approved coordinator: type part of a student's name and confirm the roster narrows and the count updates; pick a class and confirm only that class's group remains; tick "Only students who have entered" and confirm students with no chips disappear; click Clear filters and confirm everything returns. Check that a name listed under "Sitting on a draft" really does have a yellow chip in the roster below.

- [ ] **Step 5: Commit**

```bash
git add src/components/coordinator/needs-nudge.tsx src/components/coordinator/school-roster.tsx "src/app/(coordinator)/coordinator/page.tsx"
git commit -m "feat: nudge lists and a searchable roster for coordinators"
```

---

## Verification checklist

Run once, after Task 9.

- [ ] `npx tsc --noEmit` is clean
- [ ] `npm test` passes, including the new suites: `submission`, `dates`, `analytics` (isc), `csv`, `analytics` (coordinator), and the extended `validate`
- [ ] `npm run lint` reports no new errors
- [ ] `/admin/isc` as an admin: all six panels render; state and district filters work and the district clears when the state changes; CSV downloads and its row count matches "Showing N of M"
- [ ] `/coordinator` as an **approved** coordinator: tiles, per-championship breakdown with countdowns, class-by-class, nudge lists, searchable roster
- [ ] `/coordinator` as a **pending** coordinator: still shows only the "under review" card — none of the new panels leak through
- [ ] A student saving a draft with some fields blank produces a submission JSONB containing only the filled keys — check the entry's detail panel in `/admin/isc` shows no empty rows
- [ ] `git status` shows nothing staged under `supabase/`
