import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OfferingForm } from '@/components/admin/offering-form'
import { vendorUpdateOfferingAction } from '../../actions'

interface RawContribution {
  parameter_id: string
  points: number
}

export default async function VendorEditOfferingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  const o = offeringRes.data
  // RLS only returns the vendor's own offerings; guard the ownership anyway.
  if (!o || o.vendor_id !== user.id) notFound()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/vendor/offerings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to My Offerings
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground">Edit offering</h1>

      {o.review_status === 'rejected' && o.review_notes && (
        <div className="clay-card p-4 flex items-start gap-3 bg-red-50/50">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground text-sm">Changes requested</p>
            <p className="text-sm text-muted mt-0.5">{o.review_notes}</p>
          </div>
        </div>
      )}
      <p className="text-xs text-muted">Saving changes sends this listing back for review.</p>

      <OfferingForm
        action={vendorUpdateOfferingAction}
        offeringId={id}
        vendorMode
        categories={catsRes.data ?? []}
        topics={topicsRes.data ?? []}
        parameters={paramsRes.data ?? []}
        initial={{
          title: o.title,
          description: o.description ?? '',
          type: o.type,
          topic_id: o.topic_id ?? '',
          price_paise: o.price_paise,
          min_age: o.min_age,
          max_age: o.max_age,
          scheduled_at: o.scheduled_at,
          duration_minutes: o.duration_minutes,
          location: o.location ?? '',
          mode: o.mode ?? '',
          image_url: o.image_url ?? '',
          contributions: contribsRes.data ?? [],
        }}
      />
    </div>
  )
}
