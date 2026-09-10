'use server'

import { cookies } from 'next/headers'
import { sendGmailEmail, refreshAccessToken, type EmailOptions } from '@/lib/gmail/client'
import {
  getValidAccessToken,
  saveSenderAccount,
  loadSenderAccounts,
  removeSenderAccount,
  type StoredSenderAccount,
} from '@/lib/gmail/storage'
import { requireAdmin } from '@/lib/admin/guard'

export interface SendEmailActionState {
  success?: boolean
  messageId?: string
  error?: string
}

/**
 * Checks if any Gmail accounts are connected.
 */
export async function getGmailConnectionStatus(): Promise<{
  connected: boolean
  hasRefreshToken: boolean
  accounts: Array<{ email: string; updatedAt: string }>
}> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const accounts = await loadSenderAccounts()
  const hasAccounts = accounts.length > 0
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('gmail_access_token')?.value
  const refreshToken = cookieStore.get('gmail_refresh_token')?.value

  return {
    connected: Boolean(hasAccounts || accessToken || refreshToken),
    hasRefreshToken: Boolean(hasAccounts || refreshToken),
    accounts: accounts.map((a) => ({
      email: a.email,
      updatedAt: a.updated_at,
    })),
  }
}

/**
 * Returns the list of all connected sender email accounts.
 */
export async function getConnectedSenderAccountsAction(): Promise<
  Array<{ email: string; updatedAt: string }>
> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const accounts = await loadSenderAccounts()
  return accounts.map((a) => ({
    email: a.email,
    updatedAt: a.updated_at,
  }))
}

/**
 * Removes a connected sender account.
 */
export async function removeSenderAccountAction(email: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  await removeSenderAccount(email)
  const cookieStore = await cookies()
  cookieStore.delete('gmail_access_token')
  cookieStore.delete('gmail_refresh_token')
}

/**
 * Disconnects Gmail tokens from cookies.
 */
export async function disconnectGmailAction(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const cookieStore = await cookies()
  cookieStore.delete('gmail_access_token')
  cookieStore.delete('gmail_refresh_token')
}

/**
 * Server action to send an email using a connected Gmail account.
 */
export async function sendGmailAction(
  _prevState: SendEmailActionState | undefined,
  formData: FormData
): Promise<SendEmailActionState> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const to = (formData.get('to') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()
  const isHtml = formData.get('is_html') === 'true'
  const senderEmail = (formData.get('sender_email') as string)?.trim()

  if (!to || !subject || !body) {
    return { error: 'Recipient, subject, and message body are required.' }
  }

  const tokenData = await getValidAccessToken(senderEmail || undefined)

  if (!tokenData) {
    return {
      error: 'No active Gmail sender account connected. Please authorize via Connect Gmail first.',
    }
  }

  const emailOptions: EmailOptions = {
    to,
    from: senderEmail || tokenData.senderEmail,
    subject,
    text: isHtml ? undefined : body,
    html: isHtml ? body : undefined,
  }

  try {
    const result = await sendGmailEmail({
      accessToken: tokenData.accessToken,
      email: emailOptions,
    })

    return {
      success: true,
      messageId: result.id,
    }
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : 'An error occurred while sending email.',
    }
  }
}
