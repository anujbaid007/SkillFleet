import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AdminError } from '@/lib/admin/errors'
import { iterateExport, type RosterRow } from '@/lib/admin/isc'
import { CSV_BOM, csvRow } from '@/lib/admin/csv'
import { parseRosterFilters, parseScope, type SearchParams } from '@/lib/admin/scope'
import { formatIstDay, istDay } from '@/lib/isc/dates'
import { iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
import { trackName } from '@/lib/isc/tracks'

/*
  The entries in one scope, streamed as CSV in keyset chunks.

  WHY THIS ROUTE CHECKS THE ADMIN ITSELF, when the (admin) layout already does:
  the readers cache successes for sixty seconds and that cache is NOT scoped to
  a user, so a cached answer is served without the SQL's own is_admin() gate
  ever running again. A route that leaned on the function's gate would hand the
  second caller whatever the first one warmed. iterateExport is not cached, but
  the rule is the rule: every route reads only after it knows who is asking.
*/

const HEADER = [
  'Entry id',
  'Championship',
  'Status',
  'Division',
  'Language',
  'School',
  'Team leader',
  'Team size',
  'Started on',
  'Submitted on',
]

function line(r: RosterRow): string {
  return csvRow([
    r.id,
    trackName(r.track),
    // The same vocabulary the student and the coordinator see on screen.
    r.status === 'submitted' ? 'Submitted' : 'Draft',
    r.division === 'group1' || r.division === 'group2' ? iscGroupLabel(r.division as IscGroup) : '',
    r.language ?? '',
    r.school_name,
    r.leader_name ?? '',
    r.member_count,
    formatIstDay(istDay(r.created_at)),
    r.submitted_at ? formatIstDay(istDay(r.submitted_at)) : '',
  ])
}

function text(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Nothing is read until this passes.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return text('Sign in required.', 401)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') return text('Admins only.', 403)

  const sp: SearchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  // parseScope drops a district that arrived without a state, so the SQL's
  // district-without-a-state exception cannot be reached from a hand-typed URL.
  const scope = parseScope(sp)
  if (!scope.state && !scope.schoolId) {
    return text(
      'An export needs a state, a district or a school. A national export would stream every entry in the country; pick a scope.',
      400
    )
  }
  const filters = parseRosterFilters(sp)

  /*
    The first chunk is fetched BEFORE the response is built. Once a 200 and a
    Content-Disposition have gone out, a failure can only be written into the
    file the browser is already saving — which reads to the person as a corrupt
    download rather than an error. Pulling one chunk first turns the two
    failures that actually happen (the migration is not in place, the database
    refuses) into a status code they can read.
  */
  const chunks = iterateExport(supabase, scope, filters)
  let first: IteratorResult<RosterRow[]>
  try {
    first = await chunks.next()
  } catch (e) {
    if (e instanceof AdminError && e.kind === 'migration-missing') return text(e.message, 503)
    return text(e instanceof Error ? e.message : 'The export could not start.', 500)
  }

  const encoder = new TextEncoder()
  let pending: IteratorResult<RosterRow[]> | null = first

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // The byte-order mark goes on the response once, not on every row: Excel
      // needs it to read the file as UTF-8, and Devanagari school names depend
      // on that.
      controller.enqueue(encoder.encode(CSV_BOM + csvRow(HEADER)))
    },
    // pull, not start: one chunk per read keeps a 40,000-row export from being
    // assembled in memory before the browser has taken any of it.
    async pull(controller) {
      try {
        const next = pending ?? (await chunks.next())
        pending = null
        if (next.done) {
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(next.value.map(line).join('')))
      } catch (e) {
        // Headers are long gone. The honest thing left is a last row saying the
        // file is short, rather than closing quietly and letting it pass as
        // complete.
        controller.enqueue(
          encoder.encode(csvRow(['Export stopped', e instanceof Error ? e.message : 'Unknown error']))
        )
        controller.close()
      }
    },
    async cancel() {
      // The reader went away — stop asking the database for more chunks.
      await chunks.return(undefined)
    },
  })

  const name = ['isc-entries', scope.state, scope.district, scope.schoolId, istDay(new Date())]
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9-]+/gi, '_')

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
