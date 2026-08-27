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

  const hasContact = Boolean(config?.admin_contact_email || config?.admin_contact_phone)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={Mail}
        title="Contact Admin"
        subtitle="Message the SkillFleet team — they usually reply here."
      />

      {hasContact && (
        <div className="clay-card p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Other ways to reach us
          </p>
          <div className="flex flex-wrap gap-6 mt-3">
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
