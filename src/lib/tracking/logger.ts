import fs from 'node:fs'
import path from 'node:path'
import { adminClient } from '@/lib/supabase/admin'

const TRACK_LOG_FILE = path.join(process.cwd(), '.kilo', 'campaign-tracking.json')
const BUCKET_NAME = 'campaign-logs'
const TRACKING_BLOB_PATH = 'tracking.json'

export interface TrackingEvent {
  type: 'open' | 'click'
  campaignId: string
  recipientEmail: string
  schoolName: string
  timestamp: string
  targetUrl?: string
  userAgent?: string
  ip?: string
}

/**
 * Reads all tracking events from Supabase Storage (or local fallback).
 */
export async function loadTrackingEvents(): Promise<TrackingEvent[]> {
  try {
    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .download(TRACKING_BLOB_PATH)

    if (!error && data) {
      const text = await data.text()
      return JSON.parse(text) as TrackingEvent[]
    }
  } catch {
    // Fall back to local file
  }

  try {
    if (fs.existsSync(TRACK_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(TRACK_LOG_FILE, 'utf-8')) as TrackingEvent[]
    }
  } catch {
    // Return empty list on parse error
  }

  return []
}

/**
 * Persists a new tracking event to Supabase Storage and local disk.
 */
export async function recordTrackingEvent(
  event: Omit<TrackingEvent, 'timestamp'>
): Promise<void> {
  const newEvent: TrackingEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  // 1. Update local file for instant local dev feedback
  try {
    const dir = path.dirname(TRACK_LOG_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    let localList: TrackingEvent[] = []
    if (fs.existsSync(TRACK_LOG_FILE)) {
      try {
        localList = JSON.parse(fs.readFileSync(TRACK_LOG_FILE, 'utf-8'))
      } catch {
        localList = []
      }
    }
    localList.push(newEvent)
    fs.writeFileSync(TRACK_LOG_FILE, JSON.stringify(localList, null, 2), 'utf-8')
  } catch {
    // Ignore local disk errors in serverless environments
  }

  // 2. Persist to Supabase Storage for global edge synchronization
  try {
    const remoteList = await loadTrackingEvents()
    remoteList.push(newEvent)
    const buffer = Buffer.from(JSON.stringify(remoteList, null, 2), 'utf-8')
    await adminClient.storage
      .from(BUCKET_NAME)
      .upload(TRACKING_BLOB_PATH, buffer, {
        upsert: true,
        contentType: 'application/json',
      })
  } catch (err) {
    console.error('Failed to sync tracking event to Supabase storage:', err)
  }
}

/**
 * Returns calculated engagement stats per recipient email.
 */
export async function getTrackingStats(): Promise<
  Record<
    string,
    {
      opens: number
      lastOpenedAt?: string
      clicks: number
      lastClickedAt?: string
    }
  >
> {
  const list = await loadTrackingEvents()
  const stats: Record<
    string,
    { opens: number; lastOpenedAt?: string; clicks: number; lastClickedAt?: string }
  > = {}

  for (const item of list) {
    const rawKey = item.recipientEmail || ''
    const normalizedKey = rawKey.trim().toLowerCase()
    if (!normalizedKey) continue

    if (!stats[normalizedKey]) {
      stats[normalizedKey] = { opens: 0, clicks: 0 }
    }
    if (item.type === 'open') {
      stats[normalizedKey].opens += 1
      stats[normalizedKey].lastOpenedAt = item.timestamp
    } else if (item.type === 'click') {
      stats[normalizedKey].clicks += 1
      stats[normalizedKey].lastClickedAt = item.timestamp
    }

    // Also mirror under the raw key if different
    if (rawKey && rawKey !== normalizedKey) {
      stats[rawKey] = stats[normalizedKey]
    }
  }

  return stats
}
