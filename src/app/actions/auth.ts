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
      /**
       * What the user had typed, echoed back so the form can re-fill itself.
       *
       * React 19 resets a form once its action resolves, which wiped every
       * field the moment validation failed — a rejected password took the
       * name, email and number down with it. The pages read these back as
       * `defaultValue`, so a reset restores the submission instead of
       * clearing it. Passwords are deliberately never echoed.
       */
      values?: Record<string, string>
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

  const values = { email: email ?? '' }

  if (!email || !password) {
    return { error: 'Email and password are required.', values }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('not confirmed')) {
      return {
        error: 'Please confirm your email first — check your inbox for the code we sent.',
        values,
      }
    }
    return { error: error.message, values }
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

  const values = {
    full_name: fullName ?? '',
    email: email ?? '',
    date_of_birth: dob ?? '',
    parent_full_name: parentFullName ?? '',
    parent_email: parentEmail ?? '',
    parent_phone: parentPhone ?? '',
  }

  if (!email || !password || !fullName || !dob) {
    return {
      error: 'Student name, date of birth, email and password are all required.',
      values,
    }
  }
  if (!parentFullName || !parentEmail) {
    return { error: "Parent's name and email are required.", values }
  }
  if (parentEmail === email) {
    return {
      error: "The parent's email must be different from the student's sign-in email.",
      values,
    }
  }

  // Asked once here, then reused for the whole family.
  const mobileError = validateMobile(parentPhone ?? '', 'WhatsApp number')
  if (mobileError) return { error: mobileError, values }

  const dobError = validateDob(dob)
  if (dobError) return { error: dobError, values }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError, values }

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

  if (error) return { error: error.message, values }

  // Must come before the no-session branch below: an already-registered email
  // also returns without a session, and would otherwise be told to go and
  // check an inbox for a mail that is never sent.
  if (isExistingEmailSignup(data)) {
    return {
      error: 'An account with this email already exists. Please sign in instead.',
      values,
    }
  }

  // With email confirmation enabled there is no session until the link is clicked.
  if (!data.session) return { success: confirmEmailMessage(email) }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message, values }

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

// -------------------------------------------------------
// PASSWORD RESET
// -------------------------------------------------------

/**
 * Step 1: ask Supabase to email a recovery link.
 *
 * The reply is deliberately the same whether or not the address has an
 * account. Saying "no account with that email" would turn this form into a
 * way to test which of a school's addresses are registered.
 */
export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const values = { email: email ?? '' }

  if (!email) return { error: 'Enter the email you signed up with.', values }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthRedirect('/reset-password'),
  })

  // Rate limiting is the one failure worth naming — retrying immediately
  // would just fail again, and the generic message would look like a bug.
  if (error && error.message.toLowerCase().includes('rate limit')) {
    return { error: 'Too many attempts. Please wait a minute and try again.', values }
  }

  return {
    success: `If ${email} has a SkillFleet account, we've sent it a link to choose a new password. The link is good for one hour.`,
  }
}

/**
 * Step 2: set the new password.
 *
 * Reached only from the emailed link, which the callback has already
 * exchanged for a session — so updateUser is authenticated. Without that
 * session there is nobody to update, which is what the guard below catches.
 */
export async function updatePasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm_password') as string

  if (!password) return { error: 'Enter a new password.' }
  if (password !== confirm) return { error: 'The two passwords do not match.' }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: 'This reset link has expired. Please request a new one.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  redirect('/dashboard')
}
