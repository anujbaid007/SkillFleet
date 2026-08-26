# ISC Invite Acceptance — Design

**Status:** Approved in conversation 2026-08-26. Sub-project B of four (see the
[class groups spec](./2026-08-26-isc-class-groups-design.md) for the other
three and why the work is split this way).

## Overview

Right now, adding a teammate who already has a SkillFleet account is instant —
the moment a leader types their email and it resolves to a real user,
`isc_add_member` links them to the team with no confirmation. Sir has asked
for that to require the invited student's explicit agreement before they
count as being on the team.

## Background

Two existing paths create a linked team member, and both currently skip
consent:

1. **Add by email, account already exists** — `isc_add_member` inserts the
   row with `user_id` set. Done. The invitee finds out only by noticing it
   later.
2. **Invite by email, no account yet** — `isc_add_member` creates a pending
   row keyed by `invited_email`. When that person signs up, `isc_claim_invites`
   silently links `user_id` the moment the email matches — again with no
   explicit step from them.

Confirmed in conversation: **both paths get the same fix.** There is one
state machine, not two — "how the row got a `user_id`" stops mattering the
moment it has one; from there, every path converges on the same pending →
accepted transition.

Two reads already exist that currently treat "has a `user_id`" as "is on the
team," and both would start over-counting the moment linking stops being
instant if left unchanged:

- `get_school_roster()` — the coordinator's Attempt Status column
- `isc_get_my_entries()` — drives the student's own `/isc` track cards

## Non-goals

- **No notification to the leader** when someone accepts or declines. They
  see the change next time they load `TeamPanel` — matching how nothing else
  in ISC pushes notifications today.
- **No pending-vs-accepted distinction on the admin or coordinator side.**
  Admin doesn't render team members at all currently; the coordinator fix
  below (excluding pending rows from Attempt Status) is the only correctness
  requirement there, not a new UI.
- **No restriction on a pending invitee viewing the entry.** `isc_is_member()`
  already grants read access the moment `user_id` is set, before acceptance —
  left as-is. Seeing the draft they're being asked to join is harmless and
  arguably helps them decide; accept/decline itself happens from a banner on
  `/isc`, not from the track page.
- Track-page navigation from the invite banner is out of scope — accept or
  decline happens right on the banner.

## Data model

One migration (next available: `0057_isc_invite_accept.sql`). One column,
matching the codebase's existing idiom exactly — `submitted_at`,
`consent_given_at`, `edited_at` are all nullable "when did this happen"
timestamps, never string statuses:

```sql
ALTER TABLE public.isc_entry_members ADD COLUMN accepted_at TIMESTAMPTZ;
```

`NULL` = pending, non-null = accepted. Three states for a row with `user_id`
set:

| State | `user_id` | `accepted_at` |
|---|---|---|
| Leader | set, own id | set at creation |
| Invited, awaiting response | set | `NULL` |
| Invited, accepted | set | set |

The unregistered-invite state (`invited_email` set, `user_id` `NULL`) is
unchanged.

**Backfill is required, not optional.** Every row already linked under the
old instant-join behavior must not retroactively become "pending" the moment
this ships — that would silently knock every existing confirmed teammate off
every roster and track card:

```sql
UPDATE public.isc_entry_members
   SET accepted_at = created_at
 WHERE user_id IS NOT NULL AND accepted_at IS NULL;
```

## RPC changes

**`isc_add_member`** — the "linked" branch stops linking. It inserts with
`accepted_at` left `NULL` and returns a new state, `'awaiting_accept'`,
distinct from the existing `'invited'` (unregistered-email) state — the
leader's UI needs to tell these apart: `'invited'` shows a shareable link and
token; `'awaiting_accept'` shows nothing to share, because the invitee will
see their own banner on `/isc`.

**`isc_claim_invites`** — unchanged except it no longer marks the row
resolved. It still sets `user_id` and clears `invited_email`/`invite_token`
(claiming *is* real progress — the row now belongs to a real account), but
leaves `accepted_at NULL`. A claimed invite lands in exactly the same
awaiting-response state as a directly-added one.

**New: `isc_respond_to_invite(p_member_id UUID, p_accept BOOLEAN)`** — called
by the invited student, not the leader.

1. Row must exist, have `user_id = auth.uid()`, and `accepted_at IS NULL`
   (idempotency — a double-click can't re-resolve an already-resolved
   invite).
2. Track must still be open (`isc_is_open`), same as every other mutating
   ISC RPC.
3. **Re-checks group and school** — the same `wrong_school` /
   `wrong_group` gates `isc_add_member` already applies, re-run here as
   defense in depth against a profile edit landing between invite and
   accept. On failure: return the error, **leave the row untouched** so the
   banner can show a real message instead of the invite silently
   vanishing.
