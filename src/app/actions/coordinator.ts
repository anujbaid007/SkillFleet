'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validatePassword } from '@/lib/validation/password'
import { validateMobile } from '@/lib/validation/mobile'
import { parseSchoolSelection, validateSchoolSelection } from '@/lib/schools/validate'
import { validateCoordinatorApplication } from '@/lib/coordinator/validate'
import { isExistingEmailSignup } from '@/lib/auth/signup'
import { resolveSchoolId } from '@/app/actions/schools'
import type { AuthFormState } from '@/app/actions/auth'

function buildAuthRedirect(next: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`
}

const ONBOARDING_PATH = '/onboarding/consent'

/**
 * Step 1 of coordinator signup: the account only. School selection happens
 * afterward, once logged in — resolveSchoolId() needs auth.uid() to verify a
 * picked school really is in the submitted state/district, and that does not
 * exist yet during signUp(). Student signup splits for the same reason.
 */
export async function signupCoordinatorAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  // Echoed back so a rejected submission re-fills the form instead of
  // emptying it — see AuthFormState.values.
  const values = { email: email ?? '' }

  if (!email || !password) {
    return { error: 'Email and password are required.', values }
  }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError, values }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // signup_type still matters: it is the only thing telling
      // handle_new_user() to build a coordinator profile rather than a
      // student one. Name and phone now come later, on the onboarding step.
      data: { signup_type: 'coordinator' },
      emailRedirectTo: buildAuthRedirect(ONBOARDING_PATH),
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
  if (!data.session) {
    return {
      success: `We've sent a confirmation link to ${email}. Click it to finish creating your account, then sign in.`,
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message, values }

  redirect(ONBOARDING_PATH)
}

/**
 * Only ever carries an error: a successful application redirects to
 * /coordinator, so there is no success state to render here.
 */
export type ApplyState =
  | {
      error?: string
      /** Echoed back on failure so a rejected field does not empty the form. */
      values?: Record<string, string>
    }
  | undefined

const APPLY_ERR: Record<string, string> = {
  forbidden: 'Only coordinator accounts can apply for a school.',
  board_and_count_required: 'Please give both your board and the number of students.',
  school_not_found: 'That school could not be found. Please pick again.',
  already_has_coordinator: 'Another coordinator has already claimed this school.',
}

/** Step 2: school, board, student count -> a pending claim. */
export async function applyAsCoordinatorAction(
  _prev: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  const echo = (k: string) => ((formData.get(k) as string) ?? '').trim()
  const values = {
    full_name: echo('full_name'),
    phone: echo('phone'),
    board: echo('board'),
    student_count_range: echo('student_count_range'),
  }

  const selection = parseSchoolSelection(formData)
  const selectionError = validateSchoolSelection(selection)
  if (selectionError) return { error: selectionError, values }

  const board = ((formData.get('board') as string) ?? '').trim()
  const studentCountRange = ((formData.get('student_count_range') as string) ?? '').trim()
  const applicationError = validateCoordinatorApplication(board, studentCountRange)
  if (applicationError) return { error: applicationError, values }

  const resolved = await resolveSchoolId(selection)
  if ('error' in resolved) return { error: resolved.error, values }

  const supabase = await createClient()

  // Only present for a coordinator who signed up with Google, where OAuth
  // returned no phone number. Saved before the claim so a failure here cannot
  // leave a school claimed by someone we have no way to contact.
  const fullName = ((formData.get('full_name') as string) ?? '').trim()
  const phone = ((formData.get('phone') as string) ?? '').trim()

  if (!fullName) return { error: 'Please give your full name.', values }
  if (phone) {
    const phoneError = validateMobile(phone, 'WhatsApp number')
    if (phoneError) return { error: phoneError, values }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('user_profiles')
      .update(phone ? { full_name: fullName, phone } : { full_name: fullName })
      .eq('id', user.id)
  }

  const { data, error } = await supabase.rpc('apply_as_coordinator', {
    p_school_id: resolved.schoolId,
    p_board: board,
    p_student_count_range: studentCountRange,
  })

  if (error) return { error: 'Could not submit your application. Please try again.', values }

  const status = (data as string) ?? ''
  if (status !== 'pending') {
    return { error: APPLY_ERR[status] ?? 'Could not submit your application. Please try again.', values }
  }

  revalidatePath('/coordinator')
  redirect('/coordinator')
}

export interface MyCoordinatorSchool {
  schoolId: string
  schoolName: string
  status: string
  reviewNotes: string | null
}

export async function getMyCoordinatorSchool(): Promise<MyCoordinatorSchool | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_my_coordinator_school')
  const row = (data ?? [])[0]
  if (!row) return null
  return {
    schoolId: row.school_id,
    schoolName: row.school_name,
    status: row.coordinator_status,
    reviewNotes: row.review_notes,
  }
}

export interface RosterStudent {
  studentId: string
  fullName: string | null
  schoolClass: string | null
  /** Track id -> 'draft' | 'submitted'. An absent track means not started. */
  iscStatus: Record<string, string>
}

export async function getSchoolRoster(): Promise<RosterStudent[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_school_roster')
  return (data ?? []).map((r) => ({
    studentId: r.student_id,
    fullName: r.full_name,
    schoolClass: r.school_class,
    iscStatus: (r.isc_status ?? {}) as Record<string, string>,
  }))
}
