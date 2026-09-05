import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CoordinatorHeader } from '@/components/admin/coordinator-header'
import { SupportConfigForm } from '@/components/admin/support-config-form'
import { requireAdmin } from '@/lib/admin/guard'

interface ConversationRow {
  coordinatorId: string
  coordinatorName: string
  schoolName: string
  lastMessageAt: string
  lastMessagePreview: string
  unread: boolean
}

export default async function AdminSupportInboxPage() {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
  const supabase = await createClient()

  const { data: conversations } = await supabase
    .from('support_conversations')
    .select('id, coordinator_id, last_message_at')
    .order('last_message_at', { ascending: false })

  const convList = conversations ?? []
  const coordinatorIds = convList.map((c) => c.coordinator_id)

  const [{ data: config }, { data: profiles }, { data: schools }, { data: allMessages }] =
    await Promise.all([
      supabase
        .from('support_config')
        .select('id, admin_contact_email, admin_contact_phone')
        .maybeSingle(),
      coordinatorIds.length
        ? supabase.from('user_profiles').select('id, full_name').in('id', coordinatorIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      coordinatorIds.length
        ? supabase.from('schools').select('name, coordinator_id').in('coordinator_id', coordinatorIds)
        : Promise.resolve({ data: [] as { name: string; coordinator_id: string | null }[] }),
      convList.length
        ? supabase
            .from('support_messages')
            .select('conversation_id, sender_role, body, created_at, read_at')
            .in(
              'conversation_id',
              convList.map((c) => c.id)
            )
            .order('created_at', { ascending: true })
        : Promise.resolve({
            data: [] as {
              conversation_id: string
              sender_role: string
              body: string
              created_at: string
              read_at: string | null
            }[],
          }),
    ])

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const schoolByCoordinator = new Map(
    (schools ?? []).map((s) => [s.coordinator_id, s.name] as const)
  )

  // Last row wins for the preview (ordered oldest-first above); unread is any
  // coordinator message nobody has read yet. One pass over a small set — the
  // same fetch-then-aggregate-in-memory approach the ISC admin pages use.
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
      {/* The section's own header, so Support reads as one tab of Coordinators
          rather than a page reached only by a back link. */}
      <CoordinatorHeader
        active="support"
        title="Support inbox"
        subtitle="Every conversation with a coordinator, most recent first."
      />

      {config && (
        <SupportConfigForm
          id={config.id}
          email={config.admin_contact_email}
          phone={config.admin_contact_phone}
        />
      )}

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
              className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-black/[0.02] transition-colors"
            >
              <span className="min-w-0">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {r.coordinatorName}
                  {r.unread && (
                    <span
                      className="w-2 h-2 rounded-full bg-primary shrink-0"
                      aria-label="Unread messages"
                    />
                  )}
                </span>
                <span className="block text-xs text-muted">{r.schoolName}</span>
                {r.lastMessagePreview && (
                  <span className="block text-xs text-muted truncate mt-1 max-w-md">
                    {r.lastMessagePreview}
                  </span>
                )}
              </span>
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
