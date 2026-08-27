# ISC Class Groups & Team Eligibility — Design

**Status:** Approved in conversation 2026-08-26. Sub-project A of four (see Non-goals).

## Overview

ISC 2026 currently treats every eligible student (Classes 5–12) as one pool: any
eligible teammate at the same school can join any team, regardless of class. Sir
has asked for this to split into two groups —

- **Group 1** — Classes 5–8
- **Group 2** — Classes 9–12

— and for a team to only ever contain classmates from the same group. This
document covers making that rule real: where it's enforced, what a student sees,
what admins and coordinators see, and one visual change (the School-screening
card) that rode along with the same conversation.

## Background

No new database column is needed — group is fully determined by the
`school_class` the platform already collects, the same way `isc_class_is_eligible`
already determines whether a student can enter ISC at all
(`supabase/migrations/0049_isc_rpcs.sql:18`).

A live query during design turned up a concrete case the rule has to handle:
DPS Hinjawadi's `entrepreneurship` draft (`a0525bbb-…`) currently has **Maya
Sharma (Class 9) and Sara Khan (Class 7)** on the same team — a cross-group pair
that would be forbidden going forward. It is still a draft, not submitted.
Section "Existing mismatched teams" below is written specifically to make this
entry (and any other like it) resolve itself without a migration script.

## Non-goals

This spec covers **grouping and team eligibility only**. Explicitly out of scope,
each planned as its own sub-project:

- **Invite acceptance** (an add still links instantly, as it does today) —
  sub-project B
- **Submission finality / lock-after-submit / character limits** — sub-project C
- **Video link verification** — sub-project D

## Group definition — single source of truth

**SQL** (`isc_group_for_class`, mirrors the existing `isc_class_is_eligible`
idiom exactly):

```sql
CREATE OR REPLACE FUNCTION public.isc_group_for_class(p_class TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_class IN ('Class 5','Class 6','Class 7','Class 8')   THEN 'group1'
    WHEN p_class IN ('Class 9','Class 10','Class 11','Class 12') THEN 'group2'
    ELSE NULL
  END;
$$;
```

**TypeScript** (`src/lib/isc/groups.ts`, new file):

```ts
export type IscGroup = 'group1' | 'group2'

export const ISC_GROUPS: Record<IscGroup, { label: string; classes: string[] }> = {
  group1: { label: 'Group 1', classes: ['Class 5', 'Class 6', 'Class 7', 'Class 8'] },
  group2: { label: 'Group 2', classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12'] },
}

export function iscGroupForClass(schoolClass: string | null | undefined): IscGroup | null
/** "Group 1 (Classes 5–8)" */
export function iscGroupLabel(group: IscGroup): string
```

Both derivations return `null` for Kindergarten–Class 4 or an unset class — the
same students `isEligibleClass()` already excludes from ISC entirely. Nothing
downstream needs to special-case "no group"; it only ever appears for students
who couldn't enter anyway.

## Enforcement (database)

New migration `0056_isc_groups.sql`. Three existing RPCs change, all via
`CREATE OR REPLACE` (no signature or return-type change, so no `DROP` needed):

**`isc_add_member`** (`0050_isc_team.sql`) — in the "linked" branch (target has
an account), immediately after the existing same-school check, add:

```sql
IF public.isc_group_for_class(v_leader_class)
   IS DISTINCT FROM public.isc_group_for_class(v_target_class) THEN
  RETURN jsonb_build_object('ok', false, 'error', 'wrong_group');
END IF;
```

`v_leader_class` and `v_target_class` are two new lookups (leader's
`school_class`, alongside the existing leader/target queries). The
invite-by-email branch (no account yet) is unchanged — it already can't check
school either, for the same reason: there's nothing to check yet. Group gets
verified when the invite is claimed.

**`isc_claim_invites`** (`0051_isc_claim.sql`) — the `claimable` CTE's `WHERE`
gains one more `AND`, alongside the existing same-school clause:

```sql
AND public.isc_group_for_class(v_class) = public.isc_group_for_class(
  (SELECT p2.school_class FROM public.user_profiles p2 WHERE p2.id = e.created_by)
)
```

(`v_class` is the claiming student's own `school_class`, already selected at the
top of the function.) A group-mismatched invite is left pending, silently — the
exact behavior a school-mismatched invite already gets today. No new copy needed
here; nothing renders to the claimer.

**`isc_submit_entry`** (`0053_isc_consent.sql`) — new hard gate, checked
alongside the existing `wrong_school` defensive check:

```sql
SELECT count(*) INTO v_bad
  FROM public.isc_entry_members m
  JOIN public.user_profiles p ON p.id = m.user_id
 WHERE m.entry_id = p_entry_id
   AND public.isc_group_for_class(p.school_class)
       IS DISTINCT FROM public.isc_group_for_class(v_leader_class);
IF v_bad > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'wrong_group'); END IF;
```

