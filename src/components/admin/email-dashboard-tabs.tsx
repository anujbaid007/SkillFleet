'use client'

import { useState } from 'react'
import { Sparkles, School, Mail, BarChart3 } from 'lucide-react'
import { CampaignAnalytics } from '@/components/admin/campaign-analytics'
import { CustomTestEmailer } from '@/components/admin/custom-test-emailer'
import { CampaignManager } from '@/components/admin/campaign-manager'
import { EmailForm } from '@/components/admin/email-form'
import type { CampaignRecipient } from '@/lib/gmail/campaign'

interface EmailDashboardTabsProps {
  recipients: CampaignRecipient[]
  isConnected: boolean
  hasRefreshToken: boolean
  connectedNotice?: boolean
  error?: string
  initialSentHistory?: Record<string, { sentAt: string; messageId?: string; index: number }>
}

export function EmailDashboardTabs({
  recipients,
  isConnected,
  hasRefreshToken,
  connectedNotice,
  error,
  initialSentHistory,
}: EmailDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'campaign' | 'sandbox' | 'single'>('analytics')

  return (
    <div className="space-y-6">
      {/* Top Header Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics & Engagement (Live)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('campaign')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 ${
            activeTab === 'campaign'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <School className="w-4 h-4" />
          Introduction to ISC 2026 ({recipients.length} Contacts)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sandbox')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 ${
            activeTab === 'sandbox'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Test Sandbox (Custom School)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 ${
            activeTab === 'single'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Mail className="w-4 h-4" />
          Account & Custom Compose
        </button>
      </div>

      {/* Tab 1: Live Analytics & Engagement */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <CampaignAnalytics />
        </div>
      )}

      {/* Tab 2: Bulk Campaign */}
      {activeTab === 'campaign' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <CampaignManager
            recipients={recipients}
            isConnected={isConnected}
            initialSentHistory={initialSentHistory}
          />
        </div>
      )}

      {/* Tab 3: Test Sandbox */}
      {activeTab === 'sandbox' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <CustomTestEmailer isConnected={isConnected} />
        </div>
      )}

      {/* Tab 4: Single / Account */}
      {activeTab === 'single' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <EmailForm
            isConnected={isConnected}
            hasRefreshToken={hasRefreshToken}
            connectedNotice={connectedNotice}
            error={error}
            returnTo="/email"
          />
        </div>
      )}
    </div>
  )
}
