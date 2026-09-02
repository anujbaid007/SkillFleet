'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { validateClassBranch, branchToStore } from '@/lib/profile/details'
import { validateDob } from '@/lib/validation/dob'
import { validateMobile } from '@/lib/validation/mobile'
import { parseSchoolSelection, validateSchoolSelection } from '@/lib/schools/validate'
import { resolveSchoolId } from '@/app/actions/schools'

export type DetailsFormState = { error?: string } | undefined

export async function saveStudentDetailsAction(
  _prevState: DetailsFormState,
  formData: FormData
): Promise<DetailsFormState> {
  const fullName = (formData.get('full_name') as string)?.trim()
  const schoolClass = (formData.get('school_class') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const schoolBranch = (formData.get('school_branch') as string)?.trim() || null
  const selection = parseSchoolSelection(formData)

  if (!fullName || !schoolClass || !city) {
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
    .select('role, onboarding_completed, date_of_birth, family_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'student') redirect('/dashboard')

  /*
    Fields the email signup form collects but Google does not.

    handle_new_user() builds the date of birth and the whole family record out
    of signUp metadata. An OAuth sign-in carries none, so a student who arrived
    via Google reaches this page with neither. Asked for here rather than in a
    separate screen, so there is still only one gate between signing up and
    using the platform.
  */
  const extra: { date_of_birth?: string; parent_mobile?: string } = {}

  if (!profile.date_of_birth) {
    const dob = (formData.get('date_of_birth') as string)?.trim()
    const dobError = validateDob(dob ?? '')
    if (dobError) return { error: dobError }
    extra.date_of_birth = dob
  }

  if (!profile.family_id) {
    const parentName = (formData.get('parent_full_name') as string)?.trim()
    const parentEmail = (formData.get('parent_email') as string)?.trim().toLowerCase()
    const parentPhone = (formData.get('parent_phone') as string)?.trim()

    if (!parentName || !parentEmail) return { error: "Parent's name and email are required." }
    if (parentEmail === user.email?.toLowerCase()) {
      return { error: "The parent's email must be different from the student's sign-in email." }
    }
    const phoneError = validateMobile(parentPhone ?? '', 'WhatsApp number')
    if (phoneError) return { error: phoneError }

    /*
      Mirrors the trigger's family logic: an existing family with this parent
      email is joined pending approval from inside it, otherwise a new one is
      started. Goes through the service-role client because a student cannot
      read or write another family's row, which is exactly what looking one up
      requires.
    */
    const { data: existing } = await adminClient
      .from('families')
      .select('id, parent_phone')
      .ilike('parent_email', parentEmail)
      .maybeSingle()

    if (existing) {
      extra.parent_mobile = existing.parent_phone ?? parentPhone
      await adminClient
        .from('user_profiles')
        .update({ family_id: existing.id, family_status: 'pending' })
        .eq('id', user.id)
    } else {
      const { data: created, error: familyError } = await adminClient
        .from('families')
        .insert({
          parent_full_name: parentName,
          parent_email: parentEmail,
          parent_phone: parentPhone,
        })
        .select('id')
        .single()

      if (familyError || !created) {
        return { error: 'Could not save your parent details. Please try again.' }
      }
      extra.parent_mobile = parentPhone
      await adminClient
        .from('user_profiles')
        .update({ family_id: created.id, family_status: 'active' })
        .eq('id', user.id)
    }
  }

  const resolved = await resolveSchoolId(selection)
  if ('error' in resolved) return { error: resolved.error }

  // role is intentionally NOT in this update (see security note).
  const { error } = await supabase
    .from('user_profiles')
    .update({
      full_name: fullName,
      school_class: schoolClass,
      school_branch: branchToStore(schoolClass, schoolBranch),
      school_id: resolved.schoolId,
      school_name: resolved.name,
      school_state: selection.state,
      school_district: selection.district,
      city,
      ...extra,
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
