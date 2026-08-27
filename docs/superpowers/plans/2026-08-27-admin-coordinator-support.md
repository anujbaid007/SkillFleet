# Admin-Coordinator Support Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two-way, asynchronous messaging between admin and approved coordinators — an admin Support Inbox, a "Message" action on the existing Coordinators applications list, and a new "Contact Admin" page in the coordinator console.

**Architecture:** Two new tables (`support_conversations`, `support_messages`) plus a single-row admin-editable `support_config` table for contact details, all behind RLS `SELECT` policies with every write going through a `SECURITY DEFINER` RPC — exactly the pattern `isc_entries` already uses. One shared `SupportThread` client component renders the message history and composer identically for both sides; only which server action it posts to differs.

**Tech Stack:** Next.js 16 App Router (Server Components for data, one shared Client Component for the thread), Supabase Postgres + RLS, `useActionState` server actions matching `reviewCoordinatorClaimAction`'s existing shape.

**Spec:** `docs/superpowers/specs/2026-08-27-admin-coordinator-support-design.md`

## Global Constraints

- No realtime/websockets — every screen reads on page load, matching the rest of this project (the ISC invite banner: *"they see the change next time they load"*).
- No email is ever sent by the platform — admin's contact info is display text plus `mailto:`/`tel:` links only.
- Coordinator-to-coordinator messaging is out of scope — admin ↔ coordinator only.
- A conversation only exists once either side sends a first message; an approved coordinator nobody has written to has no row anywhere.
- Both send RPCs refuse unless the coordinator's `coordinator_status = 'approved'` — a pending or rejected coordinator's console cannot show a message (`(coordinator)/layout.tsx` gates everything but the base status page behind `approved`), so refusing here is the honest failure mode, not a patch.
- Every RPC: `SECURITY DEFINER`, `SET search_path = ''`, every identifier schema-qualified (`public.table`) — the standing convention in every migration in this project.
- The migration file is **not committed to git** — `supabase/` is gitignored in this project; it is applied to the live database via the Management API (`sbq.ps1` in the session scratchpad) and never `git add`ed. Every other file in this plan is committed normally.
- The existing `/admin/coordinators` page (tabs + application list) is unchanged — the two new cards are additive.

---

### Task 1: Schema, RLS, and RPCs

**Files:**
- Create (local only, not committed): `supabase/migrations/0061_support_messages.sql`

**Interfaces:**
- Produces: tables `support_conversations`, `support_messages`, `support_config`; RPCs `support_coordinator_send_message(p_body TEXT) RETURNS TEXT`, `support_admin_send_message(p_coordinator_id UUID, p_body TEXT) RETURNS TEXT`, `support_mark_thread_read(p_conversation_id UUID) RETURNS TEXT` — consumed by Task 2's server actions.

