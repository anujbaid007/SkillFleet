import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FamilyManager } from '@/components/platform/family-manager'
import type { FamilyMember, PendingMember, FamilySummary } from '@/components/platform/family-manager'

export default async function FamilyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'student') redirect('/dashboard')

  const [{ data: members }, { data: pending }, { data: familyRows }] = await Promise.all([
    supabase.rpc('get_family_students'),
    supabase.rpc('get_pending_family_members'),
    supabase.rpc('get_my_family'),
  ])

  const family = ((familyRows ?? []) as FamilySummary[])[0] ?? null

  return (
    <FamilyManager
      currentUserId={user.id}
      members={(members ?? []) as FamilyMember[]}
      pending={(pending ?? []) as PendingMember[]}
      family={family}
    />
  )
}
