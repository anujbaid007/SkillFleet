import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, ArrowRight, Baby, Wand2, CalendarRange } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { OFFERING_TYPE_META, OFFERING_STATUS_META } from '@/lib/offering-meta'
import { RefreshButton } from '@/components/recommendations/refresh-button'
import { ShortlistButton } from '@/components/recommendations/shortlist-button'
import { ChildSelector } from '@/components/recommendations/child-selector'
import type { RecommendationItem } from '@/lib/recommender/types'

interface RunRow {
  id: string
  generated_at: string
  model: string
  summary: string | null
  items: RecommendationItem[]
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>
}) {
  const { child } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name, date_of_birth')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'student' && profile.role !== 'parent')) redirect('/dashboard')

  const isParent = profile.role === 'parent'
  let targetStudentId = user.id
  let targetName = profile.full_name?.split(' ')[0] ?? 'you'
  let children: { student_id: string; full_name: string | null }[] = []

  if (isParent) {
    const { data: kids } = await supabase.rpc('get_my_children')
    children = (kids ?? []).map((k) => ({ student_id: k.student_id, full_name: k.full_name }))

    if (children.length === 0) {
      return (
        <div className="space-y-7">
          <PageHeader
            eyebrow="Grow with intent"
            icon={Sparkles}
            title="Recommendations"
            subtitle="Personalised, explainable activity picks that target each child's growth gaps."
          />
          <div className="clay-card p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Baby className="w-7 h-7 text-primary" />
            </div>
            <p className="font-display font-bold text-foreground">Link a child first</p>
            <p className="text-muted text-sm max-w-xs mx-auto">
              Recommendations are built from a child&apos;s growth profile. Link one to get started.
            </p>
            <Link
              href="/children"
              className="inline-flex items-center gap-1.5 clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
            >
              Link a child <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )
    }

    targetStudentId = child && children.some((c) => c.student_id === child) ? child : children[0].student_id
    targetName = children.find((c) => c.student_id === targetStudentId)?.full_name?.split(' ')[0] ?? 'your child'
  }

  const { data: runRow } = (await supabase
    .from('recommendation_runs')
    .select('id, generated_at, model, summary, items')
    .eq('student_id', targetStudentId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()) as unknown as { data: RunRow | null }

  const items = (runRow?.items ?? []) as RecommendationItem[]

  // Offering meta (type/price/status) for the recommended items.
  const offeringIds = items.map((i) => i.offering_id)
  const offeringMeta = new Map<string, { type: string; price_paise: number; status: string }>()
  if (offeringIds.length > 0) {
    const { data: offs } = await supabase
      .from('offerings')
      .select('id, type, price_paise, status')
      .in('id', offeringIds)
    for (const o of offs ?? []) offeringMeta.set(o.id, { type: o.type, price_paise: o.price_paise, status: o.status })
  }

  // Shortlist (student's own, or a parent reading their linked child's).
  const { data: shortRows } = await supabase.from('student_shortlist').select('offering_id').eq('student_id', targetStudentId)
  const shortlisted = new Set((shortRows ?? []).map((r) => r.offering_id))

  const usedLLM = runRow != null && runRow.model !== 'fallback'

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Grow with intent"
        icon={Sparkles}
        title="Recommendations"
        subtitle={
          isParent
            ? 'Explainable activity picks that target each child’s growth gaps — you decide what to book.'
            : 'Activity picks that target your growth gaps. Shortlist the ones you like for a parent to book.'
        }
      />

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {isParent ? (
          <ChildSelector children={children} selectedId={targetStudentId} />
        ) : (
          <span className="text-sm text-muted">Based on your growth profile</span>
        )}
        <RefreshButton studentId={targetStudentId} hasRun={runRow != null} />
      </div>

      {isParent && (
        <Reveal>
          <Link
            href={`/recommendations/plan?child=${targetStudentId}`}
            className="clay-card p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-transform relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/[0.07] to-primary/[0.05] pointer-events-none" />
            <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-teal to-primary flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div className="relative z-10 flex-1 min-w-0">
              <p className="font-display font-bold text-foreground">Plan {targetName}&apos;s whole year</p>
              <p className="text-sm text-muted">
                Build a balanced set of activities across the year — perfect for filling a package.
              </p>
            </div>
            <ArrowRight className="relative z-10 w-5 h-5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </Reveal>
      )}

      {!runRow ? (
        <Reveal>
          <GradientCard className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Wand2 className="w-7 h-7 text-white" />
            </div>
            <p className="font-display text-xl font-bold text-white">No suggestions yet</p>
            <p className="text-white/80 text-sm mt-2 max-w-sm mx-auto">
              Generate {isParent ? `${targetName}’s` : 'your'} first set of recommendations — we&apos;ll analyse the
              growth profile and suggest activities that close the biggest gaps.
            </p>
          </GradientCard>
        </Reveal>
      ) : (
        <>
          {/* Summary */}
          <Reveal>
            <div className="clay-card p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {usedLLM ? 'AI advisor' : 'Rules-based'}
                  </span>
                  <span className="text-xs text-muted">Updated {fmtDateTime(runRow.generated_at)}</span>
                </div>
                <p className="text-foreground leading-relaxed">{runRow.summary}</p>
              </div>
            </div>
          </Reveal>

          {/* Items */}
          {items.length === 0 ? (
            <Reveal delay={0.05}>
              <div className="clay-card p-8 text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-accent-teal/10 flex items-center justify-center mx-auto text-2xl">🎉</div>
                <p className="font-display font-bold text-foreground">
                  {isParent ? `${targetName} is` : 'You’re'} on track everywhere
                </p>
                <p className="text-muted text-sm max-w-sm mx-auto">
                  No pressing gaps right now. Browse Explore for enrichment, or check back after the next completed
                  activity.
                </p>
                <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
                  Browse Explore <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => {
                const meta = OFFERING_TYPE_META[offeringMeta.get(item.offering_id)?.type ?? '']
                const Icon = meta?.icon
                const off = offeringMeta.get(item.offering_id)
                const status = off && off.status !== 'live' ? OFFERING_STATUS_META[off.status] : null
                const isShort = shortlisted.has(item.offering_id)
                return (
                  <Reveal key={item.offering_id} delay={Math.min(i * 0.05, 0.3)}>
                    <div className="clay-card p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-display font-bold text-sm flex items-center justify-center">
                            {item.rank}
                          </span>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                          {Icon && <Icon className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2.5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/catalog/${item.offering_id}`} className="font-display font-bold text-foreground hover:text-primary transition-colors">
                                {item.title}
                              </Link>
                              {status && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.badge}`}>{status.label}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted mt-0.5">
                              {meta?.label ?? 'Activity'}{off ? ` · ${formatPrice(off.price_paise)}` : ''}
                            </p>
                          </div>

                          <p className="text-sm text-foreground/80 leading-relaxed">{item.reason}</p>

                          {item.parameters.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {item.parameters.map((p) => (
                                <span key={p.id} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-teal/10 text-accent-teal">
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2.5 flex-wrap pt-1">
                            {isParent ? (
                              <>
                                <Link
                                  href={`/catalog/${item.offering_id}`}
                                  className="clay-button bg-cta text-white px-4 h-9 text-sm font-semibold inline-flex items-center gap-1.5"
                                >
                                  Book <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                                {isShort && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-yellow">
                                    ★ {targetName} shortlisted this
                                  </span>
                                )}
                              </>
                            ) : (
                              <ShortlistButton offeringId={item.offering_id} shortlisted={isShort} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
