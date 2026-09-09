'use server'

import { cookies } from 'next/headers'
import { sendGmailEmail, refreshAccessToken, type EmailOptions } from '@/lib/gmail/client'
import { getValidAccessToken, saveGmailTokens } from '@/lib/gmail/storage'
import { requireAdmin } from '@/lib/admin/guard'

export interface SendEmailActionState {
  success?: boolean
  messageId?: string
  error?: string
}

/**
 * Checks if the current session has Gmail authorization tokens saved in cookies or storage.
 */
export async function getGmailConnectionStatus(): Promise<{
  connected: boolean
  hasRefreshToken: boolean
}> {
  if (process.env.NODE_ENV === 'production') {
    await requireAdmin()
  }
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('gmail_access_token')?.value
  const refreshToken = cookieStore.get('gmail_refresh_token')?.value
  const storageToken = await getValidAccessToken()

  return {
    connected: Boolean(accessToken || refreshToken || storageToken),
    hasRefreshToken: Boolean(refreshToken || storageToken),
  }
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
 * Server action to send an email using the connected Gmail account.
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

  if (!to || !subject || !body) {
    return { error: 'Recipient, subject, and message body are required.' }
  }

  const cookieStore = await cookies()
  let accessToken = cookieStore.get('gmail_access_token')?.value

  if (!accessToken) {
    const refreshToken = cookieStore.get('gmail_refresh_token')?.value
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (refreshToken && clientId && clientSecret) {
      try {
        const refreshed = await refreshAccessToken({
          refreshToken,
          clientId,
          clientSecret,
        })
        accessToken = refreshed.access_token
        saveGmailTokens(refreshed)
      } catch (err: unknown) {
        // Fallback to storage token
      }
    }
  }

  if (!accessToken) {
    accessToken = (await getValidAccessToken()) || undefined
  }

  if (!accessToken) {
    return {
      error: 'Gmail account is not connected. Please authorize via /api/gmail/auth first.',
    }
  }

  const emailOptions: EmailOptions = {
    to,
    subject,
    text: isHtml ? undefined : body,
    html: isHtml ? body : undefined,
  }

  try {
    const result = await sendGmailEmail({
      accessToken,
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
