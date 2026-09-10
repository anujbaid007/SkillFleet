import fs from 'node:fs'
import path from 'node:path'
import { adminClient } from '@/lib/supabase/admin'

const SENT_LOG_FILE = path.join(process.cwd(), '.kilo', 'sent-campaigns.json')
const BUCKET_NAME = 'campaign-logs'
const SENT_BLOB_PATH = 'sent-campaigns.json'

export const DAILY_SENDER_LIMIT = 1800

export const APPROVED_CAMPAIGN_SENDERS = [
  'contact@skillfleet.org',
  'isc@skillfleet.org',
  'hello@skillfleet.org',
]

export interface SentEmailRecord {
  campaignId: string
  index: number
  recipient: string
  schoolName: string
  senderAccount?: string
  sentAt: string
  messageId?: string
}

export interface SenderQuotaStats {
  email: string
  sentToday: number
  limit: number
  remaining: number
  isExhausted: boolean
}

/**
 * Loads all sent records from Supabase Storage (or local fallback).
 */
export async function loadSentEmailRecords(): Promise<SentEmailRecord[]> {
  try {
    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .download(SENT_BLOB_PATH)

    if (!error && data) {
      const text = await data.text()
      return JSON.parse(text) as SentEmailRecord[]
    }
  } catch {
    // Fall back to local file
  }

  try {
    if (fs.existsSync(SENT_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(SENT_LOG_FILE, 'utf-8')) as SentEmailRecord[]
    }
  } catch {
    // Return empty list on parse error
  }

  return []
}

export async function recordSentEmail(
  record: Omit<SentEmailRecord, 'sentAt'>
): Promise<void> {
  const newRecord: SentEmailRecord = {
    ...record,
    sentAt: new Date().toISOString(),
  }

  // 1. Local disk update
  try {
    const dir = path.dirname(SENT_LOG_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    let localList: SentEmailRecord[] = []
    if (fs.existsSync(SENT_LOG_FILE)) {
      try {
        localList = JSON.parse(fs.readFileSync(SENT_LOG_FILE, 'utf-8'))
      } catch {
        localList = []
      }
    }
    localList = localList.filter((item) => item.recipient !== record.recipient)
    localList.push(newRecord)
    fs.writeFileSync(SENT_LOG_FILE, JSON.stringify(localList, null, 2), 'utf-8')
  } catch {
    // Ignore local disk error
  }

  // 2. Supabase Storage synchronization
  try {
    let remoteList = await loadSentEmailRecords()
    remoteList = remoteList.filter((item) => item.recipient !== record.recipient)
    remoteList.push(newRecord)
    const buffer = Buffer.from(JSON.stringify(remoteList, null, 2), 'utf-8')
    await adminClient.storage
      .from(BUCKET_NAME)
      .upload(SENT_BLOB_PATH, buffer, {
        upsert: true,
        contentType: 'application/json',
      })
  } catch (err) {
    console.error('Failed to sync sent email record to Supabase storage:', err)
  }
}

function isMatchingCampaign(itemCampaign: string | undefined, targetCampaign: string): boolean {
  if (!itemCampaign) return true
  if (targetCampaign === 'all') return true
  const normItem = itemCampaign.toLowerCase().trim()
  const normTarget = targetCampaign.toLowerCase().trim()

  if (normTarget.includes('introduction to isc') || normTarget.includes('campaign 1')) {
    return (
      normItem.includes('introduction to isc') ||
      normItem === 'isc-2026' ||
      normItem.includes('campaign 1')
    )
  }
  if (normTarget.includes('sandbox')) {
    return normItem.includes('sandbox')
  }
  return normItem === normTarget
}

export async function getSentEmailRecords(
  campaignId = 'Campaign 1: Introduction to ISC 2026'
): Promise<Record<string, { sentAt: string; messageId?: string; index: number; senderAccount?: string }>> {
  const list = await loadSentEmailRecords()
  const map: Record<string, { sentAt: string; messageId?: string; index: number; senderAccount?: string }> = {}

  for (const item of list) {
    if (isMatchingCampaign(item.campaignId, campaignId)) {
      const entry = {
        sentAt: item.sentAt,
        messageId: item.messageId,
        index: item.index,
        senderAccount: item.senderAccount,
      }
      map[item.recipient] = entry
      if (item.recipient) {
        map[item.recipient.toLowerCase().trim()] = entry
      }
    }
  }
  return map
}

/**
 * Calculates the rolling 24-hour quota usage per sender account.
 */
export async function get24HourSenderQuotas(
  connectedSenders: string[] = APPROVED_CAMPAIGN_SENDERS
): Promise<Record<string, SenderQuotaStats>> {
  const list = await loadSentEmailRecords()
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000

  const usageMap: Record<string, number> = {}
  for (const s of connectedSenders) {
    usageMap[s.toLowerCase()] = 0
  }

  for (const record of list) {
    if (record.sentAt && new Date(record.sentAt).getTime() >= twentyFourHoursAgo) {
      const senderKey = (record.senderAccount || 'default').toLowerCase()
      usageMap[senderKey] = (usageMap[senderKey] || 0) + 1
    }
  }

  const result: Record<string, SenderQuotaStats> = {}
  for (const s of connectedSenders) {
    const key = s.toLowerCase()
    const sentToday = usageMap[key] || 0
    const remaining = Math.max(0, DAILY_SENDER_LIMIT - sentToday)
    result[s] = {
      email: s,
      sentToday,
      limit: DAILY_SENDER_LIMIT,
      remaining,
      isExhausted: remaining <= 0,
    }
  }

  return result
}
