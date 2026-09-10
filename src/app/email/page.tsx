import { notFound } from 'next/navigation'
import { Mail } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmailDashboardTabs } from '@/components/admin/email-dashboard-tabs'
import { getGmailConnectionStatus } from '@/app/actions/gmail'
import { getCampaignRecipients } from '@/lib/gmail/campaign'
import { getSentEmailRecords } from '@/lib/gmail/sent-log'

interface PageProps {
  searchParams: Promise<{
    gmail_connected?: string
    gmail_error?: string
  }>
}

export default async function EmailPage({ searchParams }: PageProps) {
  // Disallow on public production domain — local development control only
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { connected, hasRefreshToken } = await getGmailConnectionStatus()
  const params = await searchParams
  const recipients = getCampaignRecipients()
  const sentHistory = await getSentEmailRecords('Introduction to ISC 2026')

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      <PageHeader
        eyebrow="Local Control Center"
        icon={Mail}
        title="Email Testing, Mail-Merge & Campaign Center"
        subtitle="Manage campaigns, test personalized email delivery, inspect live analytics, and dispatch via Gmail API locally."
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
