'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * A student's own saved-for-later list, visible to the rest of the family.
 * RLS ("Students manage own shortlist") already restricts writes to the owner —
 * these actions just give the UI a way in.
 */
export async function removeFromShortlistAction(formData: FormData) {
  const offeringId = formData.get('offering_id') as string
  if (!offeringId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('student_shortlist').delete().eq('student_id', user.id).eq('offering_id', offeringId)

  revalidatePath('/dashboard')
}

export async function addToShortlistAction(formData: FormData) {
  const offeringId = formData.get('offering_id') as string
  if (!offeringId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('student_shortlist').upsert({ student_id: user.id, offering_id: offeringId })

  revalidatePath('/dashboard')
}
