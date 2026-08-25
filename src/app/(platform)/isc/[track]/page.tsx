import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { trackBySlug } from '@/lib/isc/tracks'
import { isEligibleClass, isTrackLocked } from '@/lib/isc/validate'
import { getMyIscEntries, getIscEntry, getTrackDeadline, hasIscConsent } from '@/app/actions/isc'
import { EntryForm } from '@/components/isc/entry-form'
import { TeamPanel } from '@/components/isc/team-panel'
import { TrackHero } from '@/components/isc/track-hero'
import { TrackFacts } from '@/components/isc/track-facts'
import { EnterTrackButton } from '@/components/isc/enter-track-button'

export default async function IscTrackPage({ params }: { params: Promise<{ track: string }> }) {
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

  // Read-only: browsing a track must not create anything. The draft is made
  // only when the student presses "Enter this track".
  const mine = await getMyIscEntries()
  const existing = mine.find((e) => e.track === track.id)
  const entry = existing ? await getIscEntry(existing.entryId) : null

  const deadline = await getTrackDeadline(track.id)
  const locked = isTrackLocked(deadline ?? '', new Date())
  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null
  const daysLeft = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
    : null

  const consentGiven = await hasIscConsent()

  return (
    <div className="space-y-6">
      <TrackHero
        name={track.name}
        brief={track.brief}
        icon={track.icon}
        gradient={track.gradient}
        tint={track.tint}
        maxTeamSize={track.maxTeamSize}
        deadlineLabel={deadlineLabel}
        daysLeft={daysLeft}
      />

      <TrackFacts prize={track.prize} prepare={track.prepare} accent={track.accent} />

      {!entry ? (
        <div className="clay-card p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="font-display font-bold text-foreground">
              {locked ? 'Entries have closed' : 'Ready when you are'}
            </p>
            <p className="text-sm text-muted mt-1">
              {locked
                ? 'The screening deadline for this track has passed.'
                : 'Nothing is submitted until you say so — you can save a draft and come back.'}
            </p>
          </div>
          {!locked && <EnterTrackButton slug={track.slug} needsConsent={!consentGiven} />}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
