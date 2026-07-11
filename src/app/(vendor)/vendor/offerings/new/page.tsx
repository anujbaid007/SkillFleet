import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { OfferingForm } from '@/components/admin/offering-form'
import { vendorCreateOfferingAction } from '../actions'

export default async function VendorNewOfferingPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: topics }, { data: parameters }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('topics').select('id, name, category_id').eq('is_active', true).order('display_order'),
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
  ])

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/vendor/offerings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to My Offerings
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">List a new activity</h1>
        <p className="text-sm text-muted mt-1">Tag at least one skill it develops. We&apos;ll review it before it goes live.</p>
      </div>
      <OfferingForm
        action={vendorCreateOfferingAction}
        vendorMode
        categories={categories ?? []}
        topics={topics ?? []}
        parameters={parameters ?? []}
      />
    </div>
  )
}
