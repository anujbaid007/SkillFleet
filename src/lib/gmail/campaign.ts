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
export const DEFAULT_CAMPAIGN_NAME = 'Campaign 1: Introduction to ISC 2026'
export const DEFAULT_SUBJECT_TEMPLATE = 'Competition Invite for ISC 2026 | {{SchoolName}}'

export const CAMPAIGN_OPTIONS = [
  'Campaign 1: Introduction to ISC 2026',
  'Campaign 2: Follow-up & Deck Reminder',
  'Campaign 3: Coordinator Nomination Drive',
  'Test Sandbox',
]

const CONTACTS_FILE_PATH = path.join(process.cwd(), 'src/lib/gmail/contacts-data.json')

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

let cachedRawContacts: RawContact[] | null = null

export function loadRawContacts(): RawContact[] {
  if (cachedRawContacts) return cachedRawContacts
  if (fs.existsSync(CONTACTS_FILE_PATH)) {
    try {
      cachedRawContacts = JSON.parse(fs.readFileSync(CONTACTS_FILE_PATH, 'utf-8')) as RawContact[]
      return cachedRawContacts
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
 * Formats a single recipient payload with full HTML on-demand.
 */
export function formatRecipientPayload(
  contact: RawContact,
  campaignName: string = DEFAULT_CAMPAIGN_NAME,
  customSubjectTemplate?: string
): CampaignRecipient {
  const { html: rawHtml, text: rawText } = getIscEmailTemplate()
  const safeSchoolName = escapeHtml(contact.schoolName)
  const subjectTpl = customSubjectTemplate?.trim() || DEFAULT_SUBJECT_TEMPLATE
  
  const subject = subjectTpl
    .replaceAll('{{SchoolName}}', contact.schoolName)
    .replaceAll('{{PrincipalName}}', contact.contactName || '')
    .replaceAll('{{District}}', contact.district || '')
    .replaceAll('{{State}}', contact.state || '')

  const unsubscribeUrl = `${DEFAULT_UNSUBSCRIBE_BASE}%20${encodeURIComponent(contact.schoolName)}`
  const hasEmail = Boolean(contact.recipient && contact.recipient.includes('@'))
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://skillfleet.org').replace(/\/$/, '')

  const trackingPixel = hasEmail
    ? `<img src="${baseUrl}/api/track/open?email=${encodeURIComponent(contact.recipient)}&school=${encodeURIComponent(contact.schoolName)}&campaign=${encodeURIComponent(campaignName)}" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`
    : ''

  let htmlBody = rawHtml
    .replaceAll('{{SchoolName}}', safeSchoolName)
    .replaceAll('{{PostalAddress}}', DEFAULT_POSTAL_ADDRESS)
    .replaceAll('{{UnsubscribeURL}}', unsubscribeUrl)

  const encodedSchool = encodeURIComponent(contact.schoolName)
  const encodedEmail = encodeURIComponent(contact.recipient)
  const wrapTrackedClick = (destination: string) =>
    `${baseUrl}/api/track/click?email=${encodedEmail}&school=${encodedSchool}&campaign=${encodeURIComponent(campaignName)}&url=${encodeURIComponent(destination)}`

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
 * Loads contacts efficiently without inflating heavy HTML in memory (blazing fast & minimal RAM).
 */
export function getCampaignRecipients(limit = 0, subjectTemplate?: string): CampaignRecipient[] {
  const rawList = loadRawContacts()
  const targetList = limit > 0 ? rawList.slice(0, limit) : rawList
  const subjectTpl = subjectTemplate?.trim() || DEFAULT_SUBJECT_TEMPLATE

  return targetList.map((contact) => ({
    index: contact.index,
    schoolName: contact.schoolName,
    contactName: contact.contactName,
    recipient: contact.recipient,
    phone: contact.phone,
    state: contact.state,
    district: contact.district,
    pincode: contact.pincode,
    subject: subjectTpl
      .replaceAll('{{SchoolName}}', contact.schoolName)
      .replaceAll('{{PrincipalName}}', contact.contactName || '')
      .replaceAll('{{District}}', contact.district || '')
      .replaceAll('{{State}}', contact.state || ''),
    htmlBody: '', // Computed on-demand via formatRecipientPayload
    textBody: '',
    hasEmail: Boolean(contact.recipient && contact.recipient.includes('@')),
  }))
}

/**
 * Formats a personalized ISC email payload for arbitrary custom school and email inputs.
 */
export function formatCustomEmailPayload(options: {
  schoolName: string
  recipient: string
  contactName?: string
  subjectTemplate?: string
}): {
  subject: string
  htmlBody: string
  textBody: string
} {
  const { html: rawHtml, text: rawText } = getIscEmailTemplate()
  const safeSchoolName = escapeHtml(options.schoolName.trim() || 'Your School')
  const subjectTpl = options.subjectTemplate?.trim() || DEFAULT_SUBJECT_TEMPLATE
  const subject = subjectTpl
    .replaceAll('{{SchoolName}}', options.schoolName.trim() || 'Your School')
    .replaceAll('{{PrincipalName}}', options.contactName || '')
    
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
