import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { toggleTierAction } from './actions'

interface RawTier {
  id: string
  name: string
  slot_count: number
  price_paise: number
  validity_days: number
  description: string | null
  is_active: boolean
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export default async function AdminPackagesPage() {
  const supabase = await createClient()
  const { data: tiers } = (await supabase
    .from('package_tiers')
    .select('id, name, slot_count, price_paise, validity_days, description, is_active')
    .order('display_order')) as unknown as { data: RawTier[] | null }

  const rows = tiers ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Catalog"
        icon={Layers}
        title="Packages"
        subtitle="Annual package tiers parents can buy for a child. Each slot redeems one booking."
        action={
          <Link
            href="/admin/packages/new"
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            + New Tier
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No package tiers yet. Create the first one.</div>
      ) : (
        <Reveal delay={0.05}>
          <div className="clay-card divide-y divide-black/[0.06]">
            {rows.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center text-white shrink-0 font-display font-bold">
                  {t.slot_count}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-display font-bold text-sm ${t.is_active ? 'text-foreground' : 'line-through text-muted'}`}>
                    {t.name}
                  </p>
                  <p className="text-xs text-muted">
                    {t.slot_count} slots · {formatPrice(t.price_paise)} · valid {t.validity_days} days
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/packages/${t.id}/edit`}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
                  >
                    Edit
                  </Link>
                  <form action={toggleTierAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="is_active" value={String(t.is_active)} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg border border-black/10 text-muted text-xs font-medium hover:text-foreground transition-colors"
                    >
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}