There is no failing-test-first cycle for a brand-new migration — there is nothing to fail against yet. Instead: write it, apply it, then verify with real queries against the live database in rolled-back transactions, the established pattern in this project (`DO $$ ... RAISE EXCEPTION '%', chr(10) || out_txt; END $$;` always rolls back; impersonation via `set_config('request.jwt.claims', json_build_object('sub', <uuid>, 'role','authenticated')::text, true)`, never `set_config('role', ...)`).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0061_support_messages.sql
-- Admin <-> coordinator support messaging. One conversation per coordinator
-- (keyed on auth.users id, not school — apply_as_coordinator already clears a
-- coordinator's prior claim when they apply elsewhere, so keying on school_id
-- would fragment one person's history for no reason). Reads go straight
-- through RLS; every write goes through a SECURITY DEFINER RPC, matching how
-- isc_entries already works.

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
  body             TEXT NOT NULL CHECK (length(BTRIM(body)) > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at          TIMESTAMPTZ  -- set when the OTHER party opens the thread
);

CREATE INDEX support_messages_conversation_idx
  ON public.support_messages (conversation_id, created_at);

-- Single-row, admin-editable — same idiom as baseline_config (0001).
CREATE TABLE public.support_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_contact_email  TEXT,
  admin_contact_phone  TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.support_config DEFAULT VALUES;

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_config        ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Anyone signed in reads support config" ON public.support_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins update support config" ON public.support_config
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

/**
 * A coordinator sends a message, re-checking every time that they are an
 * approved coordinator — the same defensive re-check every other ISC RPC
 * already does rather than trusting client state. Creates the conversation
 * lazily on first use.
 */
CREATE OR REPLACE FUNCTION public.support_coordinator_send_message(p_body TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role   TEXT;
  v_status TEXT;
  v_body   TEXT := NULLIF(BTRIM(COALESCE(p_body, '')), '');
  v_conv   UUID;
BEGIN
  IF v_body IS NULL THEN RETURN 'empty_message'; END IF;
  IF length(v_body) > 2000 THEN RETURN 'message_too_long'; END IF;

  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'coordinator' THEN RETURN 'not_coordinator'; END IF;

  SELECT coordinator_status INTO v_status
    FROM public.schools WHERE coordinator_id = auth.uid() LIMIT 1;
  IF v_status IS DISTINCT FROM 'approved' THEN RETURN 'not_approved'; END IF;

  INSERT INTO public.support_conversations (coordinator_id)
  VALUES (auth.uid())
  ON CONFLICT (coordinator_id) DO NOTHING;

  SELECT id INTO v_conv FROM public.support_conversations WHERE coordinator_id = auth.uid();

  INSERT INTO public.support_messages (conversation_id, sender_id, sender_role, body)
  VALUES (v_conv, auth.uid(), 'coordinator', v_body);

  UPDATE public.support_conversations SET last_message_at = NOW() WHERE id = v_conv;

  RETURN 'sent';
END;
$$;

/**
 * Admin sends a message to one coordinator, only while that coordinator is
 * currently approved — an unapproved coordinator's console cannot show it
 * (their nav renders nothing but a waiting notice), so refusing here is the
 * honest failure mode rather than silently writing an unreadable message.
 */
CREATE OR REPLACE FUNCTION public.support_admin_send_message(p_coordinator_id UUID, p_body TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_status TEXT;
  v_body   TEXT := NULLIF(BTRIM(COALESCE(p_body, '')), '');
  v_conv   UUID;
BEGIN
  IF NOT public.is_admin() THEN RETURN 'forbidden'; END IF;
  IF v_body IS NULL THEN RETURN 'empty_message'; END IF;
  IF length(v_body) > 2000 THEN RETURN 'message_too_long'; END IF;

  SELECT coordinator_status INTO v_status
    FROM public.schools WHERE coordinator_id = p_coordinator_id LIMIT 1;
  IF v_status IS DISTINCT FROM 'approved' THEN RETURN 'not_approved'; END IF;

  INSERT INTO public.support_conversations (coordinator_id)
  VALUES (p_coordinator_id)
  ON CONFLICT (coordinator_id) DO NOTHING;

  SELECT id INTO v_conv FROM public.support_conversations WHERE coordinator_id = p_coordinator_id;

  INSERT INTO public.support_messages (conversation_id, sender_id, sender_role, body)
  VALUES (v_conv, auth.uid(), 'admin', v_body);

  UPDATE public.support_conversations SET last_message_at = NOW() WHERE id = v_conv;

  RETURN 'sent';
END;
$$;

/**
 * Marks the OTHER party's messages read when the caller opens a thread.
 * Never touches the caller's own messages — a sender does not need their own
 * message marked "read" by themselves.
 */
CREATE OR REPLACE FUNCTION public.support_mark_thread_read(p_conversation_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_coordinator_id UUID;
BEGIN
  SELECT coordinator_id INTO v_coordinator_id
    FROM public.support_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_coordinator_id = auth.uid() THEN
    UPDATE public.support_messages
       SET read_at = NOW()
     WHERE conversation_id = p_conversation_id AND sender_role = 'admin' AND read_at IS NULL;
    RETURN 'marked';
  END IF;

  IF public.is_admin() THEN
    UPDATE public.support_messages
       SET read_at = NOW()
     WHERE conversation_id = p_conversation_id AND sender_role = 'coordinator' AND read_at IS NULL;
    RETURN 'marked';
  END IF;

  RETURN 'forbidden';
END;
$$;

GRANT EXECUTE ON FUNCTION public.support_coordinator_send_message(TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_admin_send_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_mark_thread_read(UUID)         TO authenticated;
```

- [ ] **Step 2: Apply it to the live database**

Run: `pwsh <scratchpad>\sbq.ps1 -File supabase\migrations\0061_support_messages.sql`
Expected: `OK (no rows)` or similar success output, no `FAILED:` line.

- [ ] **Step 3: Verify with real approved-coordinator and admin ids**

Get two real ids to test with (an approved coordinator, and an admin) — reuse the same live-database, rolled-back-transaction technique already used throughout this project. Write and run, via `sbq.ps1`, a script shaped like:

```sql
DO $$
DECLARE
  v_coordinator UUID := (SELECT coordinator_id FROM public.schools WHERE coordinator_status = 'approved' LIMIT 1);
  v_admin       UUID := (SELECT id FROM public.user_profiles WHERE role = 'admin' LIMIT 1);
  v_other_coord UUID;
  v_conv        UUID;
  v_result      TEXT;
  v_count       INT;
  out_txt       TEXT := '';
BEGIN
  -- As the coordinator: send the first message, creating the conversation.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_coordinator, 'role','authenticated')::text, true);
  v_result := public.support_coordinator_send_message('Hello admin, quick question.');
  out_txt := out_txt || 'coordinator send: ' || v_result || chr(10);

  SELECT id INTO v_conv FROM public.support_conversations WHERE coordinator_id = v_coordinator;
  out_txt := out_txt || 'conversation created: ' || (v_conv IS NOT NULL) || chr(10);

  -- As a DIFFERENT coordinator: must not see this conversation.
  SELECT coordinator_id INTO v_other_coord FROM public.schools
   WHERE coordinator_status = 'approved' AND coordinator_id <> v_coordinator LIMIT 1;
  IF v_other_coord IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other_coord, 'role','authenticated')::text, true);
    SELECT count(*) INTO v_count FROM public.support_messages WHERE conversation_id = v_conv;
    out_txt := out_txt || 'other coordinator sees messages (expect 0): ' || v_count || chr(10);
  END IF;

  -- As admin: reply.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role','authenticated')::text, true);
  v_result := public.support_admin_send_message(v_coordinator, 'Sure, go ahead.');
  out_txt := out_txt || 'admin send: ' || v_result || chr(10);

  -- Admin refused when the coordinator is not approved.
  v_result := public.support_admin_send_message('00000000-0000-0000-0000-000000000000'::uuid, 'test');
  out_txt := out_txt || 'admin send to unapproved (expect not_approved): ' || v_result || chr(10);

  -- Coordinator marks admin's message read; must not touch their own.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_coordinator, 'role','authenticated')::text, true);
  v_result := public.support_mark_thread_read(v_conv);
  SELECT count(*) INTO v_count FROM public.support_messages
   WHERE conversation_id = v_conv AND sender_role = 'coordinator' AND read_at IS NOT NULL;
  out_txt := out_txt || 'mark read: ' || v_result || ' | own message wrongly marked read (expect 0): ' || v_count || chr(10);

  RAISE EXCEPTION '%', chr(10) || out_txt;
END $$;
```

Run: `pwsh <scratchpad>\sbq.ps1 -File <scratchpad>\verify-support.sql`
Expected output includes: `coordinator send: sent`, `conversation created: true`, `other coordinator sees messages (expect 0): 0`, `admin send: sent`, `admin send to unapproved (expect not_approved): not_approved`, `mark read: marked`, `own message wrongly marked read (expect 0): 0`. The whole block rolls back — nothing written here persists.

If the school data doesn't have an approved coordinator to test against yet, create one disposable throwaway coordinator account and approve them first (same throwaway-account discipline used throughout this project — delete it afterward).

- [ ] **Step 4: No commit for this step**

The migration file lives only at `supabase/migrations/0061_support_messages.sql` on disk — `supabase/` is gitignored in this project. Do not `git add` it. Move directly to Task 2.

---

### Task 2: Shared support library, thread component, and server actions

**Files:**
- Create: `src/lib/support/data.ts`
- Create: `src/components/support/support-thread.tsx`
- Create: `src/app/actions/support.ts`

**Interfaces:**
- Consumes: RPCs from Task 1 (`support_coordinator_send_message`, `support_admin_send_message`, `support_mark_thread_read`); tables `support_conversations`, `support_messages`
- Produces: `SupportMessage { id, senderId, senderRole: 'admin'|'coordinator', body, createdAt }`, `loadConversation(supabase, coordinatorId): Promise<{ conversationId: string | null; messages: SupportMessage[] }>`, `<SupportThread messages conversationId viewerRole sendAction hiddenFields? emptyLabel />`, `sendCoordinatorMessageAction`, `sendAdminMessageAction`, `markThreadReadAction(conversationId)`, `SupportSendState` — consumed by Task 3 (admin thread page) and Task 5 (coordinator page).

No unit tests: this task is a thin data-shaping layer plus a presentational component, matching how `admin-data.ts` and the ISC shell components had none — correctness is verified by the manual browser pass at the end of Tasks 3 and 5, and Task 1 already proved the RPCs themselves work.

- [ ] **Step 1: Write `src/lib/support/data.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupportMessage } from '@/components/support/support-thread'

