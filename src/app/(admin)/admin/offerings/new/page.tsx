import { createClient } from '@/lib/supabase/server'
import { OfferingForm } from '@/components/admin/offering-form'
import { createOfferingAction } from '../actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/guard'

export default async function NewOfferingPage({
  searchParams,
}: {
  searchParams: Promise<{ from_request?: string }>
}) {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
  const { from_request } = await searchParams
  const supabase = await createClient()

  const [{ data: categories }, { data: topics }, { data: parameters }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('topics').select('id, name, category_id').eq('is_active', true).order('display_order'),
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
  ])

  // Prefill from a demand request → default it to a "planned" offering.
  let initial: { title?: string; description?: string; status?: string } | undefined
  if (from_request) {
    const { data: req } = await supabase
      .from('offering_requests')
      .select('title, description')
      .eq('id', from_request)
      .single()
    if (req) initial = { title: req.title, description: req.description ?? '', status: 'planned' }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
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
        initial={initial}
      />
    </div>
  )
}
