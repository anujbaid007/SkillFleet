'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateMobile } from '@/lib/validation/mobile'
import { validateClassBranch, branchToStore } from '@/lib/profile/details'

export type AccountFormState = { error?: string; success?: string } | undefined

export async function updateAccountAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const fullName = (formData.get('full_name') as string)?.trim()
  const dob = (formData.get('date_of_birth') as string)?.trim() // '' or YYYY-MM-DD
  const phoneRaw = (formData.get('phone') as string)?.trim() ?? ''

  if (!fullName) return { error: 'Full name is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session expired. Please sign in again.' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found.' }

  // Base fields editable by every role. role is intentionally excluded.
  const update: {
    full_name: string
    date_of_birth: string | null
    phone: string | null
    school_class?: string
    school_branch?: string | null
    school_name?: string
    city?: string
    parent_mobile?: string
  } = {
    full_name: fullName,
    date_of_birth: dob || null,
    phone: phoneRaw || null,
  }

  // Students additionally edit (and must keep) the required fields.
  if (profile.role === 'student') {
    const schoolClass = (formData.get('school_class') as string)?.trim()
    const schoolName = (formData.get('school_name') as string)?.trim()
    const city = (formData.get('city') as string)?.trim()
    const schoolBranch = (formData.get('school_branch') as string)?.trim() || null
    const parentMobileRaw = (formData.get('parent_mobile') as string) ?? ''

    if (!schoolClass || !schoolName || !city) {
      return { error: 'Class, school, and city are required.' }
    }
    const classBranchError = validateClassBranch(schoolClass, schoolBranch)
    if (classBranchError) return { error: classBranchError }
    const mobileError = validateMobile(parentMobileRaw)
    if (mobileError) return { error: mobileError }

    update.school_class = schoolClass
    update.school_branch = branchToStore(schoolClass, schoolBranch)
    update.school_name = schoolName
    update.city = city
    update.parent_mobile = parentMobileRaw.replace(/\s+/g, '')
  }

  const { error } = await supabase.from('user_profiles').update(update).eq('id', user.id)
  if (error) return { error: 'Could not save changes. Please try again.' }

  revalidatePath('/account')
  return { success: 'Saved.' }
}
