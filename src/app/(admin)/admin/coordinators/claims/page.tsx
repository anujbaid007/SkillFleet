import { createClient } from '@/lib/supabase/server'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { CoordinatorHeader } from '@/components/admin/coordinator-header'
import { CoordinatorQueue, CLAIMS_DEFAULT_STATUS } from '@/components/admin/coordinator-queue'
import { getCoordinatorsQueue, parseQueueQuery } from '@/lib/admin/queues'
import type { SearchParams } from '@/lib/admin/scope'
import { requireAdmin } from '@/lib/admin/guard'

const BASE_PATH = '/admin/coordinators/claims'

/**
 * Teachers applying to coordinate their school — the queue that used to be
 * /admin/coordinators itself, now one tab of the section.
 *
 * Nothing about the queue changed in the move: CoordinatorQueue already took
 * its page of data, its basePath and its query as props for exactly this, so
 * every tab, the search and the bulk review work here as they did. The old
 * address redirects here with its query intact — see the overview page.
 *
 * This is a plain table read, not one of the section G functions, so it works
 * whether or not the migration has been pasted.
 */
export default async function AdminCoordinatorClaimsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
  const sp = await searchParams
  const query = parseQueueQuery(sp, CLAIMS_DEFAULT_STATUS)
  const supabase = await createClient()
  const page = await getCoordinatorsQueue(supabase, query)

  const header = (
    <CoordinatorHeader
      active="claims"
      title="Claims"
      subtitle="A coordinator's console stays closed until you approve them."
    />
  )

  return (
    <div className="space-y-6">
      {header}

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
