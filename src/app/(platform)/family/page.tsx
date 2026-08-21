import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChildrenManager } from '@/components/platform/children-manager'

export default async function ChildrenPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only parents manage children.
  if (profile?.role !== 'parent') redirect('/dashboard')

  const { data: children } = await supabase.rpc('get_my_children')

  return <ChildrenManager students={children ?? []} />
}
