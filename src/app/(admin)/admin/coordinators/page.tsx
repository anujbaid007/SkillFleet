import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Inbox, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { CoordinatorHeader } from '@/components/admin/coordinator-header'
import { CoordinatorFunnelPanel } from '@/components/admin/coordinator-funnel-panel'
import { CoordinatorTrendChart } from '@/components/admin/coordinator-trend-chart'
import { CoordinatorBreakdownTable } from '@/components/admin/coordinator-breakdown-table'
import { CLAIMS_DEFAULT_STATUS } from '@/components/admin/coordinator-queue'
import {
  getCoordinatorBreakdown,
  getCoordinatorSummary,
  getCoordinatorTrend,
} from '@/lib/admin/coordinators'
import { parseQueueQuery, queueQueryToString } from '@/lib/admin/queues'
import type { IscScope, SearchParams } from '@/lib/admin/scope'

/**
 * All of India, for the people who bring schools in.
 *
 * THE HEADLINE IS REACH: every student on the register of a school with an
 * approved coordinator, with the share of them who have entered beside it.
 * Both halves are the same people at the same schools, so that share is a real
 * percentage — see the note in coordinator-funnel-panel.tsx for why the
 * state-level submitted/eligible on the ISC pages is not and never gets a bar.
 *
 * THE OLD QUEUE URL LIVES HERE. /admin/coordinators used to BE the claims
 * queue, and the global search and the dashboard still link to
 * ?status=all&q=… — so any of the queue's own parameters redirects to the
 * Claims tab with the query intact rather than landing on an overview that
 * ignores it.
 */
export default async function AdminCoordinatorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

  // The queue's parameters, on the page the queue used to live at. Parsed
  // rather than forwarded raw so a hand-typed status cannot reach the queue as
  // a filter that matches nothing, and rebuilt through the queue's own
  // stringifier so the link is one the Claims tab would have produced itself.
  if (sp.status !== undefined || sp.q !== undefined || sp.page !== undefined) {
    const query = parseQueueQuery(sp, CLAIMS_DEFAULT_STATUS)
    redirect(`/admin/coordinators/claims${queueQueryToString(query, CLAIMS_DEFAULT_STATUS)}`)
  }

  const scope: Pick<IscScope, 'state' | 'district'> = {}
  const supabase = await createClient()

  const [summary, breakdown, trend, unread] = await Promise.all([
    getCoordinatorSummary(supabase, scope),
    getCoordinatorBreakdown(supabase, scope),
    getCoordinatorTrend(supabase, scope),
    // Counted by Postgres rather than by fetching every id and taking the
    // length, and a plain table read, so it survives a missing migration.
    supabase
      .from('support_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_role', 'coordinator')
      .is('read_at', null),
  ])

  const unreadCount = unread.count ?? 0

  const header = (
    <CoordinatorHeader
      active="overview"
      title="Coordinators"
      subtitle="Teachers who bring a school in. Reach is every student on that school's register."
      action={
        <Link
          href="/admin/coordinators/message"
          className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-black/[0.06] bg-white px-4 text-sm font-semibold text-foreground hover:border-primary"
        >
          <MessageCircle className="h-4 w-4" />
          Message a coordinator
        </Link>
      }
    />
  )

  const inbox = unreadCount > 0 && (
    <Link
      href="/admin/coordinators/support"
      className="clay-card flex items-center gap-4 p-5 transition-colors hover:bg-black/[0.01]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Inbox className="h-5 w-5" />
      </span>
      <span className="text-sm text-foreground">
        <span className="font-semibold">
          {unreadCount.toLocaleString('en-IN')} unread{' '}
          {unreadCount === 1 ? 'message' : 'messages'}
        </span>{' '}
        <span className="text-muted">from coordinators, in the support inbox.</span>
      </span>
    </Link>
  )

  // The founder has not pasted the migration yet. A setup step, not a fault —
  // so the page keeps its heading, its tabs and everything that is not backed
  // by those functions.
  if (!summary.ok && summary.kind === 'migration-missing') {
    return (
      <div className="space-y-8">
        {header}
        <MigrationMissing message={summary.message} />
        {inbox}
      </div>
    )
  }

  const empty = summary.ok && summary.data.coordinators === 0

  return (
    <div className="space-y-8">
      {header}
      {inbox}

      {empty && (
        <p className="text-sm text-muted">
          No teacher has signed up as a coordinator yet, so there is nothing to count.
        </p>
      )}

      <Reveal delay={0.03}>
        {summary.ok ? (
          <CoordinatorFunnelPanel summary={summary.data} />
        ) : (
          <SectionFailed title="The headline numbers" message={summary.message} />
        )}
      </Reveal>

      <Reveal delay={0.04}>
        {trend.ok ? (
          <CoordinatorTrendChart
            points={trend.data}
            approvedTotal={summary.ok ? summary.data.approved : 0}
          />
        ) : (
          <SectionFailed title="The signup chart" message={trend.message} />
        )}
      </Reveal>

      <Reveal delay={0.05}>
        {breakdown.ok ? (
          <CoordinatorBreakdownTable
            rows={breakdown.data}
            level="state"
            hrefFor={(key) => `/admin/coordinators/state/${encodeURIComponent(key)}`}
          />
        ) : (
          <SectionFailed title="States" message={breakdown.message} />
        )}
      </Reveal>
    </div>
  )
}
