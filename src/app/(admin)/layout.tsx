import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { getCurrentProfile, getCurrentUser } from '@/lib/supabase/session'
import { AdminNav } from '@/components/admin/admin-nav'
import { GlobalSearch } from '@/components/admin/global-search'
import { MobileNavDrawer } from '@/components/mobile-nav-drawer'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const profile = await getCurrentProfile()

  // The role check the proxy does not do — the proxy only checks that somebody
  // is signed in. It stays here so the shell itself is never drawn for a
  // non-admin, but it is NOT what protects the pages: a layout does not control
  // whether its route segments render, so every page under admin/ awaits
  // requireAdmin() too. See src/lib/admin/guard.ts. Read through the same
  // request-memoised helpers that guard uses, so the two checks are one lookup.
  if (profile?.role !== 'admin') redirect('/')

  return (
    <div
      className="flex flex-col md:flex-row h-screen"
      style={{
        background:
          'radial-gradient(1100px 550px at 100% 0%, rgba(116,71,225,0.05), transparent 60%), radial-gradient(900px 500px at 0% 100%, rgba(20,184,166,0.04), transparent 60%), #F8FAFC',
      }}
    >
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-black/[0.06]">
        <div className="px-4 py-5 border-b border-black/[0.06]">
          <Image src="/logo.svg" alt="SkillFleet Admin" width={120} height={32} className="h-8 w-auto" priority />
          <span className="mt-1 block text-xs font-medium text-muted uppercase tracking-wider">
            Admin
          </span>
        </div>
        {/* Global search sits above the nav, so it reads as the header for this shell. */}
        <div className="px-3 pt-3">
          <GlobalSearch />
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <MobileNavDrawer subtitle="Admin">
        <AdminNav />
      </MobileNavDrawer>

      {/* Same search box, full width under the mobile top bar -- there is no
          room for it in that bar's logo-and-menu-button row. */}
      <div className="md:hidden border-b border-black/[0.06] bg-white px-4 py-3">
        <GlobalSearch />
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  )
}