This is what makes the flag-and-fix policy real: a team can stay mismatched as a
draft indefinitely, but it physically cannot be submitted until the leader
removes the odd one out. `v_leader_class` needs adding to this function's
existing `SELECT … INTO` alongside `v_track, v_leader, v_school, v_sub`.

## Existing mismatched teams

No migration touches existing rows. The moment 0056 deploys, Maya's
entrepreneurship draft simply becomes a team that fails the new submit gate and
trips the client-side banner described below — the leader sees why and fixes it
with the Remove button that already exists. Nothing is deleted or auto-changed.

## TypeScript surface (server actions)

`src/app/actions/isc.ts`, `TEAM_ERR` map gains:

```ts
wrong_group: 'That student is in a different group. Teammates must be from the same group as you — Classes 5–8 or 9–12.',
```

No other action signatures change.

## Student UI

**`/isc` landing page** (`src/app/(platform)/isc/page.tsx`) — one line under the
existing `PageHeader`, shown only when `eligible` is true (mirrors the existing
`!eligible` card's gating):

```
You're in Group 2 (Classes 9–12). You can team up with classmates from
Classes 9–12 at your school.
```

Built from `iscGroupForClass(profile.school_class)` + `iscGroupLabel()`, already
fetched on that page.

**`TeamPanel`** (`src/components/isc/team-panel.tsx`) — this is where the rule
actually bites, so it gets two additions, computed entirely from the `members`
prop it already receives (no new data fetch):

1. A line under the existing "You can enter on your own, or with up to N
   classmates…" subtitle: *"This team is Group 2 (Classes 9–12) — teammates
   must be from those classes too."* Derived from
   `members.find(m => m.isLeader)`'s `schoolClass`. (For a solo entry this is
   the viewer's own class, since they're the leader.)
2. A warning banner, shown only when a linked (non-pending) member's group
   differs from the leader's:

   > **Sara Khan is in a different group.** Teams can only include
   > classmates from the same group — remove them before this entry can be
   > submitted.

   One line per mismatched member if there's more than one. Pending
   invited-by-email members (no `schoolClass` yet) are never flagged — their
   group isn't known until they claim the invite, at which point
   `isc_claim_invites` either links them or leaves them pending.

## Admin UI (`/admin/isc`)

- **Filter:** a Group dropdown in `IscFilters`, same query-string pattern as
  State/District/Status (`?group=group1`).
- **Panel:** a "By group" panel in `IscInsights`, same shape as the existing
  "By board" panel — entries / submitted / students per group, via a new
  `byGroup()` function in `src/lib/isc/analytics.ts`.

Both need to know each entry's **leader's** class, which `AnalyticsEntry`
doesn't currently carry (it only has the full `studentIds` roster). Add one
field:

```ts
export interface AnalyticsEntry {
  // ...existing fields
  leaderClass: string | null
}
```

populated in the page from the same `classByStudent` map already built for the
class-distribution panel: `classByStudent.get(r.created_by) ?? null`.

## Coordinator UI (`/coordinator`)

- **Filter:** a Group dropdown added to `SchoolRoster`'s existing
  search/class/only-entered controls (client-side, same pattern).
- **Panel:** a Group 1 vs Group 2 split next to the existing "Class by class"
  panel, via a new `groupParticipation()` function in
  `src/lib/coordinator/analytics.ts` — the same eligible-student set
  `classParticipation()` already uses, bucketed by `iscGroupForClass()` instead
  of raw `schoolClass`.

## School-screening card color

`src/components/isc/how-it-works.tsx` — only the first stage (School
screening — the only one actually open) gets a distinct treatment: a
purple-to-teal gradient wash on the card background plus a matching border,
so it reads as "this one's live" against the two plain grey "not yet" cards.
The existing green "Free to enter" pill is unchanged.

## Testing

- **Unit:** `src/lib/isc/__tests__/groups.ts` — `iscGroupForClass` boundary
  cases (Class 4 → null, Class 5 → group1, Class 8 → group1, Class 9 → group2,
  Class 12 → group2, unset/unknown → null); `iscGroupLabel` output.
- **Unit:** `byGroup()` and `groupParticipation()` aggregation tests, same style
  as the existing `analytics.test.ts` suites.
- **RPC:** verified against the live database inside rolled-back transactions
  (project convention) — a cross-group add is refused with `wrong_group`; a
  same-group add still succeeds; `isc_claim_invites` leaves a cross-group
  invite pending; `isc_submit_entry` refuses a mismatched team and succeeds
  once the odd member is removed.
- **Browser:** confirm Maya's existing mismatched draft shows the banner and
  cannot be submitted; confirm it submits cleanly once Sara is removed; confirm
  the admin/coordinator filters and panels report real numbers.
