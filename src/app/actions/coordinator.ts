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

const ONBOARDING_PATH = '/onboarding/coordinator'

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
  const fullName = (formData.get('full_name') as string)?.trim()
  const phone = ((formData.get('phone') as string) ?? '').trim()

  if (!email || !password || !fullName) {
    return { error: 'Name, email and password are all required.' }
  }

  const mobileError = validateMobile(phone)
  if (mobileError) return { error: mobileError }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { signup_type: 'coordinator', full_name: fullName, phone },
      emailRedirectTo: buildAuthRedirect(ONBOARDING_PATH),
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
  if (!data.session) {
    return {
      success: `We've sent a confirmation link to ${email}. Click it to finish creating your account, then sign in.`,
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

  redirect(ONBOARDING_PATH)
}

/**
 * Only ever carries an error: a successful application redirects to
 * /coordinator, so there is no success state to render here.
 */
export type ApplyState = { error?: string } | undefined

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
  const selection = parseSchoolSelection(formData)
  const selectionError = validateSchoolSelection(selection)
  if (selectionError) return { error: selectionError }

  const board = ((formData.get('board') as string) ?? '').trim()
  const studentCountRange = ((formData.get('student_count_range') as string) ?? '').trim()
  const applicationError = validateCoordinatorApplication(board, studentCountRange)
  if (applicationError) return { error: applicationError }

  const resolved = await resolveSchoolId(selection)
  if ('error' in resolved) return { error: resolved.error }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('apply_as_coordinator', {
    p_school_id: resolved.schoolId,
    p_board: board,
    p_student_count_range: studentCountRange,
  })

  if (error) return { error: 'Could not submit your application. Please try again.' }

  const status = (data as string) ?? ''
  if (status !== 'pending') {
    return { error: APPLY_ERR[status] ?? 'Could not submit your application. Please try again.' }
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
}

export async function getSchoolRoster(): Promise<RosterStudent[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_school_roster')
  return (data ?? []).map((r) => ({
    studentId: r.student_id,
    fullName: r.full_name,
    schoolClass: r.school_class,
  }))
}
