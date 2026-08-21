import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Megaphone, Bell, ArrowRight, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'
import { RequestForm } from '@/components/requests/request-form'
import { SupportButton } from '@/components/requests/support-button'

interface WatchRow {
  offering_id: string
  offerings: {
    id: string
    title: string
    type: string
    status: string
    interest_count: number
    interest_threshold: number
  } | null
}

interface RequestRow {
  id: string
  title: string
  description: string | null
  status: string
  support_count: number
  requester_id: string
  categories: { name: string } | null
}

const REQUEST_STATUS_META: Record<string, { label: string; badge: string }> = {
  open: { label: 'Gathering interest', badge: 'bg-accent-yellow/15 text-accent-yellow' },
  planned: { label: 'Planned', badge: 'bg-primary/10 text-primary' },
  fulfilled: { label: 'Now available', badge: 'bg-green-50 text-green-700' },
}

export default async function RequestsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin') redirect('/admin/requests')
  if (profile?.role !== 'student') redirect('/dashboard')

  const [{ data: watch }, { data: requests }, { data: mySupport }, { data: categories }] = await Promise.all([
    supabase
      .from('offering_interest')
      .select('offering_id, offerings(id, title, type, status, interest_count, interest_threshold)')
      .eq('user_id', user.id) as unknown as Promise<{ data: WatchRow[] | null }>,
    supabase
      .from('offering_requests')
      .select('id, title, description, status, support_count, requester_id, categories(name)')
      .neq('status', 'declined')
      .order('support_count', { ascending: false })
      .limit(50) as unknown as Promise<{ data: RequestRow[] | null }>,
    supabase.from('offering_request_supporters').select('request_id').eq('user_id', user.id) as unknown as Promise<{
      data: { request_id: string }[] | null
    }>,
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
  ])

  const supportedIds = new Set((mySupport ?? []).map((s) => s.request_id))
  const watchRows = (watch ?? []).filter((w) => w.offerings)
  const requestRows = requests ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Shape the catalogue"
        icon={Megaphone}
        title="Requests & watchlist"
        subtitle="Get notified when planned activities go live, and tell us what you'd like us to run next."
      />

      {/* Watchlist */}
      {watchRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Your watchlist</h2>
          <div className="space-y-3">
            {watchRows.map((w, i) => {
              const o = w.offerings!
              const meta = OFFERING_TYPE_META[o.type]
              const Icon = meta?.icon
              const isLive = o.status === 'live'
              const pct = o.interest_threshold > 0 ? Math.min(100, Math.round((o.interest_count / o.interest_threshold) * 100)) : 0
              return (
                <Reveal key={w.offering_id} delay={Math.min(i * 0.05, 0.3)}>
                  <div className="clay-card p-4 flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-foreground text-sm truncate">{o.title}</p>
                      {isLive ? (
                        <p className="text-xs text-green-600 font-semibold inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Now live — ready to book!
                        </p>
                      ) : (
                        <div className="mt-1.5 max-w-xs">
                          <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent-teal" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[11px] text-muted mt-1">{o.interest_count} of {o.interest_threshold} interested</p>
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/catalog/${o.id}`}
                      className={`shrink-0 inline-flex items-center gap-1 text-sm font-semibold ${isLive ? 'clay-button bg-cta text-white px-4 h-9' : 'text-primary hover:underline'}`}
                    >
                      {isLive ? 'Book' : 'View'} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>
      )}

      {/* Submit a request */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Request an offering</h2>
          <p className="text-sm text-muted">Can’t find what you want? Tell us — if enough families want it, we’ll run it.</p>
        </div>
        <Reveal>
          <RequestForm categories={categories ?? []} />
        </Reveal>
      </section>

      {/* Community requests */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Community requests</h2>
        {requestRows.length === 0 ? (
          <div className="clay-card p-8 text-center text-muted text-sm">
            No requests yet — be the first to suggest something above.
          </div>
        ) : (
          <div className="space-y-3">
            {requestRows.map((r, i) => {
              const meta = REQUEST_STATUS_META[r.status]
              const isRequester = r.requester_id === user.id
              return (
                <Reveal key={r.id} delay={Math.min(i * 0.04, 0.3)}>
                  <div className="clay-card p-4 flex items-start gap-4">
                    <SupportButton
                      requestId={r.id}
                      supporting={supportedIds.has(r.id)}
                      total={r.support_count}
                      isRequester={isRequester}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display font-bold text-foreground text-sm">{r.title}</p>
                        {meta && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>}
                        {isRequester && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/[0.05] text-muted">Yours</span>}
                      </div>
                      {r.categories?.name && <p className="text-xs text-muted mt-0.5">{r.categories.name}</p>}
                      {r.description && <p className="text-xs text-muted mt-1 line-clamp-2">{r.description}</p>}
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
