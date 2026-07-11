'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validatePassword } from '@/lib/validation/password'
import { validateDob } from '@/lib/validation/dob'
import { isStudentDetailsComplete } from '@/lib/profile/details'

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
      .select('role, onboarding_completed, school_class, school_name, city, parent_mobile')
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
// STUDENT SIGNUP
// -------------------------------------------------------

export async function signupStudentAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string)?.trim()
  const dob = formData.get('date_of_birth') as string // YYYY-MM-DD

  if (!email || !password || !fullName || !dob) {
    return { error: 'All fields are required.' }
  }
  const dobError = validateDob(dob)
  if (dobError) {
    return { error: dobError }
  }
  const passwordError = validatePassword(password)
  if (passwordError) {
    return { error: passwordError }
  }

  const supabase = await createClient()
  const next = '/onboarding/details'

  // The DB trigger reads this metadata to create the user_profiles row
  // (role is sanitized server-side to 'student' | 'parent').
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'student', full_name: fullName, date_of_birth: dob },
      emailRedirectTo: buildAuthRedirect(next),
    },
  })

  if (error) return { error: error.message }

  // With email confirmation enabled there is no session until the link is clicked.
  if (!data.session) return { success: confirmEmailMessage(email) }

  // Auto-confirm is on → establish the session and continue.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

  // Brand-new students have no details yet — collect them first.
  redirect(next)
}

// -------------------------------------------------------
// PARENT SIGNUP
// -------------------------------------------------------

export async function signupParentAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!email || !password || !fullName) {
    return { error: 'Email, password, and full name are required.' }
  }
  const passwordError = validatePassword(password)
  if (passwordError) {
    return { error: passwordError }
  }

  const supabase = await createClient()
  const next = '/signup/parent/link-student'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'parent', full_name: fullName, phone: phone || '' },
      emailRedirectTo: buildAuthRedirect(next),
    },
  })

  if (error) return { error: error.message }

  if (!data.session) return { success: confirmEmailMessage(email) }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

  redirect(next)
}

// -------------------------------------------------------
// LINK STUDENT TO PARENT
// -------------------------------------------------------

export async function linkStudentAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const studentEmail = (formData.get('student_email') as string)?.trim().toLowerCase()
  const studentPassword = formData.get('student_password') as string

  if (!studentEmail || !studentPassword) {
    return { error: "Student's email and password are both required." }
  }

  const supabase = await createClient()
  const { data: status, error } = await supabase.rpc('link_student_with_password', {
    p_email: studentEmail,
    p_password: studentPassword,
  })

  if (error) {
    return { error: 'Could not link student. Please try again.' }
  }

  if (status === 'ok') {
    revalidatePath('/children')
    return { success: 'Student linked successfully.' }
  }

  switch (status) {
    case 'not_authenticated':
      return { error: 'Your session expired. Please sign in again.' }
    case 'not_parent':
      return { error: 'Only parent accounts can link a student.' }
    case 'not_found':
      return { error: 'No student account found with that email. Ask your child to sign up first.' }
    case 'wrong_password':
      return { error: "The email and password don't match a student account." }
    case 'self':
      return { error: 'You cannot link your own account.' }
    case 'not_student':
      return { error: 'That account is not a student account.' }
    case 'already_linked':
      return { error: 'This student is already linked to your account.' }
    default:
      return { error: 'Could not link student. Please try again.' }
  }
}

// -------------------------------------------------------
// UNLINK STUDENT FROM PARENT
// -------------------------------------------------------

export async function unlinkStudentAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const studentId = formData.get('student_id') as string

  if (!studentId) {
    return { error: 'Missing student.' }
  }

  const supabase = await createClient()
  const { data: status, error } = await supabase.rpc('unlink_student', {
    p_student_id: studentId,
  })

  if (error) {
    return { error: 'Could not unlink student. Please try again.' }
  }

  if (status === 'ok') {
    revalidatePath('/children')
    return { success: 'Student unlinked.' }
  }

  return { error: 'Could not unlink student. Please try again.' }
}

// -------------------------------------------------------
// LOGOUT
// -------------------------------------------------------

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
