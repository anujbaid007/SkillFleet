import { Mail, Send, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmailForm } from '@/components/admin/email-form'
import { CampaignManager } from '@/components/admin/campaign-manager'
import { getGmailConnectionStatus } from '@/app/actions/gmail'
import { getTop10CampaignRecipients } from '@/lib/gmail/campaign'
import { getSentEmailRecords } from '@/lib/gmail/sent-log'
import { requireAdmin } from '@/lib/admin/guard'

interface PageProps {
  searchParams: Promise<{
    gmail_connected?: string
    gmail_error?: string
  }>
}

export default async function EmailPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const { connected, hasRefreshToken } = await getGmailConnectionStatus()
  const params = await searchParams
  const recipients = getTop10CampaignRecipients()
  const sentHistory = await getSentEmailRecords('isc-2026')

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      <PageHeader
        eyebrow="ISC 2026 Outreach"
        icon={Mail}
        title="Email Mail-Merge & Campaign Center"
        subtitle="Review personalized emails, inspect live HTML templates, and dispatch campaigns via the Gmail API."
      />

      {/* Gmail Connection Status */}
      <EmailForm
        isConnected={connected}
        hasRefreshToken={hasRefreshToken}
        connectedNotice={params.gmail_connected === 'true'}
        error={params.gmail_error}
        returnTo="/email"
      />

      {/* Top 10 Mail Merge Campaign Table */}
      <CampaignManager
        recipients={recipients}
        isConnected={connected}
        initialSentHistory={sentHistory}
      />
    </div>
  )
}
