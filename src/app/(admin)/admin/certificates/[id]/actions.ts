'use server'

import { revalidatePath } from 'next/cache'
import { invalidateAdminCache } from '@/lib/admin/cache'
import { createClient } from '@/lib/supabase/server'

/*
  invalidateAdminCache() before every revalidatePath: the certificates queue is
  cached for sixty seconds in src/lib/admin/queues.ts, and a re-render that
  reads that entry would show the certificate just decided still pending.
*/

export type CertActionState = { error?: string; success?: string } | undefined

export async function reviewCertAction(
  _prev: CertActionState,
  formData: FormData
): Promise<CertActionState> {
  const certId = formData.get('cert_id') as string
  const decision = formData.get('decision') as string
  const notes = (formData.get('admin_notes') as string)?.trim() || null

  if (!certId) return { error: 'Missing cert ID.' }

  const supabase = await createClient()

  if (decision === 'reject') {
    const { data: status, error } = await supabase.rpc('admin_reject_cert', {
      p_cert_id: certId,
      p_admin_notes: notes,
    })
    if (error) return { error: 'Database error. Please try again.' }
    switch (status) {
      case 'ok':
        invalidateAdminCache()
        revalidatePath('/admin/certificates')
        revalidatePath('/admin')
        return { success: 'Certificate rejected.' }
      case 'not_admin':
        return { error: 'Permission denied.' }
      case 'not_found':
        return { error: 'Certificate not found.' }
      case 'not_pending':
        return { error: 'Certificate is no longer pending.' }
      default:
        return { error: `Unexpected status: ${status}` }
    }
  }

  if (decision === 'approve') {
    const points = parseInt(formData.get('points_approved') as string, 10)
    const paramId = (formData.get('parameter_id') as string) || null
    if (isNaN(points) || points < 0) return { error: 'Points must be a non-negative whole number.' }

    const { data: status, error } = await supabase.rpc('admin_approve_cert', {
      p_cert_id: certId,
      p_points_approved: points,
      p_admin_notes: notes,
      p_parameter_id: paramId,
    })
    if (error) return { error: 'Database error. Please try again.' }
    switch (status) {
      case 'ok':
        invalidateAdminCache()
        revalidatePath('/admin/certificates')
        revalidatePath('/admin')
        return { success: points > 0 ? `Approved. +${points} pts awarded.` : 'Approved. No points awarded.' }
      case 'not_admin':
        return { error: 'Permission denied.' }
      case 'not_found':
        return { error: 'Certificate not found.' }
      case 'not_pending':
        return { error: 'Certificate is no longer pending.' }
      case 'no_parameter':
        return { error: 'No skill/parameter set. Select one before approving.' }
      default:
        return { error: `Unexpected status: ${status}` }
    }
  }

  return { error: 'Invalid decision.' }
}
