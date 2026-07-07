import { createClient } from '@/lib/supabase/server'
import { OfferingForm } from '@/components/admin/offering-form'
import { createOfferingAction } from '../actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewOfferingPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: topics }, { data: parameters }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('topics').select('id, name, category_id').eq('is_active', true).order('display_order'),
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
  ])

  return (
    <div className="space-y-6">
      <Link
        href="/admin/offerings"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Offerings
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground">New Offering</h1>
      <OfferingForm
        action={createOfferingAction}
        categories={categories ?? []}
        topics={topics ?? []}
        parameters={parameters ?? []}
      />
    </div>
  )
}
