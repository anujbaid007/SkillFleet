import { createClient } from '@/lib/supabase/server'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { CoordinatorHeader } from '@/components/admin/coordinator-header'
import { CoordinatorDirectory } from '@/components/admin/coordinator-directory'
import {
  getCoordinatorBreakdown,
  getCoordinatorsPage,
  parseCoordinatorsQuery,
} from '@/lib/admin/coordinators'
import type { SearchParams } from '@/lib/admin/scope'

const BASE_PATH = '/admin/coordinators/directory'

/**
 * Every coordinator, paged by the database, sorted by reach.
 *
 * The breakdown is read here only to fill the state filter's options. It is
 * the same call the overview makes with the same arguments, so it is usually
 * already in the sixty-second cache and costs nothing; when it fails, the
 * filter simply is not offered and the list still works.
 */
export default async function AdminCoordinatorsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const query = parseCoordinatorsQuery(sp)
  const supabase = await createClient()

  const [page, breakdown] = await Promise.all([
    getCoordinatorsPage(supabase, query),
    getCoordinatorBreakdown(supabase, {}),
  ])

  const header = (
    <CoordinatorHeader
      active="directory"
      title="Directory"
      subtitle="Every teacher who has signed up as a coordinator, most students first."
    />
  )

  if (!page.ok && page.kind === 'migration-missing') {
    return (
      <div className="space-y-8">
        {header}
        <MigrationMissing message={page.message} />
      </div>
    )
  }

  // Ordered by students covered by the SQL; alphabetical is what a filter
  // wants, and the two orders have nothing to do with each other.
  const states = breakdown.ok
    ? [...breakdown.data.map((r) => r.key)].sort((a, b) => a.localeCompare(b))
    : []

  return (
    <div className="space-y-8">
      {header}

      <Reveal delay={0.03}>
        {page.ok ? (
          <CoordinatorDirectory
            page={page.data}
            query={query}
            basePath={BASE_PATH}
            states={states}
          />
        ) : (
          <SectionFailed title="The directory" message={page.message} />
        )}
      </Reveal>
    </div>
  )
}
