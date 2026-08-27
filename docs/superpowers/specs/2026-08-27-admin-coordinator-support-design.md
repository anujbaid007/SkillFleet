# Admin ↔ Coordinator Support Messaging — Design

**Status:** approved design, not yet planned or built
**Date:** 2026-08-27
**Scope:** two-way, asynchronous messaging between admin and approved coordinators —
an admin support inbox and a "message this coordinator" action on the existing
Coordinators page, and a new "Contact Admin" page inside the coordinator console.

---

## Goal

Right now a coordinator with a question has no way to reach admin inside the product,
and admin has no way to reach a coordinator either — everything happens outside
SkillFleet, informally. This adds a real, in-app conversation between admin and each
approved coordinator: either side can write first, both sides can see the whole
history, and admin can see every conversation in one place rather than one at a time.

## What this is not

- **Not real-time chat.** No typing indicators, no instant delivery, no websockets.
  This project has zero realtime infrastructure anywhere (confirmed: no
  `.channel(...)` / Supabase Realtime usage exists), and every other "did something
  change" moment here already works by reloading — the ISC invite banner is the
  precedent: *"they see the change next time they load."* This follows the same
  pattern rather than introducing new infrastructure for one feature.
- **Not email.** Admin's contact email/phone shown to a coordinator is plain display
  text (plus a `mailto:`/`tel:` link, which opens the coordinator's own mail app) —
  the platform itself sends nothing. This project has no email-sending capability at
  all (no provider, no SMTP, no API key — noted explicitly in the original ISC
  design), and adding one is out of scope here.
- **Not coordinator-to-coordinator.** Only admin ↔ coordinator.
- **Not available before approval.** A pending or rejected coordinator's console
  stays closed today (`(coordinator)/layout.tsx` gates everything but the base
  `/coordinator` status page behind `coordinator_status = 'approved'`). Support
  messaging lives inside that same gate — see "Why only approved coordinators" below.

## Decisions taken during brainstorming

| Decision | Choice | Why |
|---|---|---|
| Admin's first card | A support inbox, not a reuse of the applications list | The applications list already answers "who applied"; a separate inbox answers "who is waiting on a reply", which is a different question with a different sort order (most recent message, not application date) |
| Existing Coordinators page | Unchanged — tabs and application list stay exactly as they are | Confirmed explicitly; the two cards are additive, not a replacement |
| Who can message first | Either side | An approved coordinator gets "Contact Admin" in their own nav the moment their console opens — they don't have to wait for admin to reach out |
| Admin contact info | Editable in the admin dashboard, not hardcoded | Chosen over a fixed constant so support contact details can change without a code deploy |
| Conversation scope | Only approved coordinators can be messaged or have a conversation | A pending or rejected coordinator's console is closed, so a message sent to them would be unreadable until they're approved — restricting to approved coordinators avoids ever creating a message nobody can see |

## Why only approved coordinators

`CoordinatorNav` already renders nothing but a waiting notice for an unapproved
coordinator (`coordinator-nav.tsx:15-19`). If admin could message a pending applicant,
that message would sit unread with no UI to show it until approval — a real gap, not
a hypothetical one. Restricting both directions (admin's "Message" action, and the
coordinator's own "Contact Admin" nav item) to `coordinator_status = 'approved'`
avoids the gap entirely rather than patching around it later.

---

## Data model

Two new tables, following the project's existing conventions exactly — `SECURITY
DEFINER` RPCs for every write (matching `isc_entries`), plain RLS `SELECT` policies
for reads (no RPC needed to read, matching how the admin ISC page already reads
`isc_entries` directly), and a single-row admin-editable config table shaped exactly
like the existing `baseline_config` (`0001_initial_schema.sql`).

```sql
CREATE TABLE public.support_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id   UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.support_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES auth.users(id),
  sender_role      TEXT NOT NULL CHECK (sender_role IN ('admin', 'coordinator')),
  body             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at          TIMESTAMPTZ  -- set when the OTHER party opens the thread
);

CREATE TABLE public.support_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_contact_email  TEXT,
  admin_contact_phone  TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Seeded with exactly one row, same idiom as baseline_config.
INSERT INTO public.support_config DEFAULT VALUES;
```

**Conversation identity is the coordinator's `auth.users.id`, not the school.** A
coordinator keeps one continuous thread even if their school claim later changes —
`apply_as_coordinator` already clears a coordinator's prior claim when they apply
elsewhere (`0047_coordinators.sql:126-128`), so keying on the school would fragment
one person's history across claims for no reason.

### RLS

```sql
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_config        ENABLE ROW LEVEL SECURITY;

-- Reads only; every write goes through an RPC below.
CREATE POLICY "Own conversation or admin" ON public.support_conversations
  FOR SELECT USING (coordinator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Own conversation's messages or admin" ON public.support_messages
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_conversations c
       WHERE c.id = conversation_id AND c.coordinator_id = auth.uid()
    )
  );

