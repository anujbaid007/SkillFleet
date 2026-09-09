import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordTrackingEvent } from '@/lib/tracking/logger'

const ALLOWED_DOMAINS = ['skillfleet.org', 'www.skillfleet.org', 'localhost:3000']

function isAllowedRedirect(target: string): boolean {
  try {
    if (target.startsWith('/') && !target.startsWith('//')) return true
    const parsed = new URL(target)
    return ALLOWED_DOMAINS.includes(parsed.host)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email') || 'unknown'
  const school = searchParams.get('school') || 'unknown'
  const targetUrlParam = searchParams.get('url') || 'https://skillfleet.org/isc-2026'
  const campaign = searchParams.get('campaign') || 'isc-2026'

  const safeTargetUrl = isAllowedRedirect(targetUrlParam)
    ? targetUrlParam
    : 'https://skillfleet.org/isc-2026'

  const userAgent = request.headers.get('user-agent') || undefined
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    undefined

  await recordTrackingEvent({
    type: 'click',
    campaignId: campaign,
    recipientEmail: email,
    schoolName: school,
    targetUrl: safeTargetUrl,
    userAgent,
    ip,
  })

  return NextResponse.redirect(safeTargetUrl)
}

