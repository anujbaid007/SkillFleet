'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type VendorFormState = { error?: string; ok?: string } | undefined

const ERR: Record<string, string> = {
  forbidden: 'Admins only.',
  org_required: 'Organisation name is required.',
  user_not_found: 'No account found with that email. Ask them to sign up first, then add them here.',
}

/**
 * Promote an existing account to a vendor. (The person signs up normally, then
 * the admin adds them here — no service-role key or public vendor signup needed.)
 */
export async function addVendorAction(_prev: VendorFormState, formData: FormData): Promise<VendorFormState> {
  const email = (formData.get('email') as string)?.trim()
  const org = (formData.get('org_name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim() || null
  const about = (formData.get('about') as string)?.trim() || null
  if (!email || !org) return { error: 'Email and organisation name are required.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('admin_promote_vendor', { p_email: email, p_org_name: org, p_phone: phone, p_about: about })
    .single()

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (data?.status !== 'ok') return { error: ERR[data?.status ?? ''] ?? 'Could not add vendor.' }

  revalidatePath('/admin/vendors')
  return { ok: `${org} is now a vendor.` }
}
