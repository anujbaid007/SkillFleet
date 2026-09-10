'use server'

import { cookies } from 'next/headers'
import { sendGmailEmail, refreshAccessToken } from '@/lib/gmail/client'
import { getValidAccessToken, saveGmailTokens, loadSenderAccounts } from '@/lib/gmail/storage'
import {
  getCampaignRecipients,
  formatCustomEmailPayload,
  formatRecipientPayload,
  loadRawContacts,
  getAvailableStates,
  type CampaignRecipient,
} from '@/lib/gmail/campaign'
import { getTrackingStats, loadTrackingEvents, type TrackingEvent } from '@/lib/tracking/logger'
import {
  recordSentEmail,
  getSentEmailRecords,
  loadSentEmailRecords,
  get24HourSenderQuotas,
  APPROVED_CAMPAIGN_SENDERS,
  DAILY_SENDER_LIMIT,
  type SenderQuotaStats,
} from '@/lib/gmail/sent-log'
import { requireAdmin } from '@/lib/admin/guard'

export type { SenderQuotaStats }
export { APPROVED_CAMPAIGN_SENDERS, DAILY_SENDER_LIMIT }

export interface CampaignSendResult {
  index: number
  recipient: string
  schoolName: string
  success: boolean
  messageId?: string
  sentAt?: string
  error?: string
}

export interface CustomTestEmailInput {
  schoolName: string
  recipient: string
  contactName?: string
  senderEmail?: string
}

export async function getSenderQuotaStatsAction(): Promise<Record<string, SenderQuotaStats>> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const accounts = await loadSenderAccounts()
  const connectedEmails = accounts.map((a) => a.email)
  const sendersToTrack = Array.from(new Set([...APPROVED_CAMPAIGN_SENDERS, ...connectedEmails]))
  return get24HourSenderQuotas(sendersToTrack)
}

export interface CampaignAnalyticsData {
  totalSent: number
  totalOpens: number
  uniqueOpens: number
  openRate: number
  totalClicks: number
  uniqueClicks: number
  clickRate: number
  clickToOpenRate: number
  linkBreakdown: Array<{ url: string; label: string; count: number }>
  topSchools: Array<{
    schoolName: string
    recipient: string
    opens: number
    clicks: number
    lastActiveAt?: string
  }>
  recentActivity: Array<{
    type: 'open' | 'click'
    schoolName: string
    recipientEmail: string
    targetUrl?: string
    timestamp: string
    device?: string
  }>
}

function getLinkLabel(url?: string): string {
  if (!url) return 'General Link'
  if (url.includes('/signup/coordinator')) return 'Coordinator Signup'
  if (url.includes('/signup')) return 'Student Registration'
  if (url.includes('ISC-School-Deck.pdf')) return 'Download School Deck'
  if (url.includes('ISC-Student-Deck.pdf')) return 'Download Student Deck'
  if (url.includes('/isc-2026') || url.includes('skillfleet.org')) return 'ISC Website'
  return url
}

function parseDevice(userAgent?: string): string {
  if (!userAgent) return 'Web / Desktop'
  if (userAgent.includes('GoogleImageProxy') || userAgent.includes('ggpht.com')) return 'Gmail Proxy (Web/App)'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'Apple iOS Mail'
  if (userAgent.includes('Android')) return 'Android Mobile'
  if (userAgent.includes('Macintosh')) return 'macOS'
  if (userAgent.includes('Windows')) return 'Windows'
  return 'Desktop Web'
}