interface RawMessage {
  id: string
  sender_id: string
  sender_role: string
  body: string
  created_at: string
}

/**
 * The conversation id and its full message history for one coordinator, or a
 * null conversation id if nobody has written to them yet.
 *
 * No role check here: RLS already scopes `support_messages` to the caller's
 * own conversation, or lets an admin read any — the same division of labour
 * as every other read in this project (see admin-data.ts).
 */
export async function loadConversation(
  supabase: SupabaseClient,
  coordinatorId: string
): Promise<{ conversationId: string | null; messages: SupportMessage[] }> {
  const { data: conv } = await supabase
    .from('support_conversations')
    .select('id')
    .eq('coordinator_id', coordinatorId)
    .maybeSingle()

  if (!conv) return { conversationId: null, messages: [] }

  const { data: rows } = await supabase
    .from('support_messages')
    .select('id, sender_id, sender_role, body, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })

  const messages: SupportMessage[] = ((rows ?? []) as RawMessage[]).map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    senderRole: r.sender_role as 'admin' | 'coordinator',
    body: r.body,
    createdAt: r.created_at,
  }))

  return { conversationId: conv.id, messages }
}
```

- [ ] **Step 2: Write `src/app/actions/support.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SupportSendState = { error?: string } | undefined

const ERR: Record<string, string> = {
  empty_message: 'Write something before sending.',
  message_too_long: 'Keep it under 2000 characters.',
  not_coordinator: 'Only coordinator accounts can use this.',
  not_approved: 'Your school needs to be approved before you can message admin.',
  forbidden: 'Admins only.',
}

