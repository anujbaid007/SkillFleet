'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SupportConfigState = { error?: string; ok?: string } | undefined

export async function updateSupportConfigAction(
  _prev: SupportConfigState,
  formData: FormData
): Promise<SupportConfigState> {
  const id = (formData.get('id') as string)?.trim()
  const email = ((formData.get('admin_contact_email') as string) ?? '').trim() || null
  const phone = ((formData.get('admin_contact_phone') as string) ?? '').trim() || null
  if (!id) return { error: 'Missing config row.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('support_config')
    .update({
      admin_contact_email: email,
      admin_contact_phone: phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')

  if (error) return { error: 'Something went wrong. Please try again.' }

  // RLS refuses a non-admin by excluding the row, not by raising — so a
  // successful call that updated nothing is a refusal, and must not report
  // success. Verified: a student's UPDATE here returns 0 rows.
  if (!data || data.length === 0) return { error: 'Admins only.' }

  revalidatePath('/admin/coordinators/support')
  revalidatePath('/coordinator/support')
  return { ok: 'Saved.' }
}
