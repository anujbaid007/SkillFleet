'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mapCompletionResult } from '@/lib/utils/completion'

export async function markCompleteAction(formData: FormData) {
  const bookingId = formData.get('booking_id') as string
  if (!bookingId) redirect('/admin/completions?error=Missing+booking+ID.')

  const supabase = await createClient()
  const { data: result, error } = await supabase.rpc('admin_mark_complete', {
    p_booking_id: bookingId,
  })

  if (error) redirect('/admin/completions?error=Database+error.+Please+try+again.')

  const mapped = mapCompletionResult(result ?? '')
  if (mapped.error) {
    redirect(`/admin/completions?error=${encodeURIComponent(mapped.error)}`)
  }

  revalidatePath('/admin/completions')
  redirect('/admin/completions')
}