export async function sendCoordinatorMessageAction(
  _prev: SupportSendState,
  formData: FormData
): Promise<SupportSendState> {
  const body = (formData.get('body') as string) ?? ''
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('support_coordinator_send_message', { p_body: body })
  if (error) return { error: 'Something went wrong. Please try again.' }

  const status = (data as string) ?? ''
  if (status !== 'sent') return { error: ERR[status] ?? 'Could not send that.' }

  revalidatePath('/coordinator/support')
  return undefined
}

export async function sendAdminMessageAction(
  _prev: SupportSendState,
  formData: FormData
): Promise<SupportSendState> {
  const coordinatorId = (formData.get('coordinator_id') as string)?.trim()
  const body = (formData.get('body') as string) ?? ''
  if (!coordinatorId) return { error: 'Missing coordinator.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('support_admin_send_message', {
    p_coordinator_id: coordinatorId,
    p_body: body,
  })
  if (error) return { error: 'Something went wrong. Please try again.' }

  const status = (data as string) ?? ''
  if (status !== 'sent') return { error: ERR[status] ?? 'Could not send that.' }

  revalidatePath(`/admin/coordinators/support/${coordinatorId}`)
  revalidatePath('/admin/coordinators/support')
  revalidatePath('/admin/coordinators')
  return undefined
}

/**
 * Called once when a thread mounts, not from a form — a 'use server' action
 * can be imported and called directly from a Client Component's effect, the
 * same as a form action, just without the FormData wrapper.
 */
export async function markThreadReadAction(conversationId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('support_mark_thread_read', { p_conversation_id: conversationId })
}
```

- [ ] **Step 3: Write `src/components/support/support-thread.tsx`**

```tsx
'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { markThreadReadAction, type SupportSendState } from '@/app/actions/support'

export interface SupportMessage {
  id: string
  senderId: string
  senderRole: 'admin' | 'coordinator'
  body: string
  createdAt: string
}

const TIME_FORMAT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * The message history and composer, identical on the admin and coordinator
 * sides — only which server action it posts to (and which extra hidden field
 * that action needs) differs between the two callers.
 */
