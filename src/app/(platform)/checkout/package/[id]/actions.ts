'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mapPackageResult } from '@/lib/utils/package'
import { createMockOrderId, createMockPaymentId } from '@/lib/payments/mock-gateway'

type SupaClient = Awaited<ReturnType<typeof createClient>>

// Route to the right settle RPC depending on whether this is an initial
// purchase or an upgrade. Both RPCs return a text status.
function settle(
  supabase: SupaClient,
  mode: string,
  packageId: string,
  success: boolean,
  orderId: string,
  paymentId: string
) {
  if (mode === 'upgrade') {
    return supabase.rpc('settle_package_upgrade', {
      p_package_id: packageId,
      p_success: success,
      p_order_id: orderId,
      p_payment_id: paymentId,
    })
  }
  return supabase.rpc('settle_package_payment', {
    p_package_id: packageId,
    p_success: success,
    p_order_id: orderId,
    p_payment_id: paymentId,
  })
}

export async function payPackageAction(formData: FormData) {
  const packageId = formData.get('package_id') as string
  const mode = formData.get('mode') as string
  if (!packageId) redirect('/packages')

  const supabase = await createClient()
  const { data: status, error } = await settle(
    supabase,
    mode,
    packageId,
    true,
    createMockOrderId(),
    createMockPaymentId()
  )

  if (error) redirect(`/checkout/package/${packageId}?error=${encodeURIComponent('Payment error. Please try again.')}`)

  const mapped = mapPackageResult(status ?? '')
  if (mapped.error) redirect(`/checkout/package/${packageId}?error=${encodeURIComponent(mapped.error)}`)

  revalidatePath('/packages')
  redirect('/packages?paid=1')
}

export async function failPackageAction(formData: FormData) {
  const packageId = formData.get('package_id') as string
  const mode = formData.get('mode') as string
  if (!packageId) redirect('/packages')

  const supabase = await createClient()
  await settle(supabase, mode, packageId, false, createMockOrderId(), '')

  revalidatePath('/packages')
  redirect('/packages?failed=1')
}
