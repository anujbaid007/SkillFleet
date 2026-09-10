import fs from 'node:fs'
import path from 'node:path'
import { getIscEmailTemplate } from './templates/isc-email'

export interface CampaignRecipient {
  index: number
  schoolName: string
  contactName: string
  recipient: string
  phone: string
  state?: string
  district?: string
  pincode?: string
  subject: string
  htmlBody: string
  textBody: string
  hasEmail: boolean
}

export interface RawContact {
  index: number
  schoolName: string
  contactName: string
  recipient: string
  phone: string
  address?: string
  district?: string
  state?: string
  pincode?: string
  website?: string
  affiliationNo?: string
  schoolCode?: string
}

export const DEFAULT_POSTAL_ADDRESS = 'SkillFleet EduTech · International Skill Championship, India'
export const DEFAULT_UNSUBSCRIBE_BASE = 'mailto:hello@skillfleet.org?subject=Unsubscribe'

const CONTACTS_FILE_PATH = path.join(process.cwd(), 'src/lib/gmail/contacts-data.json')

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function loadRawContacts(): RawContact[] {
  if (fs.existsSync(CONTACTS_FILE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONTACTS_FILE_PATH, 'utf-8')) as RawContact[]
    } catch {
      return []
    }
  }
  return []
}

/**
 * Returns distinct states with school count for filtering.
 */
