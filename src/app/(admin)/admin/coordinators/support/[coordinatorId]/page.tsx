import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { loadConversation } from '@/lib/support/data'
import { SupportThread } from '@/components/support/support-thread'
import { sendAdminMessageAction } from '@/app/actions/support'
import { requireAdmin } from '@/lib/admin/guard'

export default async function AdminSupportThreadPage({
  params,
}: {
  params: Promise<{ coordinatorId: string }>
}) {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
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
    .select('name, coordinator_status')
    .eq('coordinator_id', coordinatorId)
    .maybeSingle()

  const { conversationId, messages } = await loadConversation(supabase, coordinatorId)
  const approved = school?.coordinator_status === 'approved'

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
        subtitle={school?.name ?? 'No school claimed'}
      />

      {/*
        The RPC refuses this anyway; saying so up front beats letting someone
        write a message and only then be told it cannot be delivered.
      */}
      {!approved ? (
        <div className="clay-card p-6 text-sm text-muted">
          This coordinator is not approved yet, so they cannot be messaged — their console
          stays closed until you approve their application.
        </div>
      ) : (
        <SupportThread
          messages={messages}
          conversationId={conversationId}
          viewerRole="admin"
          sendAction={sendAdminMessageAction}
          hiddenFields={{ coordinator_id: coordinatorId }}
          emptyLabel="No messages yet. Say hello."
        />
      )}
    </div>
  )
}