export function SupportThread({
  messages,
  conversationId,
  viewerRole,
  sendAction,
  hiddenFields,
  emptyLabel,
}: {
  messages: SupportMessage[]
  conversationId: string | null
  viewerRole: 'admin' | 'coordinator'
  sendAction: (prev: SupportSendState, formData: FormData) => Promise<SupportSendState>
  /** Extra hidden inputs the send action needs — e.g. which coordinator, on
      the admin side. Omitted on the coordinator side, which always posts to
      its own conversation. */
  hiddenFields?: Record<string, string>
  emptyLabel: string
}) {
  const [state, action, pending] = useActionState<SupportSendState, FormData>(sendAction, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Opening a thread is "read" — there is no separate read receipt UI, this
  // just clears the unread badge on the next page load, matching how nothing
  // else in this project pushes a live notification either.
  useEffect(() => {
    if (conversationId) void markThreadReadAction(conversationId)
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  useEffect(() => {
    if (!pending) formRef.current?.reset()
  }, [pending])

  return (
    <div className="clay-card flex flex-col h-[32rem]">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted text-center mt-8">{emptyLabel}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === viewerRole
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine ? 'bg-primary text-white' : 'bg-black/[0.04] text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>
                    {TIME_FORMAT.format(new Date(m.createdAt))}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        ref={formRef}
        action={action}
        className="border-t border-black/[0.06] p-3 flex items-end gap-2"
      >
        {Object.entries(hiddenFields ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <textarea
          name="body"
          required
          rows={1}
          placeholder="Write a message…"
          aria-label="Write a message"
          className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Send message"
          className="clay-button bg-cta text-white w-10 h-10 flex items-center justify-center shrink-0 disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      {state?.error && <p className="text-xs text-red-500 px-3 pb-2">{state.error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors from the three new files

- [ ] **Step 5: Commit**

```bash
git add src/lib/support/data.ts src/components/support/support-thread.tsx src/app/actions/support.ts
git commit -m "feat: add shared support-thread component, data loader, and actions"
```

---

### Task 3: Admin Support Inbox

**Files:**
- Create: `src/app/(admin)/admin/coordinators/support/page.tsx`
- Create: `src/app/(admin)/admin/coordinators/support/[coordinatorId]/page.tsx`
- Modify: `src/app/(admin)/admin/coordinators/page.tsx`

**Interfaces:**
- Consumes: `loadConversation`, `SupportThread`, `sendAdminMessageAction` (Task 2)
- Produces: `/admin/coordinators/support` (the inbox list) and `/admin/coordinators/support/[coordinatorId]` (one thread) — the second is also linked to by Task 4's "Message" button.

The existing tabs and application list on `/admin/coordinators/page.tsx` are untouched — this task only adds two cards above them.

- [ ] **Step 1: Write the inbox list page**

```tsx
// src/app/(admin)/admin/coordinators/support/page.tsx
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'

interface ConversationRow {
  coordinatorId: string
  coordinatorName: string
  schoolName: string
  lastMessageAt: string
  lastMessagePreview: string
  unread: boolean
}

export default async function AdminSupportInboxPage() {
  const supabase = await createClient()

  const { data: conversations } = await supabase
    .from('support_conversations')
    .select('id, coordinator_id, last_message_at')
    .order('last_message_at', { ascending: false })

  const convList = conversations ?? []
  const coordinatorIds = convList.map((c) => c.coordinator_id)

  const [{ data: profiles }, { data: schools }, { data: allMessages }] = await Promise.all([
    coordinatorIds.length
      ? supabase.from('user_profiles').select('id, full_name').in('id', coordinatorIds)
      : Promise.resolve({ data: [] }),
    coordinatorIds.length
      ? supabase.from('schools').select('name, coordinator_id').in('coordinator_id', coordinatorIds)
      : Promise.resolve({ data: [] }),
    convList.length
      ? supabase
          .from('support_messages')
          .select('conversation_id, sender_role, body, created_at, read_at')
          .in(
            'conversation_id',
            convList.map((c) => c.id)
          )
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const schoolByCoordinator = new Map((schools ?? []).map((s) => [s.coordinator_id, s.name]))

  // Last row wins for the preview (messages are ordered oldest-first above);
  // unread is any coordinator message nobody has read yet. Small scale —
  // one row per active conversation, same "fetch then aggregate in memory"
  // approach the ISC admin pages already use throughout this project.
  const lastMessageByConv = new Map<string, { body: string; role: string }>()
  const unreadByConv = new Set<string>()
  for (const m of allMessages ?? []) {
    lastMessageByConv.set(m.conversation_id, { body: m.body, role: m.sender_role })
    if (m.sender_role === 'coordinator' && !m.read_at) unreadByConv.add(m.conversation_id)
  }

  const rows: ConversationRow[] = convList.map((c) => {
    const last = lastMessageByConv.get(c.id)
    return {
      coordinatorId: c.coordinator_id,
      coordinatorName: nameById.get(c.coordinator_id) || 'Unknown coordinator',
      schoolName: schoolByCoordinator.get(c.coordinator_id) ?? 'Unknown school',
      lastMessageAt: c.last_message_at,
      lastMessagePreview: last ? `${last.role === 'admin' ? 'You: ' : ''}${last.body}` : '',
      unread: unreadByConv.has(c.id),
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ISC"
        icon={Inbox}
        title="Support Inbox"
        subtitle="Every conversation a coordinator has started, most recent first."
      />

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">
          No conversations yet. Start one from the Coordinators list.
        </div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.06]">
          {rows.map((r) => (
            <Link
              key={r.coordinatorId}
              href={`/admin/coordinators/support/${r.coordinatorId}`}
              className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-black/[0.02]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {r.coordinatorName}
                  {r.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </p>
                <p className="text-xs text-muted">{r.schoolName}</p>
                {r.lastMessagePreview && (
                  <p className="text-xs text-muted truncate mt-1 max-w-md">
                    {r.lastMessagePreview}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted shrink-0">
                {new Date(r.lastMessageAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write the admin thread page**

```tsx
// src/app/(admin)/admin/coordinators/support/[coordinatorId]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { loadConversation } from '@/lib/support/data'
import { SupportThread } from '@/components/support/support-thread'
import { sendAdminMessageAction } from '@/app/actions/support'

export default async function AdminSupportThreadPage({
  params,
}: {
  params: Promise<{ coordinatorId: string }>
}) {
  const { coordinatorId } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', coordinatorId)
    .eq('role', 'coordinator')
    .maybeSingle()
  if (!profile) notFound()

  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('coordinator_id', coordinatorId)
    .maybeSingle()

  const { conversationId, messages } = await loadConversation(supabase, coordinatorId)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/coordinators/support"
        className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Support Inbox
      </Link>

      <PageHeader
        eyebrow="ISC"
        icon={MessageCircle}
        title={profile.full_name || 'Coordinator'}
        subtitle={school?.name ?? ''}
      />

      <SupportThread
        messages={messages}
        conversationId={conversationId}
        viewerRole="admin"
        sendAction={sendAdminMessageAction}
        hiddenFields={{ coordinator_id: coordinatorId }}
        emptyLabel="No messages yet. Say hello."
      />
    </div>
  )
}
```

- [ ] **Step 3: Add the two cards and the unread badge to the existing Coordinators page**

In `src/app/(admin)/admin/coordinators/page.tsx`, add one query for the total unread count and render two cards above the existing status-tab row. The tabs and list below stay exactly as they are today.

Add near the top of the function body, after the existing `counts`/`total` calculation:

```typescript
  const { data: unreadRows } = await supabase
    .from('support_messages')
    .select('id')
    .eq('sender_role', 'coordinator')
    .is('read_at', null)
  const unreadCount = (unreadRows ?? []).length
```

Add this import at the top:

```typescript
import { Inbox, MessageCircle } from 'lucide-react'
import Link from 'next/link'
```

Insert this block into the returned JSX, directly after the closing `</PageHeader>`'s parent element (i.e. right before the existing `<div className="flex items-center gap-2 flex-wrap">` status-tabs row):

```tsx
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/coordinators/support"
          className="clay-card p-6 flex items-start gap-4 hover:bg-black/[0.01] transition-colors"
        >
          <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Inbox className="w-5 h-5" />
          </span>
          <span>
            <span className="flex items-center gap-2">
              <span className="font-display font-bold text-foreground text-sm">Support Inbox</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                  {unreadCount} unread
                </span>
              )}
            </span>
            <span className="block text-xs text-muted mt-1">
              Every conversation a coordinator has started with you.
            </span>
          </span>
        </Link>

        <Link
          href="/admin/coordinators?status=approved"
          className="clay-card p-6 flex items-start gap-4 hover:bg-black/[0.01] transition-colors"
        >
          <span className="w-11 h-11 rounded-xl bg-accent-teal/10 text-accent-teal flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </span>
          <span>
            <span className="font-display font-bold text-foreground text-sm">Message a coordinator</span>
            <span className="block text-xs text-muted mt-1">
              Reach out to any approved coordinator first.
            </span>
          </span>
        </Link>
      </div>

```

- [ ] **Step 4: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/admin/coordinators/support" "src/app/(admin)/admin/coordinators/page.tsx"
git commit -m "feat: add admin support inbox and per-coordinator thread page"
```

---

### Task 4: "Message" action on the Coordinators applications list

**Files:**
- Modify: `src/components/admin/coordinator-claim-row.tsx`
- Modify: `src/app/(admin)/admin/coordinators/page.tsx`

**Interfaces:**
- Consumes: `CoordinatorClaim` (existing, extended below)
- Produces: a "Message" link on each approved row, to `/admin/coordinators/support/[coordinatorId]` (Task 3)

`CoordinatorClaim` currently has no `coordinatorId` field — only `schoolId`. This adds it.

- [ ] **Step 1: Extend `CoordinatorClaim` and add the button**

In `src/components/admin/coordinator-claim-row.tsx`, add one field to the interface:

```typescript
export interface CoordinatorClaim {
  schoolId: string
  /** The coordinator's own account id — needed to link to their support
      thread, separate from schoolId since a rejected coordinator can later
      claim a different school. */
  coordinatorId: string
  schoolName: string
  schoolLocation: string
  schoolReviewStatus: string
  coordinatorStatus: string
  reviewNotes: string | null
  applicantName: string
  applicantPhone: string | null
  board: string | null
  studentCountRange: string | null
}
```

Add the import:

```typescript
import Link from 'next/link'
import { AlertTriangle, Check, Clock, MessageCircle, X } from 'lucide-react'
```

Add a "Message" link, shown only for an approved claim, inside the existing status-badge `<div className="flex items-center gap-2 shrink-0">` block, right after the status badge `<span>`:

```tsx
          {claim.coordinatorStatus === 'approved' && (
            <Link
              href={`/admin/coordinators/support/${claim.coordinatorId}`}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-black/10 text-muted hover:text-primary hover:border-primary/30 inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Message
            </Link>
          )}
```

- [ ] **Step 2: Pass `coordinatorId` from the page**

In `src/app/(admin)/admin/coordinators/page.tsx`, the `rows` mapping already has `c.coordinator_id` in scope (it's how `nameById`/`phoneById` are looked up). Add one field to the object literal:

```typescript
  const rows: CoordinatorClaim[] = claims.map((c) => ({
    schoolId: c.id,
    coordinatorId: c.coordinator_id,
    schoolName: c.name,
    schoolLocation: `${c.district}, ${c.state}`,
    schoolReviewStatus: c.review_status,
    coordinatorStatus: c.coordinator_status,
    reviewNotes: c.coordinator_notes,
    applicantName: nameById.get(c.coordinator_id) || 'Unknown applicant',
    applicantPhone: phoneById.get(c.coordinator_id) ?? null,
    board: c.board,
    studentCountRange: c.student_count_range,
  }))
```

- [ ] **Step 3: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/coordinator-claim-row.tsx "src/app/(admin)/admin/coordinators/page.tsx"
git commit -m "feat: add Message action to approved coordinator rows"
```

---

### Task 5: Coordinator "Contact Admin" page

**Files:**
- Create: `src/app/(coordinator)/coordinator/support/page.tsx`
- Modify: `src/components/coordinator/coordinator-nav.tsx`

**Interfaces:**
- Consumes: `loadConversation`, `SupportThread`, `sendCoordinatorMessageAction` (Task 2)
- Produces: `/coordinator/support`, and the new "Contact Admin" nav item

Falls under the same `{(approved ? items : [])}` gate `CoordinatorNav` already applies (`coordinator-nav.tsx:19`) — no new gating logic needed.

- [ ] **Step 1: Write the page**

```tsx
// src/app/(coordinator)/coordinator/support/page.tsx
import { Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { loadConversation } from '@/lib/support/data'
import { SupportThread } from '@/components/support/support-thread'
import { sendCoordinatorMessageAction } from '@/app/actions/support'

export default async function CoordinatorSupportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // This page only renders under (coordinator)/layout.tsx, which has already
  // redirected anyone without a session — user is never null here in
  // practice, but TypeScript still needs the narrowing.
  if (!user) return null

  const [{ data: config }, { conversationId, messages }] = await Promise.all([
    supabase.from('support_config').select('admin_contact_email, admin_contact_phone').maybeSingle(),
    loadConversation(supabase, user.id),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={Mail}
        title="Contact Admin"
        subtitle="Reach the SkillFleet team directly."
      />

      {(config?.admin_contact_email || config?.admin_contact_phone) && (
        <div className="clay-card p-5 flex flex-wrap gap-6">
          {config?.admin_contact_email && (
            <a
              href={`mailto:${config.admin_contact_email}`}
              className="text-sm text-foreground inline-flex items-center gap-2 hover:text-primary"
            >
              <Mail className="w-4 h-4 text-muted" />
              {config.admin_contact_email}
            </a>
          )}
          {config?.admin_contact_phone && (
            <a
              href={`tel:${config.admin_contact_phone}`}
              className="text-sm text-foreground inline-flex items-center gap-2 hover:text-primary"
            >
              <Phone className="w-4 h-4 text-muted" />
              {config.admin_contact_phone}
            </a>
          )}
        </div>
      )}

      <SupportThread
        messages={messages}
        conversationId={conversationId}
        viewerRole="coordinator"
        sendAction={sendCoordinatorMessageAction}
        emptyLabel="No messages yet. Ask us anything."
      />
    </div>
  )
}
```

- [ ] **Step 2: Add the nav item with an unread badge**

Rewrite `src/components/coordinator/coordinator-nav.tsx` in full:

```tsx
// src/components/coordinator/coordinator-nav.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut, Mail } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

const items = [
  { href: '/coordinator', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/coordinator/support', label: 'Contact Admin', icon: Mail, exact: false },
]

export function CoordinatorNav({ approved = true }: { approved?: boolean }) {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  // Client-side, on mount only — the badge is a convenience, not a source of
  // truth, and matches every other "check on load, no push" moment in this
  // project. Skipped entirely while unapproved, since there is nothing to
  // check yet.
  useEffect(() => {
    if (!approved) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: conv } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('coordinator_id', user.id)
        .maybeSingle()
      if (!conv) return
      const { count } = await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('sender_role', 'admin')
        .is('read_at', null)
      if (!cancelled) setUnread(count ?? 0)
    })()
    return () => {
      cancelled = true
    }
  }, [approved])

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 px-3 py-4 space-y-0.5">
        {!approved && (
          <p className="px-3 py-2 text-xs text-muted">
            Your console opens once an admin approves your school.
          </p>
        )}
        {(approved ? items : []).map(({ href, label, icon: Icon, exact }) => {
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
              {href === '/coordinator/support' && unread > 0 && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">
                  {unread}
                </span>
              )}
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

Check `src/lib/supabase/client.ts` exists with a `createClient()` export before this step (it is the standard browser-side Supabase client every other client component in this project already uses for direct reads) — if the exact export name differs, use whatever this project's existing client components already import.

- [ ] **Step 3: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "src/app/(coordinator)/coordinator/support" src/components/coordinator/coordinator-nav.tsx
git commit -m "feat: add coordinator Contact Admin page and nav entry"
```

---

### Task 6: Admin contact-info editor, plus end-to-end verification

**Files:**
- Create: `src/components/admin/support-config-form.tsx`
- Create: `src/app/actions/support-config.ts`
- Modify: `src/app/(admin)/admin/coordinators/support/page.tsx`

**Interfaces:**
- Consumes: `support_config` table (Task 1)
- Produces: an inline-editable contact block at the top of the Support Inbox page, matching `ParameterRow`'s existing edit pattern

- [ ] **Step 1: Write the update action**

```typescript
// src/app/actions/support-config.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SupportConfigState = { error?: string; ok?: string } | undefined

export async function updateSupportConfigAction(
  _prev: SupportConfigState,
  formData: FormData
): Promise<SupportConfigState> {
  const id = (formData.get('id') as string)?.trim()
  const email = ((formData.get('admin_contact_email') as string) ?? '').trim() || null
  const phone = ((formData.get('admin_contact_phone') as string) ?? '').trim() || null
  if (!id) return { error: 'Missing config row.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('support_config')
    .update({ admin_contact_email: email, admin_contact_phone: phone, updated_at: new Date().toISOString() })
    .eq('id', id)

  // RLS refuses a non-admin silently (0 rows updated, no `error`) rather than
  // throwing — the UPDATE policy's USING clause just excludes the row, same
  // as every other RLS-guarded UPDATE in this project.
  if (error) return { error: 'Something went wrong. Please try again.' }

  revalidatePath('/admin/coordinators/support')
  revalidatePath('/coordinator/support')
  return { ok: 'Saved.' }
}
```

- [ ] **Step 2: Write the edit form component**

```tsx
// src/components/admin/support-config-form.tsx
'use client'

import { useActionState, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { updateSupportConfigAction, type SupportConfigState } from '@/app/actions/support-config'

export function SupportConfigForm({
  id,
  email,
  phone,
}: {
  id: string
  email: string | null
  phone: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState<SupportConfigState, FormData>(
    updateSupportConfigAction,
    undefined
  )

  if (!editing) {
    return (
      <div className="clay-card p-5 flex items-center justify-between gap-4">
        <div className="text-sm text-foreground">
          <span className="text-muted">Shown to coordinators: </span>
          {email || phone ? (
            <>
              {email}
              {email && phone && ' · '}
              {phone}
            </>
          ) : (
            <span className="text-muted">Nothing set yet</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted hover:text-primary transition-colors shrink-0"
          aria-label="Edit admin contact info"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="clay-card p-5 space-y-3">
      <input type="hidden" name="id" value={id} />
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="admin_contact_email"
          type="email"
          defaultValue={email ?? ''}
          placeholder="support@skillfleet.in"
          aria-label="Admin contact email"
          className="px-3 py-2 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
        />
        <input
          name="admin_contact_phone"
          defaultValue={phone ?? ''}
          placeholder="+91 90000 00000"
          aria-label="Admin contact phone"
          className="px-3 py-2 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          onClick={() => setEditing(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs text-muted hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Wire it into the Support Inbox page**

In `src/app/(admin)/admin/coordinators/support/page.tsx`, add the fetch and render the form above the conversation list:

```typescript
import { SupportConfigForm } from '@/components/admin/support-config-form'
```

```typescript
  const { data: config } = await supabase
    .from('support_config')
    .select('id, admin_contact_email, admin_contact_phone')
    .maybeSingle()
```

Render right after `<PageHeader ... />`:

```tsx
      {config && (
        <SupportConfigForm
          id={config.id}
          email={config.admin_contact_email}
          phone={config.admin_contact_phone}
        />
      )}
```

- [ ] **Step 4: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 5: Manual, end-to-end browser verification**

With the dev server running and two disposable accounts — an approved coordinator and an admin (same throwaway-account discipline used throughout this project; delete both afterward):

- As admin, open `/admin/coordinators`: confirm the existing tabs and application list are unchanged, and the two new cards render above them, with no unread badge yet.
- Set an admin contact email and phone from the Support Inbox page; confirm the save round-trips (reload the page and see the saved values, not just the optimistic UI).
- As the coordinator, open `/coordinator`: confirm "Contact Admin" appears in the nav, the saved email/phone render as working `mailto:`/`tel:` links, and send a first message.
- As admin, reload `/admin/coordinators`: confirm the Support Inbox card now shows an unread count, open it, confirm the new conversation appears with the coordinator's name, school, and message preview; open the thread and confirm the message reads correctly and the unread badge clears.
- As admin, reply from the thread; as the coordinator, reload `/coordinator/support` and confirm the reply appears and the nav badge shows 1 unread, then clears once the thread is opened.
- As admin, use Card 2 (`Message a coordinator`) to open a *different* approved coordinator with no prior messages — confirm the thread starts empty and a first admin message creates the conversation correctly.
- Confirm a pending (not yet approved) coordinator has no "Contact Admin" nav item and no "Message" button appears for them anywhere on the admin side.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/support-config-form.tsx src/app/actions/support-config.ts "src/app/(admin)/admin/coordinators/support/page.tsx"
git commit -m "feat: add admin-editable support contact info"
```

---

## Self-Review

**Spec coverage:**
- Data model, RLS, RPCs — Task 1, matching the spec's SQL almost verbatim.
- Admin Support Inbox (Card 1) — Task 3.
- Admin "Message a coordinator" (Card 2), reusing the existing approved-coordinators list rather than a new page — Task 4.
- Existing `/admin/coordinators` page unchanged apart from the two additive cards — Task 3 Step 3 explicitly only inserts, never edits, the existing tabs/list JSX.
- Coordinator "Contact Admin" page and nav entry, gated behind the existing `approved` prop — Task 5.
- Admin contact info editable in the dashboard — Task 6.
- Unread badges on both sides, computed on load, no push — Task 3 (admin) and Task 5 (coordinator).
- "Only approved coordinators can be messaged" rule — enforced at the RPC layer (Task 1), the admin UI layer (Task 4's `coordinatorStatus === 'approved'` guard), and the coordinator nav layer (Task 5's existing `approved` gate) — three independent layers, not just a UI-only restriction.

**Placeholder scan:** No TBD/TODO; every step has complete, real code; the verification SQL in Task 1 asserts concrete expected strings and counts, not "add appropriate checks."

**Type consistency:** `SupportMessage`, `SupportSendState`, `loadConversation`'s return shape, and `SupportThread`'s props are each defined once in Task 2 and consumed with identical shapes in Tasks 3, 5, and 6 — cross-checked while writing each later task.
