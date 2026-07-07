'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { mapPackageResult } from '@/lib/utils/package'

export type PackageActionState = { error?: string } | undefined

// Create a pending package for a child, then send the parent to checkout.
export async function buyPackageAction(
  _prev: PackageActionState,
  formData: FormData
): Promise<PackageActionState> {
  const tierId = formData.get('tier_id') as string
  const studentId = formData.get('student_id') as string
  if (!tierId || !studentId) return { error: 'Pick a child and a package.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('create_package', { p_tier_id: tierId, p_student_id: studentId })
    .single()

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (data?.status !== 'ok') return { error: mapPackageResult(data?.status ?? '').error }

  redirect(`/checkout/package/${data.package_id}`)
}

// Request an upgrade to a higher tier, then send the parent to pay the difference.
export async function requestUpgradeAction(
  _prev: PackageActionState,
  formData: FormData
): Promise<PackageActionState> {
  const packageId = formData.get('package_id') as string
  const newTierId = formData.get('new_tier_id') as string
  if (!packageId || !newTierId) return { error: 'Pick a tier to upgrade to.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('create_package_upgrade', { p_package_id: packageId, p_new_tier_id: newTierId })
    .single()

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (data?.status !== 'ok') return { error: mapPackageResult(data?.status ?? '').error }

  redirect(`/checkout/package/${packageId}`)
}
