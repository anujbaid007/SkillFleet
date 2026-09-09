import fs from 'node:fs'
import path from 'node:path'
import { adminClient } from '@/lib/supabase/admin'

const SENT_LOG_FILE = path.join(process.cwd(), '.kilo', 'sent-campaigns.json')
const BUCKET_NAME = 'campaign-logs'
const SENT_BLOB_PATH = 'sent-campaigns.json'

export interface SentEmailRecord {
  campaignId: string
  index: number
  recipient: string
  schoolName: string
  sentAt: string
  messageId?: string
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

export async function getSentEmailRecords(
  campaignId = 'Introduction to ISC 2026'
): Promise<Record<string, { sentAt: string; messageId?: string; index: number }>> {
  const list = await loadSentEmailRecords()
  const map: Record<string, { sentAt: string; messageId?: string; index: number }> = {}

  for (const item of list) {
    if (item.campaignId === campaignId) {
      map[item.recipient] = {
        sentAt: item.sentAt,
        messageId: item.messageId,
        index: item.index,
      }
    }
  }
  return map
}
