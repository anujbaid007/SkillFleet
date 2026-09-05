import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { CoordinatorMessageList, type MessageableCoordinator } from '@/components/admin/coordinator-message-list'
import { requireAdmin } from '@/lib/admin/guard'

interface RawSchool {
  coordinator_id: string | null
  name: string
  state: string
  district: string
}

/**
 * A dedicated picker, separate from the applications list.
 *
 * `/admin/coordinators/claims?status=approved` answers "who applied and got approved"
 * — reusing it here meant clicking "Message a coordinator" visibly switched
 * tabs and showed review chrome nobody asked for. This page exists only to
 * find one coordinator out of a list that will keep growing, so it is just a
 * search box and a flat list — no tabs, no review affordances.
 */
export default async function AdminMessageCoordinatorPage() {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
  const supabase = await createClient()

  const { data: schools } = (await supabase
    .from('schools')
    .select('coordinator_id, name, state, district')
    .eq('coordinator_status', 'approved')
    .order('name')) as unknown as { data: RawSchool[] | null }

  const rows = (schools ?? []).filter((s): s is RawSchool & { coordinator_id: string } =>
    Boolean(s.coordinator_id)
  )
  const coordinatorIds = rows.map((s) => s.coordinator_id)

  const { data: profiles } = coordinatorIds.length
    ? await supabase.from('user_profiles').select('id, full_name').in('id', coordinatorIds)
    : { data: [] as { id: string; full_name: string | null }[] }
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  const coordinators: MessageableCoordinator[] = rows.map((s) => ({
    coordinatorId: s.coordinator_id,
    name: nameById.get(s.coordinator_id) || 'Unknown coordinator',
    schoolName: s.name,
    state: s.state,
    district: s.district,
  }))

  return (
    <div className="space-y-6">
      <Link
        href="/admin/coordinators"
        className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Coordinators
      </Link>

      <PageHeader
        eyebrow="ISC"
        icon={MessageCircle}
        title="Message a coordinator"
        subtitle="Find any approved coordinator and start a conversation."
      />

      <CoordinatorMessageList coordinators={coordinators} />
    </div>
  )
}
