import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { archiveOfferingAction } from './actions'
import { Reveal } from '@/components/ui/reveal'
import { PageHeader } from '@/components/ui/page-header'
import { Package } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  live: 'bg-green-50 text-green-700',
  planned: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-blue-50 text-blue-700',
  retired: 'bg-black/[0.06] text-muted',
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
  topics: { name: string; categories: { name: string } | null } | null
}

export default async function OfferingsPage() {
  const supabase = await createClient()

  const { data: offerings } = (await supabase
    .from('offerings')
    .select('id, title, type, status, price_paise, scheduled_at, topics(name, categories(name))')
    .order('status')
    .order('scheduled_at', { ascending: true })) as unknown as { data: RawOffering[] | null }

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

      {(offerings ?? []).length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No offerings yet. Create the first one.</div>
      ) : (
        <Reveal>
        <div className="clay-card divide-y divide-black/[0.06]">
          {(offerings ?? []).map((o) => (
            <div key={o.id} className="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[o.status] ?? ''}`}>
                    {o.status}
                  </span>
                  <span className="text-xs text-muted">{TYPE_LABEL[o.type] ?? o.type}</span>
                  {o.topics?.categories && (
                    <span className="text-xs text-muted">· {o.topics.categories.name}</span>
                  )}
                </div>
                <p className="font-medium text-foreground text-sm truncate">{o.title}</p>
                <p className="text-xs text-muted">
                  {o.price_paise === 0 ? 'Free' : `₹${(o.price_paise / 100).toLocaleString('en-IN')}`}
                  {o.scheduled_at &&
                    ` · ${new Date(o.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/offerings/${o.id}/edit`}
                  className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
                >
                  Edit
                </Link>
                {o.status !== 'retired' && (
                  <form action={archiveOfferingAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg border border-black/10 text-muted text-xs font-medium hover:text-red-600 hover:border-red-200 transition-colors"
                    >
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
