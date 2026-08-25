import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { ISC_TRACKS, LANGUAGE_OPTIONS, type IscTrackId } from '@/lib/isc/tracks'
import { IscEntryRow, type AdminIscEntry } from '@/components/admin/isc-entry-row'
import { IscStatsPanel, type IscStats } from '@/components/admin/isc-stats'
import { IscFilters } from '@/components/admin/isc-filters'
import { parseRevisions, type EntryRevision } from '@/lib/isc/revisions'
import { IscInsights } from '@/components/admin/isc-insights'
import type { AnalyticsEntry } from '@/lib/isc/analytics'

interface RawEntry {
  id: string
  track: string
  status: string
  submitted_at: string | null
  updated_at: string
  submission: Record<string, unknown>
  created_by: string
  school_id: string
}

export default async function AdminIscPage({
  searchParams,
}: {
  searchParams: Promise<{
    track?: string
    status?: string
    school?: string
    language?: string
    q?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Everything is fetched, then filtered in memory. The screening queue is a
  // few thousand rows at most and the school/leader names needed for search
  // live in other tables — one pass is simpler than paginating a join.
  const { data: raw } = (await supabase
    .from('isc_entries')
    .select('id, track, status, submitted_at, updated_at, submission, created_by, school_id')
    .order('updated_at', { ascending: false })) as unknown as { data: RawEntry[] | null }

  const all = raw ?? []

  const schoolIds = [...new Set(all.map((r) => r.school_id))]

  // Members first: the class distribution counts every participant, so the
  // profile lookup below has to cover teammates and not only leaders.
  const { data: members } = all.length
    ? await supabase
        .from('isc_entry_members')
        .select('entry_id, user_id')
        .in(
          'entry_id',
          all.map((r) => r.id)
        )
    : { data: [] }

  const participantIds = [
    ...new Set([
      ...all.map((r) => r.created_by),
      ...(members ?? []).map((m) => m.user_id).filter((id): id is string => Boolean(id)),
    ]),
  ]

  const { data: leaders } = participantIds.length
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, school_class')
        .in('id', participantIds)
    : { data: [] }
  const { data: schools } = schoolIds.length
    ? await supabase.from('schools').select('id, name, state, district, board').in('id', schoolIds)
    : { data: [] }

  const leaderById = new Map((leaders ?? []).map((l) => [l.id, l.full_name]))

  const classByStudent = new Map<string, string | null>(
    (leaders ?? []).map((l) => [l.id, l.school_class ?? null])
  )

  // One query for the whole page. The admin list already loads every entry, and
  // the screening set is a few thousand rows at most; a query per row would be
  // hundreds of round trips for a panel most rows never expand.
  const { data: revisionRows } = all.length
    ? await supabase
        .from('isc_entry_revisions')
        .select('id, entry_id, edited_by, changed, edited_at')
        .in(
          'entry_id',
          all.map((r) => r.id)
        )
        .order('edited_at', { ascending: false })
    : { data: [] }

  const trackByEntry = new Map(all.map((e) => [e.id, e.track as IscTrackId]))

  const rawByEntry = new Map<string, unknown[]>()
  for (const row of revisionRows ?? []) {
    const list = rawByEntry.get(row.entry_id) ?? []
    list.push({
      revision_id: row.id,
      edited_at: row.edited_at,
      // Only the leader can edit, so the editor is always the entry's
      // created_by and leaderById already covers them. A future rule change
      // that lets teammates edit would need a wider name lookup here.
      editor_name: row.edited_by ? (leaderById.get(row.edited_by) ?? null) : null,
      changed: row.changed,
    })
    rawByEntry.set(row.entry_id, list)
  }

  // Parsed once per entry, not once per row: parseRevisions rebuilds a label
  // and ordering map from TRACK_FIELDS on every call.
  const revisionsByEntry = new Map<string, EntryRevision[]>()
  for (const [entryId, rows] of rawByEntry) {
    const track = trackByEntry.get(entryId)
    // An orphan revision cannot be labelled without knowing its track; skipping
    // beats guessing a track and mislabelling every field in it.
    if (!track) continue
    revisionsByEntry.set(entryId, parseRevisions(track, rows))
  }
  const schoolById = new Map((schools ?? []).map((s) => [s.id, s]))

  const sizeByEntry = new Map<string, number>()
  const studentsByEntry = new Map<string, string[]>()
  const studentIds = new Set<string>()
  for (const m of members ?? []) {
    sizeByEntry.set(m.entry_id, (sizeByEntry.get(m.entry_id) ?? 0) + 1)
    if (m.user_id) {
      studentIds.add(m.user_id)
      studentsByEntry.set(m.entry_id, [...(studentsByEntry.get(m.entry_id) ?? []), m.user_id])
    }
  }

  const enriched: AdminIscEntry[] = all.map((r) => ({
    entryId: r.id,
    track: r.track as IscTrackId,
    schoolName: schoolById.get(r.school_id)?.name ?? 'Unknown school',
    schoolState: schoolById.get(r.school_id)?.state ?? '',
    schoolDistrict: schoolById.get(r.school_id)?.district ?? '',
    leaderName: leaderById.get(r.created_by) ?? 'Unknown student',
    teamSize: sizeByEntry.get(r.id) ?? 1,
    status: r.status,
    submittedAt: r.submitted_at,
    updatedAt: r.updated_at,
    language: (r.submission?.language as string) ?? null,
    editCount: (revisionsByEntry.get(r.id) ?? []).length,
    revisions: revisionsByEntry.get(r.id) ?? [],
    submission: r.submission ?? {},
  }))

  // The same entries, flattened for the aggregations. Kept separate from
  // AdminIscEntry because the panels need school geography and the roster of
  // students, while a list row needs neither.
  const analytics: AnalyticsEntry[] = all.map((r) => ({
    entryId: r.id,
    track: r.track as IscTrackId,
    status: r.status,
    schoolId: r.school_id,
    schoolName: schoolById.get(r.school_id)?.name ?? 'Unknown school',
    state: schoolById.get(r.school_id)?.state ?? '',
    district: schoolById.get(r.school_id)?.district ?? '',
    board: schoolById.get(r.school_id)?.board ?? '',
    submittedAt: r.submitted_at,
    updatedAt: r.updated_at,
    studentIds: studentsByEntry.get(r.id) ?? [],
  }))

  // Stats describe the whole cycle, not the current filter — an admin needs the
  // denominator to stay put while they slice the list.
  const stats: IscStats = {
    total: enriched.length,
    submitted: enriched.filter((e) => e.status === 'submitted').length,
    draft: enriched.filter((e) => e.status === 'draft').length,
    schools: new Set(all.map((r) => r.school_id)).size,
    students: studentIds.size,
    byTrack: ISC_TRACKS.reduce<IscStats['byTrack']>((acc, t) => {
      const rows = enriched.filter((e) => e.track === t.id)
      acc[t.id] = {
        submitted: rows.filter((e) => e.status === 'submitted').length,
        draft: rows.filter((e) => e.status === 'draft').length,
      }
      return acc
    }, {}),
    byLanguage: enriched.reduce<Record<string, number>>((acc, e) => {
      if (e.language) acc[e.language] = (acc[e.language] ?? 0) + 1
      return acc
    }, {}),
  }

  const q = (params.q ?? '').trim().toLowerCase()
  const rows = enriched.filter((e) => {
    if (params.track && e.track !== params.track) return false
    if (params.status && e.status !== params.status) return false
    if (params.school && e.schoolName !== params.school) return false
    if (params.language && e.language !== params.language) return false
    if (q && !`${e.leaderName} ${e.schoolName}`.toLowerCase().includes(q)) return false
    return true
  })

  const schoolNames = [...new Set(enriched.map((e) => e.schoolName))].sort()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title="Entries"
        subtitle="Everything students have entered for school screening. Read-only."
      />

      <Reveal delay={0.03}>
        <IscStatsPanel stats={stats} />
      </Reveal>

      <Reveal delay={0.04}>
        <IscInsights entries={analytics} classByStudent={classByStudent} now={new Date()} />
      </Reveal>

      <IscFilters
        schools={schoolNames}
        languages={LANGUAGE_OPTIONS}
        showing={rows.length}
        total={enriched.length}
      />

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">
          {enriched.length === 0
            ? 'No entries yet.'
            : 'No entries match these filters — try clearing one.'}
        </div>
      ) : (
        <Reveal delay={0.05}>
          <div className="clay-card divide-y divide-black/[0.06]">
            {rows.map((e) => (
              <IscEntryRow key={e.entryId} entry={e} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}
