import fs from 'node:fs'
import path from 'node:path'

const TRACK_LOG_FILE = path.join(process.cwd(), '.kilo', 'campaign-tracking.json')

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

export function recordTrackingEvent(event: Omit<TrackingEvent, 'timestamp'>): void {
  try {
    const dir = path.dirname(TRACK_LOG_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    let list: TrackingEvent[] = []
    if (fs.existsSync(TRACK_LOG_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(TRACK_LOG_FILE, 'utf-8'))
      } catch {
        list = []
      }
    }

    list.push({
      ...event,
      timestamp: new Date().toISOString(),
    })

    fs.writeFileSync(TRACK_LOG_FILE, JSON.stringify(list, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to log tracking event:', err)
  }
}

export function getTrackingStats(): Record<
  string,
  {
    opens: number
    lastOpenedAt?: string
    clicks: number
    lastClickedAt?: string
  }
> {
  try {
    if (!fs.existsSync(TRACK_LOG_FILE)) return {}
    const list = JSON.parse(fs.readFileSync(TRACK_LOG_FILE, 'utf-8')) as TrackingEvent[]

    const stats: Record<
      string,
      { opens: number; lastOpenedAt?: string; clicks: number; lastClickedAt?: string }
    > = {}

    for (const item of list) {
      if (!stats[item.recipientEmail]) {
        stats[item.recipientEmail] = { opens: 0, clicks: 0 }
      }
      if (item.type === 'open') {
        stats[item.recipientEmail].opens += 1
        stats[item.recipientEmail].lastOpenedAt = item.timestamp
      } else if (item.type === 'click') {
        stats[item.recipientEmail].clicks += 1
        stats[item.recipientEmail].lastClickedAt = item.timestamp
      }
    }

    return stats
  } catch {
    return {}
  }
}
