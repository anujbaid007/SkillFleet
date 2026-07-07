'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateMobile } from '@/lib/validation/mobile'
import { validateClassBranch, branchToStore } from '@/lib/profile/details'

export type DetailsFormState = { error?: string } | undefined

export async function saveStudentDetailsAction(
  _prevState: DetailsFormState,
  formData: FormData
): Promise<DetailsFormState> {
  const schoolClass = (formData.get('school_class') as string)?.trim()
  const schoolName = (formData.get('school_name') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const schoolBranch = (formData.get('school_branch') as string)?.trim() || null
  const parentMobileRaw = (formData.get('parent_mobile') as string) ?? ''

  if (!schoolClass || !schoolName || !city) {
    return { error: 'All fields are required.' }
  }
  const classBranchError = validateClassBranch(schoolClass, schoolBranch)
  if (classBranchError) return { error: classBranchError }
  const mobileError = validateMobile(parentMobileRaw)
  if (mobileError) return { error: mobileError }
  const parentMobile = parentMobileRaw.replace(/\s+/g, '')

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

  // role is intentionally NOT in this update (see security note).
  const { error } = await supabase
    .from('user_profiles')
    .update({
      school_class: schoolClass,
      school_branch: branchToStore(schoolClass, schoolBranch),
      school_name: schoolName,
      city,
      parent_mobile: parentMobile,
    })
    .eq('id', user.id)

  if (error) return { error: 'Could not save your details. Please try again.' }

  // New students continue to the questionnaire; returning students go to the dashboard.
  if (!profile.onboarding_completed) {
    redirect('/onboarding')
  }
  revalidatePath('/dashboard')
  redirect('/dashboard')
}
