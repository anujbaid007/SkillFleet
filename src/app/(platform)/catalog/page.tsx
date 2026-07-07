import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import { CatalogStatusFilter } from '@/components/catalog/status-filter'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META, OFFERING_STATUS_META } from '@/lib/offering-meta'

interface RawOffering {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  price_paise: number
  min_age: number | null
  max_age: number | null
  scheduled_at: string | null
  topics: { id: string; name: string; category_id: string; categories: { id: string; name: string } | null } | null
}

interface RawCategory {
  id: string
  name: string
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string; status?: string }>
}) {
  const { category: categoryFilter, type: typeFilter, status: statusFilter } = await searchParams
  const supabase = await createClient()

  const [{ data: offerings }, { data: categories }] = (await Promise.all([
    supabase
      .from('offerings')
      .select('id, title, description, type, status, price_paise, min_age, max_age, scheduled_at, topics(id, name, category_id, categories(id, name))')
      .in('status', ['planned', 'live', 'completed'])
      .order('scheduled_at', { ascending: true, nullsFirst: false }),
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
  ])) as [{ data: RawOffering[] | null }, { data: RawCategory[] | null }]

  let rows = offerings ?? []
  if (typeFilter) rows = rows.filter((o) => o.type === typeFilter)
  if (categoryFilter) rows = rows.filter((o) => o.topics?.category_id === categoryFilter)
  if (statusFilter) rows = rows.filter((o) => o.status === statusFilter)

  const buildHref = (o: { type?: string | null; category?: string | null }) => {
    const params = new URLSearchParams()
    const t = 'type' in o ? o.type : typeFilter
    const c = 'category' in o ? o.category : categoryFilter
    if (t) params.set('type', t)
    if (c) params.set('category', c)
    if (statusFilter) params.set('status', statusFilter)
    const qs = params.toString()
    return `/catalog${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Discover"
        icon={Compass}
        title="Explore"
        subtitle="Workshops, trips, events, competitions, and internships that grow real skills."
      />

      <Reveal delay={0.05}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildHref({ type: null })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${!typeFilter ? 'bg-primary text-white' : 'bg-white text-muted border border-black/10 hover:text-foreground'}`}
            >
              All types
            </Link>
            {Object.entries(OFFERING_TYPE_META).map(([value, meta]) => (
              <Link
                key={value}
                href={buildHref({ type: value })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${typeFilter === value ? 'bg-primary text-white' : 'bg-white text-muted border border-black/10 hover:text-foreground'}`}
              >
                {meta.label}
              </Link>
            ))}
            <div className="ml-auto">
              <CatalogStatusFilter status={statusFilter} type={typeFilter} category={categoryFilter} />
            </div>
          </div>

          {(categories ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({ category: null })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!categoryFilter ? 'border-primary text-primary bg-primary/5' : 'border-black/10 text-muted hover:text-foreground'}`}
              >
                All categories
              </Link>
              {(categories ?? []).map((c) => (
                <Link
                  key={c.id}
                  href={buildHref({ category: c.id })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoryFilter === c.id ? 'border-primary text-primary bg-primary/5' : 'border-black/10 text-muted hover:text-foreground'}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {rows.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="clay-card p-12 text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Compass className="w-7 h-7 text-primary" />
            </div>
            <p className="font-display font-bold text-foreground">Nothing here yet</p>
            <p className="text-muted text-sm">No offerings match these filters — try a different type or status.</p>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((o, i) => {
            const meta = OFFERING_TYPE_META[o.type]
            const Icon = meta?.icon
            const status = OFFERING_STATUS_META[o.status]
            return (
              <Reveal key={o.id} delay={Math.min(i * 0.05, 0.4)}>
                <Link href={`/catalog/${o.id}`} className="clay-card p-5 flex flex-col h-full group relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${meta?.tint ?? 'from-primary/[0.08]'} to-transparent pointer-events-none`} />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'} group-hover:scale-105 transition-transform`}>
                        {Icon && <Icon className="w-5 h-5" />}
                      </div>
                      {status && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.badge}`}>
                          {status.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${meta?.text ?? 'text-primary'}`}>{meta?.label ?? o.type}</span>
                      {o.topics?.categories && (
                        <span className="text-xs text-muted truncate">· {o.topics.categories.name}</span>
                      )}
                    </div>
                    <h2 className="font-display font-bold text-foreground leading-snug">{o.title}</h2>
                    {o.description && <p className="text-xs text-muted line-clamp-2 mt-1">{o.description}</p>}
                    <div className="flex items-center justify-between pt-3 mt-auto">
                      <span className="font-display text-lg font-bold text-foreground">{formatPrice(o.price_paise)}</span>
                      {(o.min_age || o.max_age) && (
                        <span className="text-xs text-muted font-medium">
                          Ages {o.min_age ?? '0'}–{o.max_age ?? '18+'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}
