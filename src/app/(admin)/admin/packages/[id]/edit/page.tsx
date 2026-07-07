import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PackageTierForm } from '@/components/admin/package-tier-form'
import { updateTierAction } from '../../actions'

export default async function EditPackageTierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: tier } = await supabase.from('package_tiers').select('*').eq('id', id).single()

  if (!tier) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/packages"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Packages
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground">Edit Package Tier</h1>
      <PackageTierForm
        action={updateTierAction}
        tierId={id}
        initial={{
          name: tier.name,
          slot_count: tier.slot_count,
          price_paise: tier.price_paise,
          validity_days: tier.validity_days,
          description: tier.description ?? '',
          is_active: tier.is_active,
        }}
      />
    </div>
  )
}
