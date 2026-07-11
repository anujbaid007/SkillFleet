import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Megaphone, ArrowBigUp, Plus } from 'lucide-react'
import { RequestStatusForm } from '@/components/admin/request-status-form'

interface RequestRow {
  id: string
  title: string
  description: string | null
  status: string
  support_count: number
  created_at: string
  categories: { name: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-accent-yellow/15 text-accent-yellow',
  planned: 'bg-primary/10 text-primary',
  fulfilled: 'bg-green-50 text-green-700',
  declined: 'bg-black/[0.06] text-muted',
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminRequestsPage() {
  const supabase = await createClient()

  const { data: requests } = (await supabase
    .from('offering_requests')
    .select('id, title, description, status, support_count, created_at, categories(name)')
    .order('support_count', { ascending: false })
    .order('created_at', { ascending: false })) as unknown as { data: RequestRow[] | null }

  const rows = requests ?? []
  const openCount = rows.filter((r) => r.status === 'open').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-pink to-accent-purple flex items-center justify-center text-white shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Demand requests</h1>
          <p className="text-sm text-muted">
            What families are asking for, ranked by support. {openCount} open.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="clay-card p-10 text-center text-muted text-sm">No requests yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="clay-card p-4 flex items-start gap-4">
              <div className="flex flex-col items-center justify-center w-12 shrink-0">
                <ArrowBigUp className="w-4 h-4 text-primary" />
                <span className="font-display font-bold text-foreground">{r.support_count}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display font-bold text-foreground">{r.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {r.categories?.name ? `${r.categories.name} · ` : ''}Requested {fmtDate(r.created_at)}
                </p>
                {r.description && <p className="text-sm text-muted mt-1.5">{r.description}</p>}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <RequestStatusForm id={r.id} status={r.status} />
                  <Link
                    href={`/admin/offerings/new?from_request=${r.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Create offering
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
