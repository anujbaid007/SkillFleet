import { createClient } from '@/lib/supabase/server'
import { markCompleteAction } from './actions'
import { PageHeader } from '@/components/ui/page-header'
import { CheckSquare } from 'lucide-react'

interface RawBooking {
  id: string
  student_id: string
  status: string
  payment_status: string
  score_applied: boolean
  price_paise: number
  completion_marked_at: string | null
  created_at: string
  offerings: {
    title: string
    type: string
    scheduled_at: string | null
  } | null
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

const PAYMENT_BADGE: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-700',
  paid:     'bg-green-50 text-green-700',
  failed:   'bg-red-50 text-red-700',
  refunded: 'bg-purple-50 text-purple-700',
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function CompletionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: bookings } = (await supabase
    .from('bookings')
    .select('id, student_id, status, payment_status, score_applied, price_paise, completion_marked_at, created_at, offerings(title, type, scheduled_at)')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })) as unknown as { data: RawBooking[] | null }

  const rows = bookings ?? []

  const uniqueStudentIds = [...new Set(rows.map((b) => b.student_id))]
  const studentMap = new Map<string, string>()
  if (uniqueStudentIds.length) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', uniqueStudentIds)
    for (const p of profiles ?? []) {
      studentMap.set(p.id, p.full_name ?? 'Unknown')
    }
  }

  const canComplete = (b: RawBooking) =>
    b.status !== 'completed' && !b.score_applied

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        icon={CheckSquare}
        title="Completions"
        subtitle="Mark attended bookings complete to award student growth points."
      />

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="clay-card p-8 text-center">
          <p className="text-muted text-sm">No bookings yet.</p>
          <p className="text-muted text-xs mt-1">
            Once parents book offerings (Plan E), they will appear here.
          </p>
        </div>
      ) : (
        <div className="clay-card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Student</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Offering</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Scheduled</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Payment</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {rows.map((booking) => (
                <tr key={booking.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {studentMap.get(booking.student_id) ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{booking.offerings?.title ?? '—'}</p>
                    <p className="text-xs text-muted capitalize">{booking.offerings?.type ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {fmt(booking.offerings?.scheduled_at ?? null)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PAYMENT_BADGE[booking.payment_status] ?? ''}`}>
                      {booking.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[booking.status] ?? ''}`}>
                      {booking.status}
                    </span>
                    {booking.score_applied && (
                      <span className="ml-1.5 text-xs text-green-600">✓ scored</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canComplete(booking) ? (
                      <form action={markCompleteAction}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          Mark Complete
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted">
                        {booking.status === 'completed'
                          ? `Done ${fmt(booking.completion_marked_at)}`
                          : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
