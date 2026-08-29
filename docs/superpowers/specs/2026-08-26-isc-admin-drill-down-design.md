# ISC 2026 Admin Drill-Down Analytics — Design

**Status:** approved design, not yet planned or built
**Date:** 2026-08-26
**Scope:** replaces `/admin/isc`'s flat entry list + static panels with a breadcrumb
drill-down (National → State → District → School), a per-scope funnel, a student
roster and profile at the school level, and outreach worklists at every level above
school.

---

## Goal

Today's `/admin/isc` shows a single flat list of entries plus a handful of panels that
describe the *whole* cycle regardless of which filters are applied — an admin who
filters to one state still sees national numbers, and there is no way to zoom into one
state or one school and see its own picture. There is also no way to tell, from the
entry list, whether a student is competing solo by design, still waiting on teammates
to accept an invite, or has not touched ISC at all. This design turns the page into a
proper drill-down: admin picks a scope (national, a state, or a school within it), and
everything on screen — funnel, team health, outreach — describes that scope, with
filters narrowing further *within* it rather than being disconnected from it.

## What this is not

Explicitly deferred, so the build stays focused:

- **Participation rate framing, deadline-aware urgency, and judging-readiness** —
  bundled as one option during scoping and not selected. The funnel below already
  carries the raw numbers these would be computed from, so none of it is blocked;
  it is simply not this build.
- **Sub-project D (video link verification)** — a separate, already-deferred piece of
  work, unrelated to analytics.
- **Judging, scoring, or any write path.** This page stays strictly read-only, matching
  the existing admin entry list.

## Source of truth

The existing `/admin/isc` page (`src/app/(admin)/admin/isc/page.tsx`) and its data
layer (`src/lib/isc/analytics.ts`), plus the schema from
`2026-08-24-isc-2026-entries-design.md` and `0047_coordinators.sql`. No new tables or
RPCs are needed anywhere in this design — every read below already succeeds today
under existing RLS, confirmed by the fact that the current admin page already queries
`isc_entries`, `isc_entry_members`, `schools`, and `user_profiles` directly as the
signed-in admin, and by the `"Admins read all profiles"` policy on `user_profiles`
(`0001_initial_schema.sql`) giving full read access to the eligible-student
population, not just students who have entered ISC.

---

## Navigation: nested routes, not query-string scope

```
/admin/isc                                                          National
/admin/isc/state/[state]                                            One state
/admin/isc/state/[state]/district/[district]                        One district
/admin/isc/state/[state]/district/[district]/school/[schoolId]      One school
```

