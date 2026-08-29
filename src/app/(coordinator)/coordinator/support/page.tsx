import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { loadConversation } from '@/lib/support/data'
import { ContactAdminPanel } from '@/components/support/contact-admin-panel'

export default async function CoordinatorSupportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // This page only renders under (coordinator)/layout.tsx, which has already
  // redirected anyone without a session — user is never null here in practice,
  // but TypeScript still needs the narrowing.
  if (!user) return null

  const [{ data: config }, { conversationId, messages }] = await Promise.all([
    supabase
      .from('support_config')
      .select('admin_contact_email, admin_contact_phone')
      .maybeSingle(),
    loadConversation(supabase, user.id),
  ])

  const { count: unread } = conversationId
    ? await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('sender_role', 'admin')
        .is('read_at', null)
    : { count: 0 }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={Mail}
        title="Contact Admin"
        subtitle="Email, call, or message the SkillFleet team."
      />

      <ContactAdminPanel
        email={config?.admin_contact_email ?? null}
        phone={config?.admin_contact_phone ?? null}
        messages={messages}
        conversationId={conversationId}
        unread={unread ?? 0}
      />
    </div>
  )
}