export function getAvailableStates(): Array<{ state: string; count: number }> {
  const contacts = loadRawContacts()
  const counts: Record<string, number> = {}

  for (const c of contacts) {
    const st = c.state || 'Other'
    counts[st] = (counts[st] || 0) + 1
  }

  return Object.entries(counts)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Formats a single recipient payload on-demand.
 */
export function formatRecipientPayload(contact: RawContact): CampaignRecipient {
  const { html: rawHtml, text: rawText } = getIscEmailTemplate()
  const safeSchoolName = escapeHtml(contact.schoolName)
  const subject = `${contact.schoolName}, introduce your students to ISC 2026`
  const unsubscribeUrl = `${DEFAULT_UNSUBSCRIBE_BASE}%20${encodeURIComponent(contact.schoolName)}`
  const hasEmail = Boolean(contact.recipient && contact.recipient.includes('@'))
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://skillfleet.org').replace(/\/$/, '')

  const trackingPixel = hasEmail
    ? `<img src="${baseUrl}/api/track/open?email=${encodeURIComponent(contact.recipient)}&school=${encodeURIComponent(contact.schoolName)}&campaign=Introduction to ISC 2026" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`
    : ''

  let htmlBody = rawHtml
    .replaceAll('{{SchoolName}}', safeSchoolName)
    .replaceAll('{{PostalAddress}}', DEFAULT_POSTAL_ADDRESS)
    .replaceAll('{{UnsubscribeURL}}', unsubscribeUrl)

  const encodedSchool = encodeURIComponent(contact.schoolName)
  const encodedEmail = encodeURIComponent(contact.recipient)
  const wrapTrackedClick = (destination: string) =>
    `${baseUrl}/api/track/click?email=${encodedEmail}&school=${encodedSchool}&campaign=Introduction to ISC 2026&url=${encodeURIComponent(destination)}`

  const linksMap: Record<string, string> = {
    'https://skillfleet.org/signup/coordinator': wrapTrackedClick(
      `https://skillfleet.org/signup/coordinator?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_2026&school=${encodedSchool}`
    ),
    'https://skillfleet.org/signup': wrapTrackedClick(
      `https://skillfleet.org/signup?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_2026&school=${encodedSchool}`
    ),
    'https://skillfleet.org/isc-2026': wrapTrackedClick(
      `https://skillfleet.org/isc-2026?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_2026`
    ),
    'https://skillfleet.org/decks/ISC-School-Deck.pdf': wrapTrackedClick(
      'https://skillfleet.org/decks/ISC-School-Deck.pdf'
    ),
    'https://skillfleet.org/decks/ISC-Student-Deck.pdf': wrapTrackedClick(
      'https://skillfleet.org/decks/ISC-Student-Deck.pdf'
    ),
  }

  for (const [original, trackedUrl] of Object.entries(linksMap)) {
    htmlBody = htmlBody.replaceAll(`href="${original}"`, `href="${trackedUrl}"`)
  }

  if (htmlBody.includes('</body>')) {
    htmlBody = htmlBody.replace('</body>', `${trackingPixel}</body>`)
  } else {
    htmlBody += trackingPixel
  }

  const textBody = rawText
    .replaceAll('{{SchoolName}}', contact.schoolName)
    .replaceAll('{{PostalAddress}}', DEFAULT_POSTAL_ADDRESS)
    .replaceAll('{{UnsubscribeURL}}', unsubscribeUrl)

  return {
    index: contact.index,
    schoolName: contact.schoolName,
    contactName: contact.contactName,
    recipient: contact.recipient,
    phone: contact.phone,
    state: contact.state,
    district: contact.district,
    pincode: contact.pincode,
    subject,
    htmlBody,
    textBody,
    hasEmail,
  }
}

/**
 * Loads contacts (capped at 500 for initial memory efficiency) and prepares personalized email payloads.
 */
export function getCampaignRecipients(limit = 500): CampaignRecipient[] {
  const rawList = loadRawContacts()
  const targetList = limit > 0 ? rawList.slice(0, limit) : rawList
  return targetList.map((c) => formatRecipientPayload(c))
}

/**
 * Formats a personalized ISC email payload for arbitrary custom school and email inputs.
 */
export function formatCustomEmailPayload(options: {
  schoolName: string
  recipient: string
  contactName?: string
}): {
  subject: string
  htmlBody: string
  textBody: string
} {
  const { html: rawHtml, text: rawText } = getIscEmailTemplate()
  const safeSchoolName = escapeHtml(options.schoolName.trim() || 'Your School')
  const subject = `${options.schoolName.trim() || 'Your School'}, introduce your students to ISC 2026`
  const unsubscribeUrl = `${DEFAULT_UNSUBSCRIBE_BASE}%20${encodeURIComponent(options.schoolName.trim())}`
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://skillfleet.org').replace(/\/$/, '')

  const trackingPixel = `<img src="${baseUrl}/api/track/open?email=${encodeURIComponent(options.recipient.trim())}&school=${encodeURIComponent(options.schoolName.trim())}&campaign=isc-sandbox" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`

  let htmlBody = rawHtml
    .replaceAll('{{SchoolName}}', safeSchoolName)
    .replaceAll('{{PostalAddress}}', DEFAULT_POSTAL_ADDRESS)
    .replaceAll('{{UnsubscribeURL}}', unsubscribeUrl)

  const encodedSchool = encodeURIComponent(options.schoolName.trim())
  const encodedEmail = encodeURIComponent(options.recipient.trim())
  const wrapTrackedClick = (destination: string) =>
    `${baseUrl}/api/track/click?email=${encodedEmail}&school=${encodedSchool}&campaign=isc-sandbox&url=${encodeURIComponent(destination)}`

  const directLinksMap: Record<string, string> = {
    'https://skillfleet.org/signup/coordinator': wrapTrackedClick(
      `https://skillfleet.org/signup/coordinator?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_sandbox&school=${encodedSchool}`
    ),
    'https://skillfleet.org/signup': wrapTrackedClick(
      `https://skillfleet.org/signup?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_sandbox&school=${encodedSchool}`
    ),
    'https://skillfleet.org/isc-2026': wrapTrackedClick(
      `https://skillfleet.org/isc-2026?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_sandbox`
    ),
    'https://skillfleet.org/decks/ISC-School-Deck.pdf': wrapTrackedClick(
      'https://skillfleet.org/decks/ISC-School-Deck.pdf'
    ),
    'https://skillfleet.org/decks/ISC-Student-Deck.pdf': wrapTrackedClick(
      'https://skillfleet.org/decks/ISC-Student-Deck.pdf'
    ),
  }

  for (const [original, directTracked] of Object.entries(directLinksMap)) {
    htmlBody = htmlBody.replaceAll(`href="${original}"`, `href="${directTracked}"`)
  }

  if (htmlBody.includes('</body>')) {
    htmlBody = htmlBody.replace('</body>', `${trackingPixel}</body>`)
  } else {
    htmlBody += trackingPixel
  }

  const textBody = rawText
    .replaceAll('{{SchoolName}}', options.schoolName.trim())
    .replaceAll('{{PostalAddress}}', DEFAULT_POSTAL_ADDRESS)
    .replaceAll('{{UnsubscribeURL}}', unsubscribeUrl)

  return {
    subject,
    htmlBody,
    textBody,
  }
}

// Backward compatibility helper
export function getTop10CampaignRecipients(): CampaignRecipient[] {
  return getCampaignRecipients(10)
}
