import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { JOIN_COOKIE, JOIN_COOKIE_MAX_AGE } from '@/lib/coordinator/join-link'

/** /join/<uuid> — a coordinator's prefilled signup link. */
const JOIN_PATH = /^\/join\/([0-9a-fA-F-]{36})\/?$/

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/catalog',
  '/booking',
  '/parent',
  '/family',
  '/admin',
  '/vendor',
  '/requests',
  '/calendar',
  '/switch',
  '/cart',
  '/wallet',
  '/checkout',
  '/bookings',
  '/profile',
  '/account',
]

// Auth pages — redirect to /dashboard if already logged in
const AUTH_PATHS = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must call getUser() not getSession() for security
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Authenticated users visiting auth pages → send to dashboard.
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  /*
    Remember which school a share link belongs to.

    This has to happen here rather than in the /join page itself: Next only
    allows cookies to be written from a Server Action, a Route Handler or
    middleware, never during a Server Component render. /onboarding/details
    reads it back to preselect the school, and clears it once used.
  */
  const join = pathname.match(JOIN_PATH)
  if (join) {
    supabaseResponse.cookies.set(JOIN_COOKIE, join[1], {
      maxAge: JOIN_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  // Unauthenticated users visiting protected routes → send to login
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname) // preserve intended destination
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except static files, images, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
