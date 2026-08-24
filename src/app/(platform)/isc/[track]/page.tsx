import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { trackBySlug } from '@/lib/isc/tracks'
import { isEligibleClass, isTrackLocked } from '@/lib/isc/validate'
import { ensureIscEntry, getIscEntry, getTrackDeadline } from '@/app/actions/isc'
import { EntryForm } from '@/components/isc/entry-form'
import { TeamPanel } from '@/components/isc/team-panel'

export default async function IscTrackPage({
  params,
}: {
  params: Promise<{ track: string }>
}) {
  const { track: slug } = await params
  const track = trackBySlug(slug)
  if (!track) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('school_class')
    .eq('id', user.id)
    .single()
  if (!isEligibleClass(profile?.school_class)) redirect('/isc')

  // Create the draft on first visit so the form always has an entry to bind to.
  const ensured = await ensureIscEntry(slug)
  if ('error' in ensured) {
    return <div className="clay-card p-6 text-sm text-red-600 max-w-xl">{ensured.error}</div>
  }

  const entry = await getIscEntry(ensured.entryId)
  if (!entry) redirect('/isc')

  const deadline = await getTrackDeadline(track.id)
  const locked = isTrackLocked(deadline ?? '', new Date())

  return (
    <div className="space-y-6">
      <Link
        href="/isc"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        All tracks
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{track.name}</h1>
        <p className="text-muted mt-1 max-w-2xl">{track.brief}</p>
      </div>

      <TeamPanel
        entryId={entry.entryId}
        slug={track.slug}
        members={entry.members}
        maxTeamSize={track.maxTeamSize}
        canEdit={entry.isLeader && !locked}
      />

      <EntryForm
        entryId={entry.entryId}
        track={entry.track}
        submission={entry.submission}
        status={entry.status}
        locked={locked}
        canEdit={entry.isLeader}
      />
    </div>
  )
}