Real Next.js routes rather than a `?state=&district=&school=` query string, so
**scope** (which URL you're on) stays a distinct concept from **filters**
(track/status/group/language/search — still query-string, unchanged, and still apply
at every scope level). Mixing the two into one query-string namespace was the shortest
path back to today's confusion. Nested routes also make a drilled-down view a real,
bookmarkable, shareable link — "look at Pune" becomes a URL, not a sequence of clicks
someone has to redo.

**District is its own drill level, not a filter.** The initial design treated it as a
filter inside the state level, on the reasoning that a state has few enough schools to
browse directly. That does not hold going forward: the school roster is expected to
grow substantially as more schools onboard, and a state's school count will get too
large to browse as one flat comparison chart — exactly the situation a district level
exists to solve, the same way state exists to avoid one 12,000-school national chart.
Since districts have no independent record elsewhere in the schema (schools carry a
`district` text column, not a foreign key to a `districts` table), the district
"page" is not backed by a district id — it is `[state]/district/[districtName]`,
scoped by exact string match on `schools.district`, same as the state segment is
already scoped by exact match on `schools.state`.

**Shared shell**, reused at all four levels:

- A breadcrumb (`National / Maharashtra / Pune / DAV Public School`), each segment a
  link up
- A "Current Focus" line naming the exact scope, so it is never ambiguous which numbers
  are on screen
- The funnel tiles (see below)
- A comparison chart of the level below — state bars nationally, district bars within
  a state, school bars within a district — each bar a link that drills one level down
- The existing filter bar, now narrowing *within* the current scope (no `district`
  filter option anymore — narrowing by district is now a click into that district's
  page, not a dropdown)

At the school level, the comparison chart and "drill deeper" affordance are replaced by
the student roster (below), since there is nowhere further down to go.

---

## The funnel: eligible → started → submitted

Computed **per scope** (recomputed, not filtered, at national/state/district/school —
each level re-runs the same aggregation over just its own students):

- **Eligible** — students in scope with an eligible `school_class`, from
  `user_profiles` scoped by `school_id` (school level), by `state` + `district`
  (district level), or by `state` alone (state level)
- **Started** — of those, the ones appearing anywhere in `isc_entry_members`, as
  leader or teammate, on any entry regardless of status
- **Submitted** — of those, the ones on at least one entry with `status = 'submitted'`

This is a **per-student** count, not per-entry: a submitted team of four is four
students reached, not one row. That is the number that answers the outreach question
this whole page exists to answer.

Each scope shows three headline numbers plus two rates — **activation**
(started ÷ eligible) and **completion** (submitted ÷ started) — and a per-track
breakdown underneath, which is entry-level and will not sum to the headline (a student
can start more than one track); the panel carries a one-line note saying so, so it does
not read as broken math.

The comparison chart (state bars / district bars / school bars) is driven by
**submitted** count by default, matching how `topSchools` already ranks today.

---

## Student roster and profile (school level)

This is the direct answer to the confusion this design started from: today's entry row
only ever says `"team of {n}"` — never who else is on it, whether they've accepted, or
whether `n=1` means solo-by-design or a group track nobody else has joined yet.

At the school level, in place of a flat entry list, admin sees **every eligible
student at that school**, including the ones with zero ISC activity — not just the
ones who happen to have an entry. Each row carries an at-a-glance status chip:

| Chip | Meaning |
|---|---|
| `Solo entry · Submitted` / `Draft` | Track's max team size is 1, or the student chose to run alone on a group track |
| `Team of 3/4 · Draft` | Group entry, under the cap, not yet submitted |
| `Invited · Awaiting response` | Someone invited them; they have not accepted or declined |
| `Not started` | Eligible, no ISC footprint at all |

Clicking a student opens their **profile**:

- Identity: name, class, school, state/district
- One block per track they touch in any role — leader, teammate, or pending invitee —
  each showing entry status, and the full team roster with every teammate's accept
  state (`accepted` / `pending` / `declined`), set against the track's actual max team
  size so `"1 of up to 4, invites pending"` reads differently from `"1 of 1, solo by
  design"`
- Their submitted answers and links, the same expandable block the current
  `IscEntryRow` already renders for admin, scoped to just this student's entries
- A plain "Not started any ISC track" state if they have never touched it

No new query shape: `isc_entry_members` already carries `invitedEmail`, `inviteToken`,
`isLeader`, `acceptedAt` (`IscMember` in `src/app/actions/isc.ts:113-131`); the roster
adds a join against `user_profiles` for the school's full eligible population, which
the entries table alone cannot surface (a student with zero entries has no row there
today).

This view **is** "team & invite health" at its most useful grain — there is no separate
aggregate panel for it beyond what the roster already makes visible per student. A
state or national rollup of "how many pending invites are stuck" is a straightforward
count over the same data if it turns out to be wanted later, but is not part of this
build: nothing here blocks adding it.

---

## Outreach lists: cold schools + coordinator coverage

Rendered at **National, State, and District levels** — at school level there is
exactly one school on screen, so a "cold schools" list of one adds nothing. Adding the
district level here follows the same growth reasoning as the navigation change: once a
state has enough schools to need a district breakdown, a district-scoped outreach
worklist becomes exactly the size a coordinator-recruitment volunteer working one
district would actually want, rather than making them wade through the whole state's
list.

**Cold schools** — schools with at least one eligible student account but **zero ISC
starts** (no entries at all, draft or submitted). Deliberately excludes schools with no
student accounts at all, since that is an onboarding gap outside what this page can
act on. Columns: school name, state/district, eligible-student count, coordinator
status. Sorted by eligible count descending, so the biggest missed opportunity surfaces
first.

**Coordinator coverage** — every school in scope, split by `coordinator_status`
(`none` / `pending` / `approved`, `0047_coordinators.sql`):

- `none` — nobody has applied; no local contact exists to lean on for outreach
- `pending` — someone applied and is waiting on admin's own review
- `approved` — covered

The two lists render side by side so the correlation (cold schools clustering under
`coordinator_status = 'none'`) is visible without a separate stat. Both get a CSV
export via the existing `IscExport` pattern, since these are worklists someone acts on
outside the app.

---

## Data layer

Everything is a pure aggregation function over already-fetched arrays, matching how
`analytics.ts` already works — no async, no new fetches inside the aggregation
functions themselves, all inputs assembled once per page load.

**Extended in `src/lib/isc/analytics.ts`** (kept, since `byState`/`topSchools` are
reused as-is for two of the three comparison charts):
- One new export, `byDistrict(entries: AnalyticsEntry[]): DistrictRow[]` — the district
  equivalent of `byState`, grouping on `e.district` instead of `e.state`, for the
  state-level comparison chart. Everything else is unchanged; the new files below
  consume the same `AnalyticsEntry[]` shape plus one new input.

**New — `src/lib/isc/funnel.ts`**
- `type EligibleStudent = { id: string; schoolId: string; state: string }`
- `computeFunnel(eligible: EligibleStudent[], entries: AnalyticsEntry[]): FunnelResult`
  — returns `{ eligible, started, submitted, activationRate, completionRate,
  byTrack: CountRow[] }`, scoped by whatever subset of `eligible`/`entries` the caller
  has already filtered down to (national = everything, state = pre-filtered by
  `state`, school = pre-filtered by `schoolId`)

**New — `src/lib/isc/roster.ts`**
- `type RosterStudent = EligibleStudent & { name: string; schoolClass: string | null }`
- `buildSchoolRoster(students: RosterStudent[], members: IscMember[], entries: ...): RosterRow[]`
  — one row per eligible student at a school, each carrying its status chip and the
  data the profile view needs, keyed so the profile is `rosterRow` for one student id

**New — `src/lib/isc/outreach.ts`**
- `coldSchools(schools: SchoolWithCoordinator[], entries: AnalyticsEntry[], eligibleBySchool: Map<string, number>): ColdSchoolRow[]`
- `coordinatorCoverage(schools: SchoolWithCoordinator[]): CountRow[]` (by
  `coordinator_status`)

Each function is independently unit-testable exactly like `byState`/`byGroup` today —
plain input arrays in, a plain result out, no mocking required.

---

## Screens and files

```
src/app/(admin)/admin/isc/page.tsx                                              National (rebuilt)
src/app/(admin)/admin/isc/state/[state]/page.tsx                                State (new)
src/app/(admin)/admin/isc/state/[state]/district/[district]/page.tsx            District (new)
src/app/(admin)/admin/isc/state/[state]/district/[district]/school/[schoolId]/page.tsx   School (new)

src/components/admin/isc-dashboard-shell.tsx     Breadcrumb + Current Focus + funnel tiles
src/components/admin/isc-comparison-chart.tsx     State/district/school bar chart, bars link down
src/components/admin/isc-funnel-panel.tsx         Eligible/Started/Submitted + rates + by-track
src/components/admin/isc-roster.tsx               School-level student list with status chips
src/components/admin/isc-student-profile.tsx      Per-track breakdown, team roster, submissions
src/components/admin/isc-outreach.tsx             Cold schools + coordinator coverage, side by side
```

`isc-entry-row.tsx` and `isc-stats.tsx` are retired: the roster/profile pair replaces
the flat entry list, and the funnel panel replaces the old stats panel. `isc-filters.tsx`
and `isc-export.tsx` are reused unchanged — filters still narrow within whatever scope
is current, export still takes whatever rows are currently visible.

`isc-insights.tsx` (board split, class distribution, submission timeline, stale
drafts) is **kept, not retired** — it was already built and none of it was asked to go
away. It moves inside the shared shell and receives the same scoped `entries` slice
every other panel gets, so a state's insights panel shows that state's board split and
timeline rather than the national one — the exact "filters don't change the numbers"
complaint this design fixes applies here too, and the fix is the same: scope the input,
not the panel.

Each of the four page files fetches the same base data (entries, members, schools,
eligible students) scoped progressively narrower by an added `.eq('state', ...)` /
`.eq('district', ...)` / `.eq('school_id', ...)`, then hands it to the shared shell and
panels — no route-specific aggregation logic, only route-specific fetch scoping.

---

## Testing

**Unit** (`src/lib/isc/__tests__/`):
- `funnel.test.ts` — activation/completion rates at boundary values (zero eligible,
  zero started, everyone submitted); a student started in two tracks still counts once
  in the headline `started` number; per-track breakdown sums independently of the
  headline
- `roster.test.ts` — every status chip case (solo-by-design vs. solo-so-far, pending
  invite, not started); a student who is a teammate on one track and leader on another
  gets both blocks in their profile
- `outreach.test.ts` — a school with accounts but zero entries is cold; a school with
  zero accounts is excluded; coordinator coverage buckets sum to the total school count

**Manual, in the browser** — drill from `/admin/isc` into a state with real data, then
a district within it, then one of its schools; confirm the funnel numbers actually
change at every step (the bug this design fixes); open a student with a pending invite
and confirm the chip and profile agree; open a student with zero ISC activity and
confirm the empty state reads correctly; export the outreach lists at all three levels
and confirm the CSVs match what's on screen.

---

## Size

Large — roughly ten tasks: the three aggregation files (funnel/roster/outreach,
including the new `byDistrict`) with their unit tests, the shared dashboard shell, the
comparison chart, the roster and profile components, the outreach panel, and finally
the four page files wiring everything together with progressively scoped fetches.
Sequenced so the national page is rebuilt on the new shell first (immediately testable
against real data), then state, district, and school pages are added as thin wrappers
around the same shell once it is proven.

## Open items

- **Team/invite health rollups above the school level** (e.g. "12 stuck invites
  nationally") are not part of this build; the school-level roster already exposes the
  underlying data if this is wanted later.
