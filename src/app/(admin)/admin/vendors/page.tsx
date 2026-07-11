import { createClient } from '@/lib/supabase/server'
import { Store } from 'lucide-react'
import { AddVendorForm } from '@/components/admin/add-vendor-form'

interface VendorRow {
  id: string
  org_name: string
  contact_phone: string | null
  is_active: boolean
  created_at: string
}

export default async function AdminVendorsPage() {
  const supabase = await createClient()

  const [{ data: vendors }, { data: vendorOfferings }] = await Promise.all([
    supabase.from('vendors').select('id, org_name, contact_phone, is_active, created_at').order('created_at', { ascending: false }) as unknown as Promise<{ data: VendorRow[] | null }>,
    supabase.from('offerings').select('vendor_id, review_status').eq('source', 'vendor') as unknown as Promise<{
      data: { vendor_id: string | null; review_status: string }[] | null
    }>,
  ])

  const rows = vendors ?? []
  const offs = vendorOfferings ?? []
  const countFor = (id: string) => {
    const mine = offs.filter((o) => o.vendor_id === id)
    return { total: mine.length, pending: mine.filter((o) => o.review_status === 'pending').length }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center text-white shrink-0">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted">Partners who list activities on SkillFleet.</p>
        </div>
      </div>

      <AddVendorForm />

      <div className="space-y-2">
        <h2 className="font-display text-lg font-bold text-foreground">All vendors ({rows.length})</h2>
        {rows.length === 0 ? (
          <div className="clay-card p-8 text-center text-muted text-sm">No vendors yet.</div>
        ) : (
          <div className="clay-card divide-y divide-black/[0.06]">
            {rows.map((v) => {
              const c = countFor(v.id)
              return (
                <div key={v.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{v.org_name}</p>
                    <p className="text-xs text-muted">
                      {c.total} listing{c.total === 1 ? '' : 's'}
                      {c.pending > 0 && <span className="text-accent-yellow font-semibold"> · {c.pending} pending review</span>}
                      {v.contact_phone && ` · ${v.contact_phone}`}
                    </p>
                  </div>
                  {!v.is_active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/[0.06] text-muted">Inactive</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
