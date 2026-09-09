import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/gmail/client'
import { saveGmailTokens } from '@/lib/gmail/storage'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateRaw = searchParams.get('state')

  let returnTo = '/'
  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw))
      if (parsed.returnTo && parsed.returnTo.startsWith('/')) {
        returnTo = parsed.returnTo
      }
    } catch {
      // Ignore invalid state JSON
    }
  }

  if (error) {
    return NextResponse.redirect(`${origin}${returnTo}?gmail_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${returnTo}?gmail_error=missing_code`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.' },
      { status: 500 }
    )
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '')
  const redirectUri = `${base}/api/gmail/callback`

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri,
    })

    // Persist to server token store
    saveGmailTokens(tokens)

    const response = NextResponse.redirect(`${origin}${returnTo}?gmail_connected=true`)

    // Set secure HTTP-only cookies for tokens if needed for the current session
    response.cookies.set('gmail_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    })

    if (tokens.refresh_token) {
      response.cookies.set('gmail_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      })
    }

    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown token exchange error'
    return NextResponse.redirect(
      `${origin}${returnTo}?gmail_error=${encodeURIComponent(message)}`
    )
  }
}
