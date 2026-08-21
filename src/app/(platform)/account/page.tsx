import { redirect } from 'next/navigation'
import { UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AccountForm } from '@/components/account/account-form'
import { ParentDetailsForm } from '@/components/account/parent-details-form'
import { getSchoolStates } from '@/app/actions/schools'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: familyRows }, states] = await Promise.all([
    supabase
      .from('user_profiles')
      .select(
        'full_name, role, date_of_birth, phone, school_class, school_branch, school_name, school_id, school_state, school_district, city, parent_mobile'
      )
      .eq('id', user.id)
      .single(),
    supabase.rpc('get_my_family'),
    getSchoolStates(),
  ])

  if (!profile) redirect('/login')

  // One account per student, so the parent's details live here too.
  const family = (familyRows ?? [])[0] ?? null

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Settings" icon={UserRound} title="My Account" subtitle="Your personal details." />

      <Reveal delay={0.03}>
        <div className="clay-card p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-white">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display font-bold text-foreground">{profile.full_name ?? 'Your account'}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                  {profile.role}
                </span>
              </div>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
      <AccountForm
        role={profile.role}
        email={user.email ?? ''}
        states={states}
        initial={{
          full_name: profile.full_name ?? '',
          date_of_birth: profile.date_of_birth ?? '',
          phone: profile.phone ?? '',
          school_class: profile.school_class ?? '',
          school_branch: profile.school_branch ?? '',
          school_name: profile.school_name ?? '',
          school_id: profile.school_id ?? '',
          school_state: profile.school_state ?? '',
          school_district: profile.school_district ?? '',
          city: profile.city ?? '',
          parent_mobile: profile.parent_mobile ?? '',
        }}
      />
      </Reveal>

      {family && (
        <Reveal delay={0.09}>
          <ParentDetailsForm
            parentName={family.parent_full_name}
            parentEmail={family.parent_email}
            parentPhone={family.parent_phone ?? ''}
            memberCount={family.member_count}
          />
        </Reveal>
      )}
    </div>
  )
}
