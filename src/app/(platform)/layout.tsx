import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PlatformNav } from '@/components/platform/platform-nav'
import { MobileNavDrawer } from '@/components/mobile-nav-drawer'
import { isStudentDetailsComplete } from '@/lib/profile/details'

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Admin and vendor have their own consoles
  if (profile.role === 'admin') redirect('/admin')
  if (profile.role === 'vendor') redirect('/vendor')

  // Students must give their required details before using the platform.
  if (profile.role === 'student' && !isStudentDetailsComplete(profile)) {
    redirect('/onboarding/details')
  }

  return (
    <div
      className="flex flex-col md:flex-row h-screen"
      style={{
        background:
          'radial-gradient(1100px 550px at 100% 0%, rgba(116,71,225,0.06), transparent 60%), radial-gradient(900px 500px at 0% 100%, rgba(20,184,166,0.05), transparent 60%), #F8FAFC',
      }}
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col clay-card m-3 rounded-2xl overflow-hidden">
        <div className="px-4 py-5 border-b border-black/[0.06]">
          <Image src="/logo.svg" alt="SkillFleet" width={120} height={32} className="h-8 w-auto" priority />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PlatformNav profile={profile} />
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <MobileNavDrawer>
        <PlatformNav profile={profile} />
      </MobileNavDrawer>

      {/* Main content — centered in a consistent content frame */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
