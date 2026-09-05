import Link from 'next/link'
import { Inbox, MessageCircle, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { CoordinatorQueue, CLAIMS_DEFAULT_STATUS } from '@/components/admin/coordinator-queue'
import { getCoordinatorsQueue, parseQueueQuery } from '@/lib/admin/queues'
import type { SearchParams } from '@/lib/admin/scope'

const BASE_PATH = '/admin/coordinators'

/**
 * Teachers applying to coordinate their school.
 *
 * This used to read every claim ever made, then every applicant's profile,
 * then every claim again just to count the filter chips — three unbounded
 * reads for one screen. It now reads one page, and the queue itself is a
 * component that takes that page as a prop, so the tabbed Coordinators section
 * coming next can render it without unpicking this route.
 */
export default async function AdminCoordinatorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const query = parseQueueQuery(sp, CLAIMS_DEFAULT_STATUS)
  const supabase = await createClient()
  const page = await getCoordinatorsQueue(supabase, query)

  // Unread support messages, counted by Postgres rather than by fetching every
  // id and taking the length.
  const { count: unreadCount } = await supabase
    .from('support_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_role', 'coordinator')
    .is('read_at', null)

  const header = (
    <PageHeader
      eyebrow="ISC"
      icon={UserCheck}
      title="Coordinators"
      subtitle="Teachers applying to coordinate their school. A coordinator's console stays closed until you approve them."
    />
  )

  const doors = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link
        href="/admin/coordinators/support"
        className="clay-card p-6 flex items-start gap-4 hover:bg-black/[0.01] transition-colors"
      >
        <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Inbox className="w-5 h-5" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-foreground text-sm">Support Inbox</span>
            {(unreadCount ?? 0) > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                {unreadCount} unread
              </span>
            )}
          </span>
          <span className="block text-xs text-muted mt-1">
            Every conversation a coordinator has started with you.
          </span>
        </span>
      </Link>

      <Link
        href="/admin/coordinators/message"
        className="clay-card p-6 flex items-start gap-4 hover:bg-black/[0.01] transition-colors"
      >
        <span className="w-11 h-11 rounded-xl bg-accent-teal/10 text-accent-teal flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5" />
        </span>
        <span className="min-w-0">
          <span className="font-display font-bold text-foreground text-sm">
            Message a coordinator
          </span>
          <span className="block text-xs text-muted mt-1">
            Reach out to any approved coordinator first.
          </span>
        </span>
      </Link>
    </div>
  )

  return (
    <div className="space-y-6">
      {header}

      {/*
        Two doors into the same conversations: the inbox for people who have
        already written in, and the approved list for reaching someone first.
      */}
      {doors}

      {page.ok ? (
        <Reveal delay={0.05}>
          <CoordinatorQueue basePath={BASE_PATH} query={query} page={page.data} />
        </Reveal>
      ) : page.kind === 'migration-missing' ? (
        <MigrationMissing message={page.message} />
      ) : (
        <SectionFailed title="Coordinator applications" message={page.message} />
      )}
    </div>
  )
}
