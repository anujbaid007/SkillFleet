'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateMobile } from '@/lib/validation/mobile'
import { validateClassBranch, branchToStore } from '@/lib/profile/details'
import { parseSchoolSelection, validateSchoolSelection } from '@/lib/schools/validate'
import { resolveSchoolId } from '@/app/actions/schools'

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
    school_id?: string
    school_state?: string
    school_district?: string
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
    const city = (formData.get('city') as string)?.trim()
    const schoolBranch = (formData.get('school_branch') as string)?.trim() || null
    const parentMobileRaw = (formData.get('parent_mobile') as string) ?? ''
    const selection = parseSchoolSelection(formData)

    if (!schoolClass || !city) {
      return { error: 'Class and city are required.' }
    }
    const classBranchError = validateClassBranch(schoolClass, schoolBranch)
    if (classBranchError) return { error: classBranchError }
    const mobileError = validateMobile(parentMobileRaw)
    if (mobileError) return { error: mobileError }
    const schoolError = validateSchoolSelection(selection)
    if (schoolError) return { error: schoolError }

    const resolved = await resolveSchoolId(selection)
    if ('error' in resolved) return { error: resolved.error }

    update.school_class = schoolClass
    update.school_branch = branchToStore(schoolClass, schoolBranch)
    update.school_id = resolved.schoolId
    update.school_name = resolved.name
    update.school_state = selection.state
    update.school_district = selection.district
    update.city = city
    update.parent_mobile = parentMobileRaw.replace(/\s+/g, '')
  }

  const { error } = await supabase.from('user_profiles').update(update).eq('id', user.id)
  if (error) return { error: 'Could not save changes. Please try again.' }

  revalidatePath('/account')
  return { success: 'Saved.' }
}

/**
 * Update the parent details shared by everyone in the family. The parent email
 * is deliberately not editable — it is the key siblings join on, so changing it
 * would silently split or merge families.
 */
export async function updateParentDetailsAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const fullName = (formData.get('parent_full_name') as string)?.trim()
  const phone = ((formData.get('parent_phone') as string) ?? '').trim()

  if (!fullName) return { error: "Parent's name is required." }
  if (phone) {
    const mobileError = validateMobile(phone)
    if (mobileError) return { error: mobileError }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase.rpc('update_family_parent_details', {
    p_full_name: fullName,
    p_phone: phone,
  })

  if (error) return { error: 'Could not save changes. Please try again.' }
  if (data === 'no_family') return { error: 'Your account is not part of a family yet.' }
  if (data !== 'ok') return { error: "Parent's name is required." }

  revalidatePath('/account')
  revalidatePath('/family')
  return { success: 'Saved.' }
}
