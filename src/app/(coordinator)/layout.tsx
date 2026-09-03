import { redirect } from 'next/navigation'
import { RegistrationConsentGate } from '@/components/onboarding/registration-consent-gate'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CoordinatorNav } from '@/components/coordinator/coordinator-nav'
import { MobileNavDrawer } from '@/components/mobile-nav-drawer'

export default async function CoordinatorLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, terms_agreed_at')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'coordinator') redirect('/')

  // Consent before anything else: asked as a card over the console (see
  // RegistrationConsentGate below), so a coordinator who comes straight here
  // after signing up is still asked.

  // Being a coordinator is not the same as being an approved one. The roster
  // RPC already refuses unapproved callers, so no student data could leak —
  // but the console itself should not open until an admin has said yes.
  // /coordinator is exempt: that is where the pending and rejected states live.
  const { data: claim } = await supabase.rpc('get_my_coordinator_school')
  const status = ((claim ?? []) as { coordinator_status: string }[])[0]?.coordinator_status
  const approved = status === 'approved'

  return (
    <div
      className="flex flex-col md:flex-row h-screen"
      style={{
        background:
          'radial-gradient(1100px 550px at 100% 0%, rgba(116,71,225,0.05), transparent 60%), radial-gradient(900px 500px at 0% 100%, rgba(20,184,166,0.04), transparent 60%), #F8FAFC',
      }}
    >
      <RegistrationConsentGate agreed={!!profile.terms_agreed_at} isCoordinator />

      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-black/[0.06]">
        <div className="px-4 py-5 border-b border-black/[0.06]">
          <Image
            src="/logo.svg"
            alt="SkillFleet"
            width={120}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <span className="mt-1 block text-xs font-medium text-muted uppercase tracking-wider">
            Coordinator
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CoordinatorNav approved={approved} />
        </div>
      </aside>

      <MobileNavDrawer subtitle="Coordinator">
        <CoordinatorNav approved={approved} />
      </MobileNavDrawer>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  )
}
