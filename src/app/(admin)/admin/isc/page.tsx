import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { ISC_TRACKS, type IscTrackId } from '@/lib/isc/tracks'
import { IscEntryRow, type AdminIscEntry } from '@/components/admin/isc-entry-row'

interface RawEntry {
  id: string
  track: string
  status: string
  submitted_at: string | null
  submission: Record<string, unknown>
  created_by: string
  school_id: string
}

export default async function AdminIscPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; status?: string }>
}) {
  const { track: trackFilter, status: statusFilter } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('isc_entries')
    .select('id, track, status, submitted_at, submission, created_by, school_id')
    .order('created_at', { ascending: false })

  if (trackFilter) query = query.eq('track', trackFilter)
  if (statusFilter) query = query.eq('status', statusFilter)

  const { data: raw } = (await query) as unknown as { data: RawEntry[] | null }
  const rows = raw ?? []

  const leaderIds = [...new Set(rows.map((r) => r.created_by))]
  const schoolIds = [...new Set(rows.map((r) => r.school_id))]

  const { data: leaders } = leaderIds.length
    ? await supabase.from('user_profiles').select('id, full_name').in('id', leaderIds)
    : { data: [] }
  const { data: schools } = schoolIds.length
    ? await supabase.from('schools').select('id, name').in('id', schoolIds)
    : { data: [] }
  const { data: memberCounts } = rows.length
    ? await supabase
        .from('isc_entry_members')
        .select('entry_id')
        .in(
          'entry_id',
          rows.map((r) => r.id)
        )
    : { data: [] }

  const leaderById = new Map((leaders ?? []).map((l) => [l.id, l.full_name]))
  const schoolById = new Map((schools ?? []).map((s) => [s.id, s.name]))
  const sizeByEntry = new Map<string, number>()
  for (const m of memberCounts ?? []) {
    sizeByEntry.set(m.entry_id, (sizeByEntry.get(m.entry_id) ?? 0) + 1)
  }

  const entries: AdminIscEntry[] = rows.map((r) => ({
    entryId: r.id,
    track: r.track as IscTrackId,
    schoolName: schoolById.get(r.school_id) ?? 'Unknown school',
    leaderName: leaderById.get(r.created_by) ?? 'Unknown student',
    teamSize: sizeByEntry.get(r.id) ?? 1,
    status: r.status,
    submittedAt: r.submitted_at,
    submission: r.submission ?? {},
  }))

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold ${
      active ? 'bg-primary text-white' : 'border border-black/10 text-muted hover:text-foreground'
    }`

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title="Entries"
        subtitle="Everything students have submitted for school screening. Read-only."
      />

      <div className="flex items-center gap-2 flex-wrap">
        <a href="/admin/isc" className={linkClass(!trackFilter && !statusFilter)}>
          All
        </a>
        {ISC_TRACKS.map((t) => (
          <a
            key={t.id}
            href={`/admin/isc?track=${t.id}`}
            className={linkClass(trackFilter === t.id)}
          >
            {t.name}
          </a>
        ))}
        <a href="/admin/isc?status=submitted" className={linkClass(statusFilter === 'submitted')}>
          Submitted only
        </a>
      </div>

      {entries.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No entries yet.</div>
      ) : (
        <Reveal delay={0.05}>
          <div className="clay-card divide-y divide-black/[0.06]">
            {entries.map((e) => (
              <IscEntryRow key={e.entryId} entry={e} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}
