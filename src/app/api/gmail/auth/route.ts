import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGoogleOAuthUrl } from '@/lib/gmail/client'

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID environment variable is not configured.' },
      { status: 500 }
    )
  }

  const { searchParams, origin } = new URL(request.url)
  const returnTo = searchParams.get('returnTo') || '/'

  const base = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '')
  const redirectUri = `${base}/api/gmail/callback`

  const state = encodeURIComponent(JSON.stringify({ returnTo }))
  const authUrl = getGoogleOAuthUrl({
    clientId,
    redirectUri,
    state,
  })

  return NextResponse.redirect(authUrl)
}
