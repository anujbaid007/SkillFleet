import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Package, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'

interface Row {
  id: string
  title: string
  type: string
  status: string
  review_status: string
  review_notes: string | null
  price_paise: number
}

const REVIEW_META: Record<string, { label: string; badge: string; icon: typeof Clock }> = {
  pending: { label: 'Pending review', badge: 'bg-accent-yellow/15 text-accent-yellow', icon: Clock },
  approved: { label: 'Approved & live', badge: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Needs changes', badge: 'bg-red-50 text-red-600', icon: XCircle },
}

function formatPrice(p: number) {
  return p === 0 ? 'Free' : `₹${(p / 100).toLocaleString('en-IN')}`
}

export default async function VendorOfferingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: offerings } = (await supabase
    .from('offerings')
    .select('id, title, type, status, review_status, review_notes, price_paise')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false })) as unknown as { data: Row[] | null }

  const rows = offerings ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center text-white shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">My Offerings</h1>
            <p className="text-sm text-muted">Your listings and their review status.</p>
          </div>
        </div>
        <Link
          href="/vendor/offerings/new"
          className="clay-button bg-cta text-white px-5 h-11 text-sm font-semibold inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New offering
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="clay-card p-10 text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <p className="font-display font-bold text-foreground">No listings yet</p>
          <p className="text-muted text-sm max-w-xs mx-auto">Create your first activity — it goes to our team for review before families see it.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((o, i) => {
            const meta = OFFERING_TYPE_META[o.type]
            const Icon = meta?.icon
            const review = REVIEW_META[o.review_status] ?? REVIEW_META.pending
            const ReviewIcon = review.icon
            return (
              <Reveal key={o.id} delay={Math.min(i * 0.05, 0.3)}>
                <div className="clay-card p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display font-bold text-foreground text-sm truncate">{o.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${review.badge}`}>
                          <ReviewIcon className="w-3 h-3" /> {review.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {meta?.label ?? o.type} · {formatPrice(o.price_paise)}
                      </p>
                    </div>
                    <Link
                      href={`/vendor/offerings/${o.id}/edit`}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                  {o.review_status === 'rejected' && o.review_notes && (
                    <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      <span className="font-semibold">Reviewer note:</span> {o.review_notes}
                    </p>
                  )}
                </div>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}
