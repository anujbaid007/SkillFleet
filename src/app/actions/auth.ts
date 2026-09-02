'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validatePassword } from '@/lib/validation/password'
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
    // The starter assessment is offered from the dashboard, not forced on the
    // way in: it is optional, it already has a "Skip for now", and a student
    // signing in to check a deadline should not have to get past it first.
    if (profile?.role === 'student' && !isStudentDetailsComplete(profile)) {
      redirect('/onboarding/details')
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

  const values = { email: email ?? '' }

  if (!email || !password) {
    return { error: 'Email and password are required.', values }
  }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError, values }

  const supabase = await createClient()
  // Consent first: /onboarding/details is where a date of birth, a school and
  // a parent's contact details are actually collected.
  const next = '/onboarding/consent'

  /*
    Credentials only.

    Name, date of birth, the parent's details and the school are all collected
    on /onboarding/details instead. Signing in with Google cannot supply any of
    them, so asking here would have meant two different signup paths producing
    two different half-built profiles. One onboarding step now completes every
    account, however it was created.
  */
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: buildAuthRedirect(next) },
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
