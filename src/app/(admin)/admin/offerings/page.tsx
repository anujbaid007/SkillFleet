import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { archiveOfferingAction, goLiveOfferingAction } from './actions'
import { Reveal } from '@/components/ui/reveal'
import { PageHeader } from '@/components/ui/page-header'
import { OfferingReviewControls } from '@/components/admin/offering-review-controls'
import { Package, Bell, Store } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  live: 'bg-green-50 text-green-700',
  planned: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-blue-50 text-blue-700',
  retired: 'bg-black/[0.06] text-muted',
}

const REVIEW_STYLE: Record<string, string> = {
  pending: 'bg-accent-yellow/15 text-accent-yellow',
  rejected: 'bg-red-50 text-red-600',
}

const TYPE_LABEL: Record<string, string> = {
  workshop: 'Workshop',
  trip: 'Trip',
  event: 'Event',
  competition: 'Competition',
  internship: 'Internship',
}

interface RawOffering {
  id: string
  title: string
  type: string
  status: string
  price_paise: number
  scheduled_at: string | null
  interest_count: number
  interest_threshold: number
  source: string
  vendor_id: string | null
  review_status: string
  topics: { name: string; categories: { name: string } | null } | null
}

function formatPrice(p: number) {
  return p === 0 ? 'Free' : `₹${(p / 100).toLocaleString('en-IN')}`
}

export default async function OfferingsPage() {
  const supabase = await createClient()

  const [{ data: offerings }, { data: vendors }] = await Promise.all([
    supabase
      .from('offerings')
      .select('id, title, type, status, price_paise, scheduled_at, interest_count, interest_threshold, source, vendor_id, review_status, topics(name, categories(name))')
      .order('status')
      .order('scheduled_at', { ascending: true }) as unknown as Promise<{ data: RawOffering[] | null }>,
    supabase.from('vendors').select('id, org_name') as unknown as Promise<{ data: { id: string; org_name: string }[] | null }>,
  ])

  const orgName = new Map((vendors ?? []).map((v) => [v.id, v.org_name]))
  const all = offerings ?? []
  const pendingReview = all.filter((o) => o.source === 'vendor' && o.review_status === 'pending')
  const rest = all.filter((o) => !(o.source === 'vendor' && o.review_status === 'pending'))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        icon={Package}
        title="Offerings"
        subtitle="All offerings across all statuses."
        action={
          <Link
            href="/admin/offerings/new"
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            + New Offering
          </Link>
        }
      />

      {/* Vendor review queue */}
      {pendingReview.length > 0 && (
        <Reveal>
          <div className="clay-card overflow-hidden">
            <div className="px-5 py-3 bg-accent-yellow/[0.08] border-b border-black/[0.06] flex items-center gap-2">
              <Store className="w-4 h-4 text-accent-yellow" />
              <span className="text-sm font-bold text-foreground">Pending vendor review ({pendingReview.length})</span>
            </div>
            <div className="divide-y divide-black/[0.06]">
              {pendingReview.map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-5 py-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted">{TYPE_LABEL[o.type] ?? o.type}</span>
                      <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                        <Store className="w-3 h-3" /> {o.vendor_id ? orgName.get(o.vendor_id) ?? 'Vendor' : 'Vendor'}
                      </span>
                    </div>
                    <p className="font-medium text-foreground text-sm truncate">{o.title}</p>
                    <p className="text-xs text-muted">{formatPrice(o.price_paise)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/admin/offerings/${o.id}/edit`} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors">
                      View
                    </Link>
                    <OfferingReviewControls offeringId={o.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {rest.length === 0 && pendingReview.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No offerings yet. Create the first one.</div>
      ) : (
        <Reveal>
          <div className="clay-card divide-y divide-black/[0.06]">
            {rest.map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[o.status] ?? ''}`}>{o.status}</span>
                    {o.review_status !== 'approved' && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${REVIEW_STYLE[o.review_status] ?? ''}`}>{o.review_status}</span>
                    )}
                    <span className="text-xs text-muted">{TYPE_LABEL[o.type] ?? o.type}</span>
                    {o.source === 'vendor' && o.vendor_id && (
                      <span className="text-xs text-primary font-semibold inline-flex items-center gap-1">
                        <Store className="w-3 h-3" /> {orgName.get(o.vendor_id) ?? 'Vendor'}
                      </span>
                    )}
                    {o.topics?.categories && <span className="text-xs text-muted">· {o.topics.categories.name}</span>}
                  </div>
                  <p className="font-medium text-foreground text-sm truncate">{o.title}</p>
                  <p className="text-xs text-muted">
                    {formatPrice(o.price_paise)}
                    {o.scheduled_at && ` · ${new Date(o.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                  {o.status === 'planned' && o.source !== 'vendor' && (
                    <p className={`text-xs font-semibold inline-flex items-center gap-1 mt-0.5 ${o.interest_count >= o.interest_threshold ? 'text-green-600' : 'text-accent-yellow'}`}>
                      <Bell className="w-3 h-3" /> {o.interest_count} of {o.interest_threshold} interested
                      {o.interest_count >= o.interest_threshold && ' · ready to launch'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {o.status === 'planned' && o.source !== 'vendor' && (
                    <form action={goLiveOfferingAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <button type="submit" className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">
                        Go live
                      </button>
                    </form>
                  )}
                  {o.source !== 'vendor' && (
                    <Link href={`/admin/offerings/${o.id}/edit`} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors">
                      Edit
                    </Link>
                  )}
                  {o.status !== 'retired' && (
                    <form action={archiveOfferingAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <button type="submit" className="px-3 py-1.5 rounded-lg border border-black/10 text-muted text-xs font-medium hover:text-red-600 hover:border-red-200 transition-colors">
                        Archive
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}