4. Accept: `UPDATE … SET accepted_at = now()`. Decline: `DELETE FROM
   isc_entry_members WHERE id = p_member_id` (confirmed: declining frees the
   slot immediately, no residue, matching how Remove already works).
5. Returns `{ok, action: 'accepted' | 'declined', entry_id, track}` — the
   client needs `entry_id`/`track` to know what to revalidate, since this
   fires from `/isc`, not the track page.

**New: `isc_get_my_invites()`** — every pending invite for the caller:
`isc_entry_members` rows where `user_id = auth.uid()`, `accepted_at IS
NULL`, `is_leader = false`, joined to `isc_entries` (track) and the leader's
`user_profiles.full_name`.

**`get_school_roster()`** — the `isc_status` subquery gains one clause:
`AND m.accepted_at IS NOT NULL`.

**`isc_get_my_entries()`** — same clause added to its `WHERE`. Leader rows
are unaffected (`accepted_at` is always set at creation for them); this only
removes a still-pending invite from a student's own "my championships" list,
which is correct — it isn't one of their entries until they've accepted it.

**`isc_get_entry()`** — the leader's view is otherwise unchanged (still
returns every member, pending or not — the leader needs to see who hasn't
responded), but its `members` JSON gains `'accepted_at', m.accepted_at` so
the UI can tell the three states apart.

**Unchanged, already correct:** `team_full` (`count(*)` already includes
pending rows, correctly reserving the slot the moment an invite goes out);
`already_in_track`; `isc_remove_member` (an unconditional delete by row id —
a leader cancelling a pending invite is just Remove, no new code needed);
`isc_is_member` (grants read access on `user_id` alone, deliberately
unchanged per Non-goals).

## TypeScript surface

`IscMember` (`src/app/actions/isc.ts`) gains `acceptedAt: string | null`,
mapped straight from `isc_get_entry`'s new field.

`addMemberAction`'s success copy branches on the RPC's returned `state`:

- `'awaiting_accept'` → *"{name} has been invited — waiting for them to
  accept."*
- `'invited'` (unregistered) → unchanged from today: *"{email} is not
  registered on SkillFleet yet — …"*

New `getMyPendingInvites(): Promise<PendingInvite[]>` wraps
`isc_get_my_invites`, returning `{memberId, entryId, track, leaderName}`.

New `respondToInviteAction(prev, formData)` wraps `isc_respond_to_invite`,
dispatched on an `intent` field (`'accept' | 'decline'`) exactly the way
`entryFormAction` already dispatches `save`/`submit` — the established
pattern in this codebase for one action serving two button-triggered
branches.

## UI

**`TeamPanel`** — the member row's icon/label mapping grows a third case:

| Row state | Icon | Label |
|---|---|---|
| `userId` set, `acceptedAt` set | green check | (unchanged — name only) |
| `userId` set, `acceptedAt` null | clock | *"Invited — waiting for them to accept"* |
| `userId` null (`invitedEmail` set) | clock | *"not registered yet — invite sent"* (unchanged) |

The leader can still press Remove on a pending row — that's how an invite
gets cancelled.

**`/isc` landing page** — new `PendingInvites` component rendered above
`HowItWorks`, right where the group line already sits. One card per pending
invite: *"{leaderName} invited you to join {track name}"* with Accept /
Decline buttons. Declining removes the card immediately (the row is gone);
accepting removes the card and the corresponding track card updates to
reflect the now-joined team on next load.

## Testing

- **RPC, verified against live data in rolled-back transactions** (project
  convention): `isc_add_member` on an existing account returns
  `awaiting_accept` and leaves `accepted_at NULL`; `isc_respond_to_invite`
  with `p_accept = true` sets it and is idempotent-safe (a second call
  returns an error, not a silent no-op); `p_accept = false` deletes the row;
  a re-check failure (constructed by moving the invitee's class into the
  other group between invite and accept, same isolating-control technique
  used in sub-project A) leaves the row untouched and returns the error.
- **Backfill:** confirm every pre-existing linked row got `accepted_at =
  created_at`, and that no existing team looks like it needs re-accepting
  after the migration lands.
- **Reads:** `get_school_roster()` and `isc_get_my_entries()` both exclude a
  freshly-created pending row and include it the moment it's accepted.
- **Browser:** the full loop with a disposable leader + disposable invitee
  account (same throwaway-account discipline as sub-project A — no real
  seeded account's credentials touched): send an invite, confirm the
  leader's message and `TeamPanel` row; log in as the invitee, confirm the
  `/isc` banner, decline it, confirm it's gone from both sides; repeat and
  accept, confirm the invitee's own track card and the leader's `TeamPanel`
  both reflect it.
