import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { sendGmailEmail, refreshAccessToken, type EmailOptions } from '@/lib/gmail/client'
import { getValidAccessToken, saveGmailTokens } from '@/lib/gmail/storage'
import { getCurrentUser, getCurrentProfile } from '@/lib/supabase/session'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const profile = await getCurrentProfile()

    if (!user || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin privileges required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { to, subject, text, html, cc, bcc, replyTo, accessToken: providedToken } = body

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Fields "to" and "subject" are required.' },
        { status: 400 }
      )
    }

    let accessToken = providedToken

    if (!accessToken) {
      const cookieStore = await cookies()
      accessToken = cookieStore.get('gmail_access_token')?.value

      // If access token is absent or expired, try to refresh from cookies
      if (!accessToken) {
        const refreshToken = cookieStore.get('gmail_refresh_token')?.value
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET

        if (refreshToken && clientId && clientSecret) {
          const refreshed = await refreshAccessToken({
            refreshToken,
            clientId,
            clientSecret,
          })
          accessToken = refreshed.access_token
          saveGmailTokens(refreshed)
        }
      }

      // Fallback to server-persisted storage token
      if (!accessToken) {
        accessToken = (await getValidAccessToken()) || undefined
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No active Gmail authorization found. Please connect your Gmail account first.' },
        { status: 401 }
      )
    }

    const emailOptions: EmailOptions = {
      to,
      subject,
      text,
      html,
      cc,
      bcc,
      replyTo,
    }

    const result = await sendGmailEmail({
      accessToken,
      email: emailOptions,
    })

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
