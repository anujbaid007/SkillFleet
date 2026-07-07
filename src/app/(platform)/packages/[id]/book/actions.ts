'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type BulkBookState = { error?: string } | undefined

const ERR: Record<string, string> = {
  not_parent: 'Only parent accounts can redeem package slots.',
  package_not_found: 'Package not found.',
  not_owner: 'Package not found.',
  package_not_active: 'This package is not active.',
  package_expired: 'This package has expired.',
  no_slots: 'No slots left in this package.',
}

export async function bulkRedeemAction(
  _prev: BulkBookState,
  formData: FormData
): Promise<BulkBookState> {
  const packageId = formData.get('package_id') as string
  const offeringIds = formData.getAll('offering_ids').filter(Boolean) as string[]

  if (!packageId) return { error: 'Missing package.' }
  if (offeringIds.length === 0) return { error: 'Select at least one offering to book.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('book_multiple_with_package', { p_package_id: packageId, p_offering_ids: offeringIds })
    .single()

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (data?.status !== 'ok') return { error: ERR[data?.status ?? ''] ?? 'Could not book. Please try again.' }

  redirect(`/packages/${packageId}?booked=${data.booked}`)
}
