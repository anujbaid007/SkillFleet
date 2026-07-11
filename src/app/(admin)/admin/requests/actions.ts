'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const STATUSES = ['open', 'planned', 'fulfilled', 'declined']

/** Admin sets the triage status of a demand request. RLS restricts this to admins. */
export async function updateRequestStatusAction(formData: FormData) {
  const id = formData.get('id') as string
  const status = formData.get('status') as string
  if (!id || !STATUSES.includes(status)) return

  const supabase = await createClient()
  await supabase.from('offering_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/requests')
}
