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
  CAMPAIGN_OPTIONS,
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
  subjectTemplate?: string
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
  availableCampaigns: string[]
  selectedCampaign: string
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

function matchesCampaign(recordCampaign: string | undefined, selected: string): boolean {
  if (selected === 'all') return true
  if (!recordCampaign) return selected === 'Campaign 1: Introduction to ISC 2026'
  
  if (selected.includes('Introduction to ISC 2026')) {
    return (
      recordCampaign.includes('Introduction to ISC') ||
      recordCampaign === 'isc-2026' ||
      recordCampaign === 'Campaign 1: Introduction to ISC 2026'
    )
  }
  if (selected.includes('Sandbox') || selected === 'isc-sandbox') {
    return recordCampaign.includes('sandbox') || recordCampaign.includes('Sandbox')
  }
  return recordCampaign.toLowerCase() === selected.toLowerCase()
}

export async function getDetailedCampaignAnalyticsAction(
  selectedCampaign: string = 'Campaign 1: Introduction to ISC 2026'
): Promise<CampaignAnalyticsData> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }

  const [rawEvents, rawSentRecords] = await Promise.all([
    loadTrackingEvents(),
    loadSentEmailRecords(),
  ])

  // Discover all distinct campaign IDs in database
  const discoveredCampaigns = new Set<string>(CAMPAIGN_OPTIONS)
  for (const r of rawSentRecords) {
    if (r.campaignId) discoveredCampaigns.add(r.campaignId)
  }
  for (const ev of rawEvents) {
    if (ev.campaignId) discoveredCampaigns.add(ev.campaignId)
  }
  const availableCampaigns = Array.from(discoveredCampaigns)

  // Filter events and sent records by selected campaign
  const sentRecords = rawSentRecords.filter((r) => matchesCampaign(r.campaignId, selectedCampaign))
  const events = rawEvents.filter((ev) => matchesCampaign(ev.campaignId, selectedCampaign))

  const totalSent = sentRecords.length || (selectedCampaign === 'all' ? rawSentRecords.length : 0)

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
    .slice(0, 100)

  const recentActivity = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100)
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
    availableCampaigns,
    selectedCampaign,
    linkBreakdown,
    topSchools,
    recentActivity,
  }
}

/**
 * Returns rendered HTML preview and personalized subject for a specific school index on demand.
 */
export async function previewCampaignRecipientAction(
  index: number,
  campaignName: string = 'Campaign 1: Introduction to ISC 2026',
  customSubject?: string
): Promise<{ html: string; subject: string }> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const rawList = loadRawContacts()
  const target = rawList.find((r) => r.index === index) || rawList[0]
  if (!target) return { html: '', subject: '' }
  const payload = formatRecipientPayload(target, campaignName, customSubject)
  return {
    html: payload.htmlBody,
    subject: payload.subject,
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
    subjectTemplate: input.subjectTemplate,
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

export async function getCampaignSentHistoryAction(
  campaignId: string = 'Campaign 1: Introduction to ISC 2026'
) {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  return getSentEmailRecords(campaignId)
}

/**
 * Sends a single email to one campaign recipient with server-side deduplication lock.
 */
export async function sendCampaignEmailAction(
  index: number,
  senderEmail?: string,
  campaignId: string = 'Campaign 1: Introduction to ISC 2026',
  customSubject?: string,
  forceResend = false
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

  const target = formatRecipientPayload(rawTarget, campaignId, customSubject)

  if (!target.hasEmail || !target.recipient) {
    return {
      index: target.index,
      recipient: '',
      schoolName: target.schoolName,
      success: false,
      error: 'No valid email address for this school',
    }
  }

  // 1. Strict Server-Side Deduplication Lock (Prevents duplicate sends even on race conditions)
  if (!forceResend) {
    const sentMap = await getSentEmailRecords(campaignId)
    const normEmail = target.recipient.toLowerCase().trim()
    const existing = sentMap[normEmail] || sentMap[target.recipient]

    if (existing) {
      return {
        index: target.index,
        recipient: target.recipient,
        schoolName: target.schoolName,
        success: true,
        messageId: existing.messageId,
        sentAt: existing.sentAt,
      }
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
      campaignId: campaignId || 'Campaign 1: Introduction to ISC 2026',
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