-- Every signed-in coordinator can read admin's contact details; only admin can change them.
CREATE POLICY "Anyone signed in reads support config" ON public.support_config
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins update support config" ON public.support_config
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
```

### RPCs

Two send RPCs rather than one parameterised one, matching how `isc_save_entry` and
`isc_submit_entry` stay separate actions rather than one function branching on a
flag — each has its own authorization check and neither needs to guess who's calling.

| RPC | Caller | Purpose |
|---|---|---|
| `support_coordinator_send_message(p_body TEXT)` | Coordinator | Re-checks `role = 'coordinator'` and `coordinator_status = 'approved'` (via `get_my_coordinator_school()`'s existing logic). Creates the conversation on first use (`INSERT ... ON CONFLICT (coordinator_id) DO NOTHING`), inserts the message, bumps `last_message_at`. |
| `support_admin_send_message(p_coordinator_id UUID, p_body TEXT)` | Admin | Re-checks `is_admin()` and that `p_coordinator_id` is currently an approved coordinator. Same create-on-first-use + insert + bump. |
| `support_mark_thread_read(p_conversation_id UUID)` | Either | Coordinator: marks messages in their own conversation with `sender_role = 'admin'` as read. Admin: marks messages in the given conversation with `sender_role = 'coordinator'` as read. Called once when a thread view mounts. |

All three `SECURITY DEFINER`, `SET search_path = ''`, every identifier schema-qualified
— the standing convention in every migration in this project.

Unread counts need no RPC: `SELECT count(*) ... WHERE read_at IS NULL AND sender_role
= 'coordinator'` (for admin) or `= 'admin'` (for a coordinator, on their own
conversation) is already safe under the RLS above.

---

## Screens

### Admin: two cards on the existing `/admin/coordinators` page

Added above the existing status tabs, which are untouched:

- **Card 1 — Support Inbox** (`/admin/coordinators/support`). Every *conversation
  that has actually started* — an approved coordinator nobody has written to yet has
  no row here at all, since a conversation only exists once either side sends a first
  message. Sorted by `last_message_at` descending: coordinator name, school, a
  one-line preview of the last message, and an unread badge if coordinator messages
  are unread. Clicking opens the thread. Starting a fresh conversation with someone
  not yet in this list is what Card 2 is for.
- **Card 2 — Message a coordinator.** Links to the already-existing
  `/admin/coordinators?status=approved` view. `CoordinatorClaimRow` gains a
  "Message" button, shown only when `coordinatorStatus === 'approved'` (see "Why only
  approved coordinators"), linking to the same thread view as Card 1's rows. This
  reuses the existing approved-coordinators list rather than building a second one.

Both doors lead to the same **thread view**
(`/admin/coordinators/support/[coordinatorId]`): message history oldest-first, a
plain textarea + send button, calling `support_admin_send_message`.
`support_mark_thread_read` fires once on mount.

### Coordinator: "Contact Admin"

New item in `CoordinatorNav`'s `items` array (`coordinator-nav.tsx:9`), alongside
`Dashboard`, gated by the same `approved` prop the component already receives — no
new gating logic needed, it falls under the existing `{(approved ? items : [])}` line.
Carries an unread badge the same way, computed from their own conversation.

`/coordinator/support` shows:
- Admin's email and phone, read from `support_config`, each as a live `mailto:`/`tel:`
  link
- The same thread component as the admin side, scoped to their own conversation,
  calling `support_coordinator_send_message`

### Admin: editing the contact info

A small inline-editable block at the top of the Support Inbox page (`/admin/coordinators/support`)
— two text fields (email, phone) and a save button, writing directly to
`support_config` under its `UPDATE` RLS policy. No RPC needed; this is the same shape
as `ParameterRow`'s existing inline-edit pattern in the admin Parameters page.

---

## Unread handling

No push notifications, matching every other async moment in this project. Each side
sees an unread badge computed on page load:

- **Admin:** a badge on Card 1 (Support Inbox) with the total count of conversations
  containing at least one unread coordinator message, and a per-row unread marker
  inside the inbox list itself.
- **Coordinator:** a badge next to "Contact Admin" in `CoordinatorNav`, counting
  unread admin messages in their one conversation.

Opening a thread calls `support_mark_thread_read` once, which is what clears the
badge on the next page load — there is no live update while the thread is open,
consistent with the no-realtime decision above.

---

## Testing

**Unit** (`src/lib/support/__tests__/`, mirroring `src/lib/isc/__tests__/` conventions):
- Unread-count derivation from a plain array of messages (if this logic ends up
  needing its own pure function rather than being a straight SQL count — decided
  during planning)

**Integration, against the live database in a rolled-back transaction** (the
established project pattern):
- A coordinator can send a message; a second coordinator cannot read the first
  coordinator's conversation
- Admin can read and send in any coordinator's conversation
- `support_coordinator_send_message` refuses for a pending or rejected coordinator
- `support_admin_send_message` refuses when `p_coordinator_id` is not currently
  approved
- The conversation is created lazily on first message from either side, not before
- `support_mark_thread_read` only clears messages sent by the *other* role, never
  the caller's own messages
- A non-admin, non-coordinator (e.g. a student) can read and write nothing here
- Only `is_admin()` can update `support_config`; any signed-in user can read it

**Manual, in the browser** — with disposable admin and coordinator accounts (same
throwaway-account discipline as prior sub-projects): coordinator sends the first
message from `/coordinator/support`, confirm it appears in admin's Support Inbox with
an unread badge; admin replies, confirm the coordinator's badge appears on next load
and the reply reads correctly; admin starts a conversation first from Card 2 on an
approved coordinator with no prior messages, confirm it's created correctly; confirm
a pending coordinator has no "Contact Admin" item and no "Message" button appears for
them on the admin side; admin edits the contact email/phone, confirm the coordinator's
`/coordinator/support` page reflects it immediately on reload.

---

## Size

Medium — roughly seven tasks: the migration (tables, RLS, three RPCs), the shared
thread-view component (used identically by both sides), the admin Support Inbox page
and its unread-badge logic, the "Message" button added to `CoordinatorClaimRow` plus
the admin thread page, the coordinator's `/coordinator/support` page and nav entry,
and the admin contact-info edit block. Sequenced so the schema and RPCs land first,
then the shared thread component (provably correct against real data before either
page consumes it), then the two page-level integrations in either order.

## Open items

- **Unread-count SQL vs. a pure TypeScript function** — left to planning: if the
  count is simple enough to compute in the page query directly (`count(*) ...`),
  no new `src/lib/support/` module is needed at all; only add one if the logic turns
  out to need testing in isolation.
