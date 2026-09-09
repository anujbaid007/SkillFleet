'use server'

import { cookies } from 'next/headers'
import { sendGmailEmail, refreshAccessToken } from '@/lib/gmail/client'
import { getValidAccessToken, saveGmailTokens } from '@/lib/gmail/storage'
import {
  getCampaignRecipients,
  formatCustomEmailPayload,
  type CampaignRecipient,
} from '@/lib/gmail/campaign'
import { getTrackingStats } from '@/lib/tracking/logger'
import { recordSentEmail, getSentEmailRecords, loadSentEmailRecords } from '@/lib/gmail/sent-log'
import { requireAdmin } from '@/lib/admin/guard'

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

  if (!schoolName || !recipient || !recipient.includes('@')) {
    return {
      index: 0,
      recipient: recipient || '',
      schoolName: schoolName || '',
      success: false,
      error: 'Valid School Name and Recipient Email are required.',
    }
  }

  let accessToken: string | undefined

  try {
    const cookieStore = await cookies()
    accessToken = cookieStore.get('gmail_access_token')?.value

    if (!accessToken) {
      const refreshToken = cookieStore.get('gmail_refresh_token')?.value
      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET

      if (refreshToken && clientId && clientSecret) {
        try {
          const refreshed = await refreshAccessToken({
            refreshToken,
            clientId,
            clientSecret,
          })
          accessToken = refreshed.access_token
          saveGmailTokens(refreshed)
        } catch {
          // Fallback to storage token
        }
      }
    }
  } catch {
    // Outside Next.js request context
  }

  if (!accessToken) {
    accessToken = (await getValidAccessToken()) || undefined
  }

  if (!accessToken) {
    return {
      index: 0,
      recipient,
      schoolName,
      success: false,
      error: 'Gmail account not connected. Please authorize via Connect Gmail first.',
    }
  }

  const payload = formatCustomEmailPayload({
    schoolName,
    recipient,
    contactName: input.contactName,
  })

  try {
    const res = await sendGmailEmail({
      accessToken,
      email: {
        to: recipient,
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

export async function getCampaignListAction(): Promise<CampaignRecipient[]> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  return getCampaignRecipients()
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
export async function sendCampaignEmailAction(index: number): Promise<CampaignSendResult> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const recipients = getCampaignRecipients()
  const target = recipients.find((r) => r.index === index)

  if (!target) {
    return {
      index,
      recipient: '',
      schoolName: '',
      success: false,
      error: 'Recipient not found',
    }
  }

  if (!target.hasEmail || !target.recipient) {
    return {
      index: target.index,
      recipient: '',
      schoolName: target.schoolName,
      success: false,
      error: 'No valid email address for this school',
    }
  }

  const cookieStore = await cookies()
  let accessToken = cookieStore.get('gmail_access_token')?.value

  if (!accessToken) {
    const refreshToken = cookieStore.get('gmail_refresh_token')?.value
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (refreshToken && clientId && clientSecret) {
      try {
        const refreshed = await refreshAccessToken({
          refreshToken,
          clientId,
          clientSecret,
        })
        accessToken = refreshed.access_token
        saveGmailTokens(refreshed)
      } catch {
        // Fallback to storage token
      }
    }
  }

  if (!accessToken) {
    accessToken = (await getValidAccessToken()) || undefined
  }

  if (!accessToken) {
    return {
      index: target.index,
      recipient: target.recipient,
      schoolName: target.schoolName,
      success: false,
      error: 'Gmail account not connected. Please connect your Gmail account first.',
    }
  }

  try {
    const res = await sendGmailEmail({
      accessToken,
      email: {
        to: target.recipient,
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