export async function getDetailedCampaignAnalyticsAction(): Promise<CampaignAnalyticsData> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }

  const [events, sentRecords] = await Promise.all([
    loadTrackingEvents(),
    loadSentEmailRecords(),
  ])

  const totalSent = sentRecords.filter((r) => r.campaignId === 'Introduction to ISC 2026').length || sentRecords.length || 1

  let totalOpens = 0
  let totalClicks = 0
  const uniqueOpenEmails = new Set<string>()
  const uniqueClickEmails = new Set<string>()
  const linkCounts: Record<string, number> = {}
  const schoolStatsMap: Record<
    string,
    { schoolName: string; recipient: string; opens: number; clicks: number; lastActiveAt?: string }
  > = {}

  for (const ev of events) {
    const emailNorm = (ev.recipientEmail || '').trim().toLowerCase()
    if (!emailNorm) continue

    if (!schoolStatsMap[emailNorm]) {
      schoolStatsMap[emailNorm] = {
        schoolName: ev.schoolName || 'Unknown School',
        recipient: ev.recipientEmail,
        opens: 0,
        clicks: 0,
        lastActiveAt: ev.timestamp,
      }
    }

    if (ev.type === 'open') {
      totalOpens++
      uniqueOpenEmails.add(emailNorm)
      schoolStatsMap[emailNorm].opens++
    } else if (ev.type === 'click') {
      totalClicks++
      uniqueClickEmails.add(emailNorm)
      schoolStatsMap[emailNorm].clicks++
      const target = ev.targetUrl || 'Unknown'
      linkCounts[target] = (linkCounts[target] || 0) + 1
    }

    if (
      !schoolStatsMap[emailNorm].lastActiveAt ||
      new Date(ev.timestamp) > new Date(schoolStatsMap[emailNorm].lastActiveAt!)
    ) {
      schoolStatsMap[emailNorm].lastActiveAt = ev.timestamp
    }
  }

  const uniqueOpens = uniqueOpenEmails.size
  const uniqueClicks = uniqueClickEmails.size
  const openRate = totalSent > 0 ? Number(((uniqueOpens / totalSent) * 100).toFixed(1)) : 0
  const clickRate = totalSent > 0 ? Number(((uniqueClicks / totalSent) * 100).toFixed(1)) : 0
  const clickToOpenRate = uniqueOpens > 0 ? Number(((uniqueClicks / uniqueOpens) * 100).toFixed(1)) : 0

  const linkBreakdown = Object.entries(linkCounts)
    .map(([url, count]) => ({
      url,
      label: getLinkLabel(url),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const topSchools = Object.values(schoolStatsMap)
    .sort((a, b) => b.clicks * 3 + b.opens - (a.clicks * 3 + a.opens))
    .slice(0, 50)

  const recentActivity = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50)
    .map((ev) => ({
      type: ev.type,
      schoolName: ev.schoolName || 'School Contact',
      recipientEmail: ev.recipientEmail,
      targetUrl: ev.targetUrl,
      timestamp: ev.timestamp,
      device: parseDevice(ev.userAgent),
    }))

  return {
    totalSent,
    totalOpens,
    uniqueOpens,
    openRate,
    totalClicks,
    uniqueClicks,
    clickRate,
    clickToOpenRate,
    linkBreakdown,
    topSchools,
    recentActivity,
  }
}

/**
 * Returns HTML preview for custom school name.
 */
export async function previewCustomEmailAction(input: CustomTestEmailInput) {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  return formatCustomEmailPayload(input)
}

/**
 * Sends a custom test email to any recipient with any school name and tracks it in sandbox history.
 */
export async function sendCustomTestEmailAction(
  input: CustomTestEmailInput
): Promise<CampaignSendResult> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }

  const schoolName = input.schoolName?.trim()
  const recipient = input.recipient?.trim()
  const requestedSender = input.senderEmail?.trim()

  if (!schoolName || !recipient || !recipient.includes('@')) {
    return {
      index: 0,
      recipient: recipient || '',
      schoolName: schoolName || '',
      success: false,
      error: 'Valid School Name and Recipient Email are required.',
    }
  }

  const tokenData = await getValidAccessToken(requestedSender || undefined)

  if (!tokenData) {
    return {
      index: 0,
      recipient,
      schoolName,
      success: false,
      error: 'No active Gmail sender account connected. Please connect your Gmail account first.',
    }
  }

  const payload = formatCustomEmailPayload({
    schoolName,
    recipient,
    contactName: input.contactName,
  })

  try {
    const res = await sendGmailEmail({
      accessToken: tokenData.accessToken,
      email: {
        to: recipient,
        from: tokenData.senderEmail,
        subject: payload.subject,
        html: payload.htmlBody,
        text: payload.textBody,
      },
    })

    await recordSentEmail({
      campaignId: 'isc-sandbox',
      index: 0,
      recipient,
      schoolName,
      messageId: res.id,
    })

    return {
      index: 0,
      recipient,
      schoolName,
      success: true,
      messageId: res.id,
      sentAt: new Date().toISOString(),
    }
  } catch (err: unknown) {
    return {
      index: 0,
      recipient,
      schoolName,
      success: false,
      error: err instanceof Error ? err.message : 'Send failed',
    }
  }
}

