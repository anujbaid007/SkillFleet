import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/session'
import { PlatformNav } from '@/components/platform/platform-nav'
import { MobileNavDrawer } from '@/components/mobile-nav-drawer'
import { ChatWidget } from '@/components/chat/chat-widget'
import { isStudentDetailsComplete } from '@/lib/profile/details'
import type { SwitchTarget } from '@/app/actions/switch'
import { RegistrationConsentGate } from '@/components/onboarding/registration-consent-gate'

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  // Shared with the page below via React's per-request cache, so the two do
  // not each pay for the same auth check and profile read.
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  // Admin, vendor and coordinator each have their own console
  if (profile.role === 'admin') redirect('/admin')
  if (profile.role === 'vendor') redirect('/vendor')
  if (profile.role === 'coordinator') redirect('/coordinator')

  // Consent comes before anything else. It is asked as a card over the page
  // (see RegistrationConsentGate below) rather than on a page of its own.

  // Students must give their required details before using the platform.
  if (profile.role === 'student' && !isStudentDetailsComplete(profile)) {
    redirect('/onboarding/details')
  }

  const supabase = await createClient()

  /*
    Nothing here depends on anything else here, so they go together rather
    than one after the other. Sequentially these were two more round trips
    in front of every page on the platform.
  */
  const [switchTargetsResult, cartResult] = await Promise.all([
    supabase.rpc('get_switch_targets'),
    // Cart badge. RLS already scopes the cart to this family.
    profile.role === 'student'
      ? supabase.from('cart_items').select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: 0 }),
  ])

  const switchTargets = (switchTargetsResult.data ?? []) as SwitchTarget[]
  const cartCount = cartResult.count ?? 0

  return (
    <div
      /*
        h-dvh, not h-screen: on phones 100vh is the tallest the viewport ever
        gets, so with the browser's toolbars showing, the bottom of the shell
        sits behind them and the last control on a page is unreachable. The
        dynamic unit tracks the visible area instead.
      */
      className="flex flex-col md:flex-row h-dvh"
      style={{
        background:
          'radial-gradient(1100px 550px at 100% 0%, rgba(116,71,225,0.06), transparent 60%), radial-gradient(900px 500px at 0% 100%, rgba(20,184,166,0.05), transparent 60%), #F8FAFC',
      }}
    >
      <RegistrationConsentGate agreed={!!profile.terms_agreed_at} isCoordinator={false} />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col clay-card m-3 rounded-2xl overflow-hidden">
        <div className="px-4 py-5 border-b border-black/[0.06]">
          <Image src="/logo.svg" alt="SkillFleet" width={120} height={32} className="h-8 w-auto" priority />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PlatformNav profile={profile} cartCount={cartCount} switchTargets={switchTargets} />
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <MobileNavDrawer>
        <PlatformNav profile={profile} cartCount={cartCount} switchTargets={switchTargets} />
      </MobileNavDrawer>

      {/* Main content — centered in a consistent content frame */}
      {/*
        The floating assistant is fixed to the viewport, so on a phone it sits
        on top of whatever is at the bottom of the page — which on ISC is the
        Submit entry button. The extra bottom padding lets every page scroll
        clear of it. It is only needed where the button floats over content.
      */}
      <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* Floating assistant — available on every page */}
      {profile.role === 'student' && (
        <ChatWidget
          firstName={profile.full_name?.split(' ')[0] ?? 'you'}
          siblingNames={switchTargets.map((t) => t.full_name?.split(' ')[0] ?? 'them')}
        />
      )}
    </div>
  )
}
