import { Mail } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmailDashboardTabs } from '@/components/admin/email-dashboard-tabs'
import { getGmailConnectionStatus } from '@/app/actions/gmail'
import { getCampaignRecipients } from '@/lib/gmail/campaign'
import { getSentEmailRecords } from '@/lib/gmail/sent-log'
import { requireAdmin } from '@/lib/admin/guard'

interface PageProps {
  searchParams: Promise<{
    gmail_connected?: string
    gmail_error?: string
  }>
}

export default async function AdminEmailPage({ searchParams }: PageProps) {
  await requireAdmin()
  const { connected, hasRefreshToken } = await getGmailConnectionStatus()
  const params = await searchParams
  const recipients = getCampaignRecipients()
  const sentHistory = await getSentEmailRecords('isc-2026')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Tools"
        icon={Mail}
        title="Gmail Sender & ISC Campaign Center"
        subtitle="Test personalized email delivery with custom school names, preview HTML templates, and dispatch campaigns via Gmail API."
      />

      <EmailDashboardTabs
        recipients={recipients}
        isConnected={connected}
        hasRefreshToken={hasRefreshToken}
        connectedNotice={params.gmail_connected === 'true'}
        error={params.gmail_error}
        initialSentHistory={sentHistory}
      />
    </div>
  )
}