export async function getSandboxHistoryAction() {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const list = await loadSentEmailRecords()
  return list.filter((r) => r.campaignId === 'isc-sandbox')
}

export async function getAvailableStatesAction() {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  return getAvailableStates()
}

export async function getCampaignListAction(): Promise<CampaignRecipient[]> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  return getCampaignRecipients(0)
}

export async function getCampaignTrackingAction() {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  return getTrackingStats()
}

export async function getCampaignSentHistoryAction() {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  return getSentEmailRecords('Introduction to ISC 2026')
}

/**
 * Sends a single email to one campaign recipient.
 */
export async function sendCampaignEmailAction(
  index: number,
  senderEmail?: string
): Promise<CampaignSendResult> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const rawList = loadRawContacts()
  const rawTarget = rawList.find((r) => r.index === index)

  if (!rawTarget) {
    return {
      index,
      recipient: '',
      schoolName: '',
      success: false,
      error: 'Recipient not found',
    }
  }

  const target = formatRecipientPayload(rawTarget)

  if (!target.hasEmail || !target.recipient) {
    return {
      index: target.index,
      recipient: '',
      schoolName: target.schoolName,
      success: false,
      error: 'No valid email address for this school',
    }
  }

  // Quota enforcement: check if requested sender has reached 1,800 limit
  let activeSender = senderEmail
  const quotas = await get24HourSenderQuotas()
  if (activeSender && quotas[activeSender]?.isExhausted) {
    const unexhausted = Object.values(quotas).find((q) => !q.isExhausted)
    if (unexhausted) {
      activeSender = unexhausted.email
    } else {
      return {
        index: target.index,
        recipient: target.recipient,
        schoolName: target.schoolName,
        success: false,
        error: `Daily limit reached (1,800 emails/24h per sender). Please wait for the quota window to reset.`,
      }
    }
  }

  const tokenData = await getValidAccessToken(activeSender || undefined)

  if (!tokenData) {
    return {
      index: target.index,
      recipient: target.recipient,
      schoolName: target.schoolName,
      success: false,
      error: 'No active Gmail sender account connected. Please connect your Gmail account first.',
    }
  }

  try {
    const res = await sendGmailEmail({
      accessToken: tokenData.accessToken,
      email: {
        to: target.recipient,
        from: tokenData.senderEmail,
        subject: target.subject,
        html: target.htmlBody,
        text: target.textBody,
      },
    })

    await recordSentEmail({
      campaignId: 'Introduction to ISC 2026',
      index: target.index,
      recipient: target.recipient,
      schoolName: target.schoolName,
      senderAccount: tokenData.senderEmail,
      messageId: res.id,
    })

    return {
      index: target.index,
      recipient: target.recipient,
      schoolName: target.schoolName,
      success: true,
      messageId: res.id,
      sentAt: new Date().toISOString(),
    }
  } catch (err: unknown) {
    return {
      index: target.index,
      recipient: target.recipient,
      schoolName: target.schoolName,
      success: false,
      error: err instanceof Error ? err.message : 'Send failed',
    }
  }
}
