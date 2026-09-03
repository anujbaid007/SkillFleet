import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database'
import { isStudentDetailsComplete } from '@/lib/profile/details'
import { LANDING_AFTER_LOGIN } from '@/lib/launch'

/**
 * Where a signed-in user belongs, given how complete their profile is.
 *
 * Only ever the steps that are genuinely required. The starter assessment is
 * not one of them — the dashboard already carries a card for it.
 *
 * Google hands back a name, an email and a picture — nothing else. So a
 * student who arrives this way has no date of birth and no parent on record,
 * and a coordinator has no phone number, even though both are asked for on the
 * email forms. Routing them to the step that collects what is missing is what
 * keeps the two signup paths equivalent.
 */
function destinationFor(profile: {
  role: string | null
  terms_agreed_at: string | null
  onboarding_completed: boolean | null
  date_of_birth: string | null
  family_id: string | null
  phone: string | null
  school_class: string | null
  school_name: string | null
  school_state: string | null
  school_district: string | null
  city: string | null
}): string {
  if (profile.role === 'admin') return '/admin'
  if (profile.role === 'vendor') return '/vendor'

  // Nobody gets past this without having agreed, whichever way they signed up.
  if (!profile.terms_agreed_at) return '/onboarding/consent'

  if (profile.role === 'coordinator') {
    return profile.phone ? '/coordinator' : '/onboarding/coordinator'
  }

  // Students: details first, then the questionnaire.
  const missingSignupFields = !profile.date_of_birth || !profile.family_id
  if (missingSignupFields || !isStudentDetailsComplete(profile)) return '/onboarding/details'
  // The starter assessment is offered on the dashboard rather than forced here.
  return LANDING_AFTER_LOGIN
}

/** A relative path on this origin and nothing else. */
function isSafeNext(next: string): boolean {
  return (
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.startsWith('/\\') &&
    !next.includes('@') &&
    !next.includes(':')
  )
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const intent = searchParams.get('intent')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  // An explicit `next` is a deliberate instruction — the password-recovery
  // mail sets it — so it wins over any profile-shape routing below. Only ever
  // an in-app path: `next=@evil.com` would otherwise become
  // https://skillfleet.org@evil.com, which a browser reads as host evil.com.
  if (next && isSafeNext(next)) return NextResponse.redirect(`${origin}${next}`)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)

  const columns =
    'role, onboarding_completed, terms_agreed_at, date_of_birth, family_id, phone, school_class, school_name, school_state, school_district, city'

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(columns)
    .eq('id', user.id)
    .single()

  // The trigger creates a row for every new auth user, so an absent profile
  // means something is genuinely wrong rather than merely incomplete.
  if (!profile) return NextResponse.redirect(`${origin}/login?error=profile_missing`)

  /*
    The role fix.

    handle_new_user() branches on `signup_type` in the signUp metadata. An
    OAuth sign-in carries none, so it always falls through to the student
    branch — which would quietly make every coordinator arriving via Google a
    student. `intent` says which button they pressed.

    Only an untouched student stub is ever converted: no date of birth, no
    family, no school. That is the shape the trigger leaves behind and nothing
    else, so a real student part-way through onboarding cannot be flipped, and
    an established account cannot be changed at all. The write goes through the
    service-role client because a user may not set their own role.
  */
  let effective = profile
  const isFreshStub =
    profile.role === 'student' &&
    !profile.date_of_birth &&
    !profile.family_id &&
    !profile.school_name &&
    !profile.onboarding_completed

  if (intent === 'coordinator' && isFreshStub) {
    const { error: promoteError } = await adminClient
      .from('user_profiles')
      // onboarding_completed marks the student questionnaire as not applicable,
      // matching what the trigger does for an email coordinator signup.
      .update({ role: 'coordinator', onboarding_completed: true })
      .eq('id', user.id)

    if (!promoteError) {
      effective = { ...profile, role: 'coordinator', onboarding_completed: true }
    }
  }

  return NextResponse.redirect(`${origin}${destinationFor(effective)}`)
}
