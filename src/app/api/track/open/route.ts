import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordTrackingEvent } from '@/lib/tracking/logger'

// 1x1 transparent GIF binary in base64 (43 bytes)
const TRANSPARENT_GIF_BASE64 =
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const GIF_BUFFER = Uint8Array.from(atob(TRANSPARENT_GIF_BASE64), (c) => c.charCodeAt(0))

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email') || 'unknown'
  const school = searchParams.get('school') || 'unknown'
  const campaign = searchParams.get('campaign') || 'isc-2026'

  const userAgent = request.headers.get('user-agent') || undefined
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    undefined

  recordTrackingEvent({
    type: 'open',
    campaignId: campaign,
    recipientEmail: email,
    schoolName: school,
    userAgent,
    ip,
  })

  return new NextResponse(GIF_BUFFER, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': GIF_BUFFER.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
