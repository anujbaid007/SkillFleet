import fs from 'node:fs'
import path from 'node:path'
import { refreshAccessToken, type GmailTokenResponse } from './client'

const TOKENS_FILE = path.join(process.cwd(), '.kilo', 'gmail-tokens.json')

export interface StoredGmailTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
  scope?: string
  updated_at: string
}

/**
 * Saves Gmail tokens to local disk storage for system/background use.
 */
export function saveGmailTokens(tokens: GmailTokenResponse): void {
  try {
    const dir = path.dirname(TOKENS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    let existing: Partial<StoredGmailTokens> = {}
    if (fs.existsSync(TOKENS_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'))
      } catch {
        // Ignore JSON parse errors
      }
    }

    const payload: StoredGmailTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || existing.refresh_token,
      expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000,
      scope: tokens.scope || existing.scope,
      updated_at: new Date().toISOString(),
    }

    fs.writeFileSync(TOKENS_FILE, JSON.stringify(payload, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save Gmail tokens:', err)
  }
}

/**
 * Gets a valid access token, automatically refreshing if expired and a refresh token is available.
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    if (!fs.existsSync(TOKENS_FILE)) return null

    const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8')) as StoredGmailTokens
    if (!data) return null

    // If token is still valid with 2 minutes buffer
    if (data.access_token && data.expiry_date && data.expiry_date > Date.now() + 120_000) {
      return data.access_token
    }

    // Refresh token if available
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (data.refresh_token && clientId && clientSecret) {
      try {
        const refreshed = await refreshAccessToken({
          refreshToken: data.refresh_token,
          clientId,
          clientSecret,
        })
        saveGmailTokens(refreshed)
        return refreshed.access_token
      } catch (err) {
        console.error('Failed to auto-refresh stored Gmail token:', err)
        return null
      }
    }

    // Token is expired and could not be refreshed
    return null
  } catch {
    return null
  }
}
