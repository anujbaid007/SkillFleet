import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { VendorNav } from '@/components/vendor/vendor-nav'
import { MobileNavDrawer } from '@/components/mobile-nav-drawer'

export default async function VendorLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'vendor') redirect('/')

  const { data: vendor } = await supabase.from('vendors').select('org_name').eq('id', user.id).single()
  const orgName = vendor?.org_name ?? 'Vendor'

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
          <Image src="/logo.svg" alt="SkillFleet" width={120} height={32} className="h-8 w-auto" priority />
          <span className="mt-1 block text-xs font-medium text-muted uppercase tracking-wider truncate">{orgName}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <VendorNav />
        </div>
      </aside>

      <MobileNavDrawer subtitle={orgName}>
        <VendorNav />
      </MobileNavDrawer>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
