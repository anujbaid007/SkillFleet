'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ResubmitState = { error?: string; success?: string }

// Student resubmits a REJECTED certificate: swaps in a new file and resets
// the row to 'pending' for another admin review. RLS ("Students manage own
// certs") already limits the update to the student's own rows; we also verify
// ownership + rejected-status explicitly and control exactly which columns are
// written (so review fields are cleared, not left stale).
export async function resubmitCertAction(formData: FormData): Promise<ResubmitState> {
  const certId = formData.get('cert_id') as string
  const fileUrl = formData.get('file_url') as string
  const fileName = formData.get('file_name') as string

  if (!certId || !fileUrl || !fileName) return { error: 'Missing file information.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: cert } = await supabase
    .from('certificate_uploads')
    .select('id, student_id, status')
    .eq('id', certId)
    .single()

  if (!cert || cert.student_id !== user.id) return { error: 'Certificate not found.' }
  if (cert.status !== 'rejected') return { error: 'Only rejected certificates can be resubmitted.' }

  const { error } = await supabase
    .from('certificate_uploads')
    .update({
      file_url: fileUrl,
      file_name: fileName,
      status: 'pending',
      points_approved: 0,
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq('id', certId)

  if (error) return { error: 'Could not resubmit. Please try again.' }

  revalidatePath('/certificates')
  return { success: 'Resubmitted for review.' }
}
