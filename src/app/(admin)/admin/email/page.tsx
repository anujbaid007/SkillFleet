import { Mail } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmailForm } from '@/components/admin/email-form'
import { getGmailConnectionStatus } from '@/app/actions/gmail'
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Tools"
        icon={Mail}
        title="Gmail Sender"
        subtitle="Connect your Gmail account and send emails through the official Gmail API."
      />

      <EmailForm
        isConnected={connected}
        hasRefreshToken={hasRefreshToken}
        connectedNotice={params.gmail_connected === 'true'}
        error={params.gmail_error}
      />
    </div>
  )
}
