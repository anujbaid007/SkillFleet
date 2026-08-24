'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateClassBranch, branchToStore } from '@/lib/profile/details'
import { parseSchoolSelection, validateSchoolSelection } from '@/lib/schools/validate'
import { resolveSchoolId } from '@/app/actions/schools'

export type DetailsFormState = { error?: string } | undefined

export async function saveStudentDetailsAction(
  _prevState: DetailsFormState,
  formData: FormData
): Promise<DetailsFormState> {
  const schoolClass = (formData.get('school_class') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const schoolBranch = (formData.get('school_branch') as string)?.trim() || null
  const selection = parseSchoolSelection(formData)

  if (!schoolClass || !city) {
    return { error: 'All fields are required.' }
  }
  const classBranchError = validateClassBranch(schoolClass, schoolBranch)
  if (classBranchError) return { error: classBranchError }
  const schoolError = validateSchoolSelection(selection)
  if (schoolError) return { error: schoolError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Read role + onboarding state to (a) enforce student-only and (b) route after save.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'student') redirect('/dashboard')

  const resolved = await resolveSchoolId(selection)
  if ('error' in resolved) return { error: resolved.error }

  // role is intentionally NOT in this update (see security note).
  const { error } = await supabase
    .from('user_profiles')
    .update({
      school_class: schoolClass,
      school_branch: branchToStore(schoolClass, schoolBranch),
      school_id: resolved.schoolId,
      school_name: resolved.name,
      school_state: selection.state,
      school_district: selection.district,
      city,
    })
    .eq('id', user.id)

  if (error) return { error: 'Could not save your details. Please try again.' }

  // The student's school is only known now, so this is the first moment a
  // pending ISC invite can be matched against the same-school rule.
  await supabase.rpc('isc_claim_invites')

  // New students continue to the questionnaire; returning students go to the dashboard.
  if (!profile.onboarding_completed) {
    redirect('/onboarding')
  }
  revalidatePath('/dashboard')
  redirect('/dashboard')
}
