import fs from 'node:fs'
import path from 'node:path'

const SENT_LOG_FILE = path.join(process.cwd(), '.kilo', 'sent-campaigns.json')

export interface SentEmailRecord {
  campaignId: string
  index: number
  recipient: string
  schoolName: string
  sentAt: string
  messageId?: string
}

export function recordSentEmail(record: Omit<SentEmailRecord, 'sentAt'>): void {
  try {
    const dir = path.dirname(SENT_LOG_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    let list: SentEmailRecord[] = []
    if (fs.existsSync(SENT_LOG_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(SENT_LOG_FILE, 'utf-8'))
      } catch {
        list = []
      }
    }

    // Filter out existing record for this recipient/index if present, then add new one
    list = list.filter((item) => item.recipient !== record.recipient)
    list.push({
      ...record,
      sentAt: new Date().toISOString(),
    })

    fs.writeFileSync(SENT_LOG_FILE, JSON.stringify(list, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to record sent email:', err)
  }
}

export function getSentEmailRecords(
  campaignId = 'isc-2026'
): Record<string, { sentAt: string; messageId?: string; index: number }> {
  try {
    if (!fs.existsSync(SENT_LOG_FILE)) return {}
    const list = JSON.parse(fs.readFileSync(SENT_LOG_FILE, 'utf-8')) as SentEmailRecord[]

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
  } catch {
    return {}
  }
}
