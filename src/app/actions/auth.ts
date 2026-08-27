'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validatePassword } from '@/lib/validation/password'
import { validateDob } from '@/lib/validation/dob'
import { validateMobile } from '@/lib/validation/mobile'
import { isStudentDetailsComplete } from '@/lib/profile/details'
import { clearFamilySessions } from '@/lib/auth/family-sessions'
import { isExistingEmailSignup } from '@/lib/auth/signup'

export type AuthFormState =
  | {
      error?: string
      success?: string
    }
  | undefined

// Where Supabase sends the email-confirmation link. It lands on our callback,
// which exchanges the code for a session and forwards to `next`.
function buildAuthRedirect(next: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`
}

function confirmEmailMessage(email: string) {
  return `We've sent a confirmation link to ${email}. Click it to finish creating your account, then sign in.`
}

// -------------------------------------------------------
// LOGIN
// -------------------------------------------------------

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('not confirmed')) {
      return { error: 'Please confirm your email first — check your inbox for the link we sent.' }
    }
    return { error: error.message }
  }

  // Redirect based on role
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(
        'role, onboarding_completed, school_class, school_name, school_state, school_district, city, parent_mobile'
      )
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') redirect('/admin')
    if (profile?.role === 'student') {
      if (!isStudentDetailsComplete(profile)) redirect('/onboarding/details')
      if (!profile.onboarding_completed) redirect('/onboarding')
    }
  }

  redirect('/dashboard')
}

// -------------------------------------------------------
// SIGNUP  (one account per student, with parent details)
// -------------------------------------------------------

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string)?.trim()
  const dob = formData.get('date_of_birth') as string // YYYY-MM-DD

  const parentFullName = (formData.get('parent_full_name') as string)?.trim()
  const parentEmail = (formData.get('parent_email') as string)?.trim().toLowerCase()
  const parentPhone = (formData.get('parent_phone') as string)?.trim()

  if (!email || !password || !fullName || !dob) {
    return { error: 'Student name, date of birth, email and password are all required.' }
  }
  if (!parentFullName || !parentEmail) {
    return { error: "Parent's name and email are required." }
  }
  if (parentEmail === email) {
    return { error: "The parent's email must be different from the student's sign-in email." }
  }

  // Asked once here, then reused for the whole family.
  const mobileError = validateMobile(parentPhone ?? '')
  if (mobileError) return { error: mobileError }

  const dobError = validateDob(dob)
  if (dobError) return { error: dobError }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const supabase = await createClient()
  const next = '/onboarding/details'

  // The DB trigger reads this metadata: it creates the student profile and
  // either starts a new family or joins an existing one (pending approval).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        date_of_birth: dob,
        parent_full_name: parentFullName,
        parent_email: parentEmail,
        parent_phone: parentPhone,
      },
      emailRedirectTo: buildAuthRedirect(next),
    },
  })

  if (error) return { error: error.message }

  // Must come before the no-session branch below: an already-registered email
  // also returns without a session, and would otherwise be told to go and
  // check an inbox for a mail that is never sent.
  if (isExistingEmailSignup(data)) {
    return { error: 'An account with this email already exists. Please sign in instead.' }
  }

  // With email confirmation enabled there is no session until the link is clicked.
  if (!data.session) return { success: confirmEmailMessage(email) }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

  redirect(next)
}

// -------------------------------------------------------
// LOGOUT
// -------------------------------------------------------

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Also drop any linked family sessions held on this device, so signing out
  // really does end access for everyone — not just the active account.
  await clearFamilySessions()
  redirect('/login')
}
