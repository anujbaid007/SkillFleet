import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OfferingForm } from '@/components/admin/offering-form'
import { updateOfferingAction } from '../../actions'

interface RawContribution {
  parameter_id: string
  points: number
}

export default async function EditOfferingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [offeringRes, catsRes, topicsRes, paramsRes, contribsRes] = await Promise.all([
    supabase.from('offerings').select('*').eq('id', id).single(),
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('topics').select('id, name, category_id').eq('is_active', true).order('display_order'),
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
    supabase
      .from('offering_parameter_contributions')
      .select('parameter_id, points')
      .eq('offering_id', id) as unknown as { data: RawContribution[] | null },
  ])

  if (!offeringRes.data) notFound()
  const o = offeringRes.data

  return (
    <div className="space-y-6">
      <Link
        href="/admin/offerings"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Offerings
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground">Edit Offering</h1>
      <OfferingForm
        action={updateOfferingAction}
        offeringId={id}
        categories={catsRes.data ?? []}
        topics={topicsRes.data ?? []}
        parameters={paramsRes.data ?? []}
        initial={{
          title: o.title,
          description: o.description ?? '',
          type: o.type,
          status: o.status,
          topic_id: o.topic_id ?? '',
          price_paise: o.price_paise,
          min_age: o.min_age,
          max_age: o.max_age,
          scheduled_at: o.scheduled_at,
          duration_minutes: o.duration_minutes,
          location: o.location ?? '',
          mode: o.mode ?? '',
          contributions: contribsRes.data ?? [],
        }}
      />
    </div>
  )
}
