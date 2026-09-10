import fs from 'node:fs'
import path from 'node:path'
import { refreshAccessToken, type GmailTokenResponse } from './client'
import { adminClient } from '@/lib/supabase/admin'

const TOKENS_FILE = path.join(process.cwd(), '.kilo', 'gmail-tokens.json')
const ACCOUNTS_FILE = path.join(process.cwd(), '.kilo', 'gmail-accounts.json')
const BUCKET_NAME = 'campaign-logs'
const ACCOUNTS_BLOB_PATH = 'gmail-accounts.json'

export interface StoredSenderAccount {
  email: string
  name?: string
  access_token: string
  refresh_token?: string
  expiry_date?: number
  scope?: string
  updated_at: string
}

export type StoredGmailTokens = StoredSenderAccount

/**
 * Loads all connected sender accounts from Supabase storage and local disk.
 */
export async function loadSenderAccounts(): Promise<StoredSenderAccount[]> {
  try {
    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .download(ACCOUNTS_BLOB_PATH)

    if (!error && data) {
      const text = await data.text()
      const list = JSON.parse(text) as StoredSenderAccount[]
      if (Array.isArray(list) && list.length > 0) {
        return list
      }
    }
  } catch {
    // Fall back to local file
  }

  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const list = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8')) as StoredSenderAccount[]
      if (Array.isArray(list) && list.length > 0) return list
    }
  } catch {
    // Ignore local parse error
  }

  // Fallback: check legacy single-account file
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const single = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8')) as StoredSenderAccount
      if (single && single.access_token) {
        const defaultEmail = single.email || 'primary@skillfleet.org'
        return [{ ...single, email: defaultEmail }]
      }
    }
  } catch {
    // Ignore legacy error
  }

  return []
}

/**
 * Saves or updates a connected sender account in storage.
 */
export async function saveSenderAccount(account: StoredSenderAccount): Promise<void> {
  const normalizedEmail = account.email.trim().toLowerCase()
  const payload: StoredSenderAccount = {
    ...account,
    email: normalizedEmail,
    updated_at: new Date().toISOString(),
  }

  // 1. Update local files
  try {
    const dir = path.dirname(ACCOUNTS_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    let localList: StoredSenderAccount[] = []
    if (fs.existsSync(ACCOUNTS_FILE)) {
      try {
        localList = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'))
      } catch {
        localList = []
      }
    }

    localList = localList.filter((a) => a.email.toLowerCase() !== normalizedEmail)
    localList.push(payload)
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(localList, null, 2), 'utf-8')
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(payload, null, 2), 'utf-8')
  } catch {
    // Ignore local file error
  }

  // 2. Sync to Supabase Storage
  try {
    let remoteList = await loadSenderAccounts()
    remoteList = remoteList.filter((a) => a.email.toLowerCase() !== normalizedEmail)
    remoteList.push(payload)
    const buffer = Buffer.from(JSON.stringify(remoteList, null, 2), 'utf-8')
    await adminClient.storage
      .from(BUCKET_NAME)
      .upload(ACCOUNTS_BLOB_PATH, buffer, {
        upsert: true,
        contentType: 'application/json',
      })
  } catch (err) {
    console.error('Failed to sync sender account to Supabase storage:', err)
  }
}

/**
 * Backward-compatible helper for single token save.
 */
export function saveGmailTokens(tokens: GmailTokenResponse, email = 'primary@skillfleet.org'): void {
  saveSenderAccount({
    email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000,
    scope: tokens.scope,
    updated_at: new Date().toISOString(),
  }).catch(console.error)
}

/**
 * Gets a valid access token for a specific sender account, or falls back to the default account.
 */
export async function getValidAccessToken(
  targetEmail?: string
): Promise<{ accessToken: string; senderEmail: string } | null> {
  const accounts = await loadSenderAccounts()
  if (!accounts || accounts.length === 0) return null

  let account = targetEmail
    ? accounts.find((a) => a.email.toLowerCase() === targetEmail.trim().toLowerCase())
    : accounts[0]

  if (!account) {
    account = accounts[0]
  }

  // Check if token is still valid (with 2 minutes buffer)
  if (account.access_token && account.expiry_date && account.expiry_date > Date.now() + 120_000) {
    return { accessToken: account.access_token, senderEmail: account.email }
  }

  // Refresh token if available
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (account.refresh_token && clientId && clientSecret) {
    try {
      const refreshed = await refreshAccessToken({
        refreshToken: account.refresh_token,
        clientId,
        clientSecret,
      })

      const updatedAccount: StoredSenderAccount = {
        ...account,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || account.refresh_token,
        expiry_date: Date.now() + (refreshed.expires_in || 3600) * 1000,
        scope: refreshed.scope || account.scope,
        updated_at: new Date().toISOString(),
      }

      await saveSenderAccount(updatedAccount)
      return { accessToken: refreshed.access_token, senderEmail: account.email }
    } catch (err) {
      console.error(`Failed to auto-refresh Gmail token for ${account.email}:`, err)
      return null
    }
  }

  return null
}

/**
 * Removes a connected sender account.
 */
export async function removeSenderAccount(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  try {
    let list = await loadSenderAccounts()
    list = list.filter((a) => a.email.toLowerCase() !== normalizedEmail)
    const buffer = Buffer.from(JSON.stringify(list, null, 2), 'utf-8')
    await adminClient.storage
      .from(BUCKET_NAME)
      .upload(ACCOUNTS_BLOB_PATH, buffer, {
        upsert: true,
        contentType: 'application/json',
      })

    if (fs.existsSync(ACCOUNTS_FILE)) {
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(list, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('Failed to remove sender account:', err)
  }
}
