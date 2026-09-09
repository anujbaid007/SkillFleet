import fs from 'node:fs'
import path from 'node:path'
import { getIscEmailTemplate } from './templates/isc-email'

export interface CampaignRecipient {
  index: number
  schoolName: string
  contactName: string
  recipient: string
  phone: string
  subject: string
  htmlBody: string
  textBody: string
  hasEmail: boolean
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

interface RawContact {
  index: number
  schoolName: string
  contactName: string
  recipient: string
  phone: string
}

/**
 * Loads contacts and prepares personalized email payloads with tracking.
 */
export function getCampaignRecipients(): CampaignRecipient[] {
  const { html: rawHtml, text: rawText } = getIscEmailTemplate()

  let contacts: RawContact[] = []
  if (fs.existsSync(CONTACTS_FILE_PATH)) {
    try {
      contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE_PATH, 'utf-8'))
    } catch {
      contacts = []
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://skillfleet.org').replace(/\/$/, '')

  return contacts.map((contact) => {
    const safeSchoolName = escapeHtml(contact.schoolName)
    const subject = `${contact.schoolName}, introduce your students to ISC 2026`
    const unsubscribeUrl = `${DEFAULT_UNSUBSCRIBE_BASE}%20${encodeURIComponent(contact.schoolName)}`
    const hasEmail = Boolean(contact.recipient && contact.recipient.includes('@'))

    const trackingPixel = hasEmail
      ? `<img src="${baseUrl}/api/track/open?email=${encodeURIComponent(contact.recipient)}&school=${encodeURIComponent(contact.schoolName)}&campaign=isc-2026" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`
      : ''

    let htmlBody = rawHtml
      .replaceAll('{{SchoolName}}', safeSchoolName)
      .replaceAll('{{PostalAddress}}', DEFAULT_POSTAL_ADDRESS)
      .replaceAll('{{UnsubscribeURL}}', unsubscribeUrl)

    // Replace action links with direct live URLs + UTM tracking
    const encodedSchool = encodeURIComponent(contact.schoolName)
    const directLinksMap: Record<string, string> = {
      'https://skillfleet.org/signup/coordinator': `https://skillfleet.org/signup/coordinator?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_2026&school=${encodedSchool}`,
      'https://skillfleet.org/signup': `https://skillfleet.org/signup?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_2026&school=${encodedSchool}`,
      'https://skillfleet.org/isc-2026': `https://skillfleet.org/isc-2026?utm_source=school_emailer&utm_medium=email&utm_campaign=isc_2026`,
      'https://skillfleet.org/decks/ISC-School-Deck.pdf': 'https://skillfleet.org/decks/ISC-School-Deck.pdf',
      'https://skillfleet.org/decks/ISC-Student-Deck.pdf': 'https://skillfleet.org/decks/ISC-Student-Deck.pdf',
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
      .replaceAll('{{SchoolName}}', contact.schoolName)
      .replaceAll('{{PostalAddress}}', DEFAULT_POSTAL_ADDRESS)
      .replaceAll('{{UnsubscribeURL}}', unsubscribeUrl)

    return {
      index: contact.index,
      schoolName: contact.schoolName,
      contactName: contact.contactName,
      recipient: contact.recipient,
      phone: contact.phone,
      subject,
      htmlBody,
      textBody,
      hasEmail,
    }
  })
}

// Backward compatibility helper
export function getTop10CampaignRecipients(): CampaignRecipient[] {
  return getCampaignRecipients()
}
