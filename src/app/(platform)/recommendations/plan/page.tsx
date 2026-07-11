import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarRange, Sparkles, Baby, Layers } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { OFFERING_TYPE_META, OFFERING_STATUS_META } from '@/lib/offering-meta'
import { ChildSelector } from '@/components/recommendations/child-selector'
import { PlanBuilder } from '@/components/recommendations/plan-builder'
import { BookPlanButton } from '@/components/recommendations/book-plan-button'
import type { RecommendationItem } from '@/lib/recommender/types'

interface PlanRow {
  id: string
  generated_at: string
  target_size: number
  model: string
  summary: string | null
  price_total_paise: number
  items: RecommendationItem[]
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export default async function CurriculumPlanPage({
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

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  // Planning a year is a parent action; students view suggestions on /recommendations.
  if (profile?.role !== 'parent') redirect('/recommendations')

  const { data: kids } = await supabase.rpc('get_my_children')
  const children = (kids ?? []).map((k) => ({ student_id: k.student_id, full_name: k.full_name }))

  if (children.length === 0) {
    return (
      <div className="space-y-7">
        <PageHeader eyebrow="Plan the year" icon={CalendarRange} title="Plan my year" subtitle="Assemble a balanced year of activities for a child." />
        <div className="clay-card p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Baby className="w-7 h-7 text-primary" />
          </div>
          <p className="font-display font-bold text-foreground">Link a child first</p>
          <Link href="/children" className="inline-flex items-center gap-1.5 clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold">
            Link a child <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const targetStudentId = child && children.some((c) => c.student_id === child) ? child : children[0].student_id
  const childName = children.find((c) => c.student_id === targetStudentId)?.full_name?.split(' ')[0] ?? 'your child'

  // Latest plan + an active package (for default size + redeem-all).
  const nowMs = Date.now()
  const [{ data: planRow }, { data: pkgs }] = await Promise.all([
    supabase
      .from('curriculum_plans')
      .select('id, generated_at, target_size, model, summary, price_total_paise, items')
      .eq('student_id', targetStudentId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as Promise<{ data: PlanRow | null }>,
    supabase
      .from('packages')
      .select('id, slot_count, slots_used, valid_until')
      .eq('student_id', targetStudentId)
      .eq('status', 'active')
      .eq('payment_status', 'paid') as unknown as Promise<{
      data: { id: string; slot_count: number; slots_used: number; valid_until: string | null }[] | null
    }>,
  ])

  const activePkg = (pkgs ?? [])
    .map((p) => ({ ...p, remaining: Math.max(0, p.slot_count - p.slots_used) }))
    .find((p) => p.remaining > 0 && (p.valid_until == null || new Date(p.valid_until).getTime() > nowMs))

  const defaultSize = activePkg ? activePkg.remaining : 6
  const items = (planRow?.items ?? []) as RecommendationItem[]

  const offeringMeta = new Map<string, { type: string; price_paise: number; status: string }>()
  if (items.length > 0) {
    const { data: offs } = await supabase.from('offerings').select('id, type, price_paise, status').in('id', items.map((i) => i.offering_id))
    for (const o of offs ?? []) offeringMeta.set(o.id, { type: o.type, price_paise: o.price_paise, status: o.status })
  }

  // Which live, still-bookable offerings can be redeemed together.
  const bookableIds = items.map((i) => i.offering_id).filter((id) => offeringMeta.get(id)?.status === 'live')

  // Balance view: how many activities touch each parameter.
  const balance = new Map<string, number>()
  for (const it of items) for (const p of it.parameters) balance.set(p.name, (balance.get(p.name) ?? 0) + 1)
  const balanceRows = [...balance.entries()].sort((a, b) => b[1] - a[1])

  const usedLLM = planRow != null && planRow.model !== 'fallback'

  return (
    <div className="space-y-7 max-w-4xl">
      <Link href="/recommendations" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Recommendations
      </Link>

      <PageHeader
        eyebrow="Plan the year"
        icon={CalendarRange}
        title="Plan my year"
        subtitle={`A balanced year of activities for ${childName}, chosen to lift the biggest growth gaps.`}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ChildSelector children={children} selectedId={targetStudentId} basePath="/recommendations/plan" />
        {activePkg && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5">
            <Layers className="w-3.5 h-3.5" /> {activePkg.remaining} package slot{activePkg.remaining === 1 ? '' : 's'} available
          </span>
        )}
      </div>

      <PlanBuilder studentId={targetStudentId} defaultSize={defaultSize} hasPlan={planRow != null} />

      {planRow && items.length > 0 && (
        <>
          <Reveal>
            <GradientCard className="p-6 sm:p-7">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {usedLLM ? 'AI advisor' : 'Rules-based'}
                </span>
                <span className="text-xs text-white/70">Updated {fmtDateTime(planRow.generated_at)}</span>
              </div>
              <p className="text-white text-lg leading-relaxed">{planRow.summary}</p>
              <div className="mt-4 flex items-center gap-4 flex-wrap text-white/85 text-sm">
                <span className="font-display font-bold text-white">{items.length} activities</span>
                <span>Full year ≈ {formatPrice(planRow.price_total_paise)}</span>
              </div>
              {balanceRows.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {balanceRows.map(([name, count]) => (
                    <span key={name} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/15 text-white">
                      {name} ×{count}
                    </span>
                  ))}
                </div>
              )}
            </GradientCard>
          </Reveal>

          {/* Booking bar */}
          <Reveal delay={0.05}>
            <div className="clay-card p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="font-display font-bold text-foreground">Ready to book the year?</p>
                <p className="text-sm text-muted">
                  {activePkg
                    ? `Redeem the plan against ${childName}’s package, or book any activity on its own.`
                    : 'Book each activity below — or buy a package to redeem the whole year in one go.'}
                </p>
              </div>
              {activePkg ? (
                <BookPlanButton packageId={activePkg.id} offeringIds={bookableIds} slotsRemaining={activePkg.remaining} />
              ) : (
                <Link href="/packages" className="clay-button bg-cta text-white px-5 h-11 font-semibold text-sm inline-flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Buy a package
                </Link>
              )}
            </div>
          </Reveal>

          {/* Activities */}
          <div className="space-y-3">
            {items.map((item, i) => {
              const off = offeringMeta.get(item.offering_id)
              const meta = OFFERING_TYPE_META[off?.type ?? '']
              const Icon = meta?.icon
              const status = off && off.status !== 'live' ? OFFERING_STATUS_META[off.status] : null
              return (
                <Reveal key={item.offering_id} delay={Math.min(i * 0.04, 0.3)}>
                  <div className="clay-card p-5 flex items-start gap-4">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-display font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                      {item.rank}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                      {Icon && <Icon className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/catalog/${item.offering_id}`} className="font-display font-bold text-foreground hover:text-primary transition-colors">
                            {item.title}
                          </Link>
                          {status && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.badge}`}>{status.label}</span>}
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
                      <Link href={`/catalog/${item.offering_id}`} className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline pt-0.5">
                        Book on its own <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </>
      )}

      {planRow && items.length === 0 && (
        <Reveal>
          <div className="clay-card p-8 text-center space-y-2">
            <p className="font-display font-bold text-foreground">Couldn’t build a plan yet</p>
            <p className="text-muted text-sm max-w-sm mx-auto">
              There aren&apos;t enough live, age-appropriate activities for {childName}&apos;s current gaps. Check back as
              more go live.
            </p>
          </div>
        </Reveal>
      )}
    </div>
  )
}
