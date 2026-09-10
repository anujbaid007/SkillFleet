/**
 * Gmail REST API Client
 *
 * Implements OAuth2 authorization and message sending via Gmail's REST API.
 * Uses standard fetch for zero-dependency portability across Node.js, Edge, and Cloudflare workers.
 */

export interface GmailTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  from?: string
  fromName?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
}

export interface GmailSendResponse {
  id: string
  threadId: string
  labelIds?: string[]
}

const GMAIL_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
]

function formatSenderHeader(from?: string, fromName?: string): string {
  if (!from) return '"SkillFleet" <contact@skillfleet.org>'
  if (from.includes('<') && from.includes('>')) return from

  const name =
    fromName ||
    (from.toLowerCase().includes('isc@')
      ? 'International Skill Championship'
      : 'SkillFleet')

  const safeName = name.replace(/["\\]/g, '').trim()
  return `"${safeName}" <${from.trim()}>`
}

/**
 * Returns the Google OAuth 2.0 authorization URL for connecting a user's Gmail account.
 */
export function getGoogleOAuthUrl(options: {
  clientId: string
  redirectUri: string
  state?: string
  scopes?: string[]
}): string {
  const scopes = options.scopes ?? GMAIL_SCOPES
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })

  if (options.state) {
    params.set('state', options.state)
  }

  return `${GMAIL_AUTH_BASE}?${params.toString()}`
}

/**
 * Exchanges the OAuth2 authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<GmailTokenResponse> {
  const response = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${response.status} ${errText}`)
  }

  return (await response.json()) as GmailTokenResponse
}

/**
 * Refreshes an expired access token using a stored refresh token.
 */
export async function refreshAccessToken(params: {
  refreshToken: string
  clientId: string
  clientSecret: string
}): Promise<GmailTokenResponse> {
  const response = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to refresh access token: ${response.status} ${errText}`)
  }

  return (await response.json()) as GmailTokenResponse
}

/**
 * Converts a string to base64url format (RFC 4648 § 5) required by Gmail API.
 */
export function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Builds an RFC 2822 compliant MIME email message and returns it base64url encoded.
 */
export function buildMimeMessage(options: EmailOptions): string {
  const toList = Array.isArray(options.to) ? options.to.join(', ') : options.to
  const senderHeader = formatSenderHeader(options.from, options.fromName)

  const headers: string[] = [
    `To: ${toList}`,
    `From: ${senderHeader}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=`,
    'MIME-Version: 1.0',
  ]

  if (options.replyTo) {
    headers.push(`Reply-To: ${options.replyTo}`)
  }
  if (options.cc) {
    const ccList = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc
    headers.push(`Cc: ${ccList}`)
  }
  if (options.bcc) {
    const bccList = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc
    headers.push(`Bcc: ${bccList}`)
  }

  let body = ''

  if (options.html && options.text) {
    const boundary = `__boundary_${Date.now()}__`
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)

    body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      options.text,
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      options.html,
      `--${boundary}--`,
    ].join('\r\n')
  } else if (options.html) {
    headers.push('Content-Type: text/html; charset=UTF-8')
    headers.push('Content-Transfer-Encoding: 8bit')
    body = options.html
  } else {
    headers.push('Content-Type: text/plain; charset=UTF-8')
    headers.push('Content-Transfer-Encoding: 8bit')
    body = options.text || ''
  }

  const email = `${headers.join('\r\n')}\r\n\r\n${body}`
  return base64UrlEncode(email)
}

export interface GmailProfileResponse {
  emailAddress: string
  messagesTotal?: number
  threadsTotal?: number
  historyId?: string
}

/**
 * Fetches the user profile / email address for the authenticated Google account.
 */
export async function getGmailProfile(accessToken: string): Promise<GmailProfileResponse> {
  // 1. Try standard Google UserInfo endpoint (matches userinfo.email scope)
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (userInfoRes.ok) {
      const data = await userInfoRes.json()
      if (data?.email) {
        return { emailAddress: data.email }
      }
    }
  } catch {
    // Fallback to Gmail API profile
  }

  // 2. Fallback: Gmail Profile endpoint
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to fetch Google profile: ${response.status} ${errText}`)
  }

  return (await response.json()) as GmailProfileResponse
}

/**
 * Sends an email using the Gmail REST API with an access token.
 */
export async function sendGmailEmail(params: {
  accessToken: string
  email: EmailOptions
}): Promise<GmailSendResponse> {
  const raw = buildMimeMessage(params.email)

  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gmail API send failed: ${response.status} ${errText}`)
  }

  return (await response.json()) as GmailSendResponse
}
