import { notFound, redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/session'
import { trackBySlug } from '@/lib/isc/tracks'
import { isEligibleClass, isTrackLocked } from '@/lib/isc/validate'
import { getMyIscEntries, getIscEntry, getTrackDeadline } from '@/app/actions/isc'
import { EntryForm } from '@/components/isc/entry-form'
import { TeamPanel } from '@/components/isc/team-panel'
import { TrackHero } from '@/components/isc/track-hero'
import { TrackFacts } from '@/components/isc/track-facts'
import { EnterTrackButton } from '@/components/isc/enter-track-button'
import { LeaveEntryButton } from '@/components/isc/leave-entry-button'
import { LeaveTeamButton } from '@/components/isc/leave-team-button'
import type { IscMember } from '@/app/actions/isc'

export default async function IscTrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ track: string }>
  searchParams: Promise<{ start?: string }>
}) {
  const { track: slug } = await params
  const { start } = await searchParams
  const track = trackBySlug(slug)
  if (!track) notFound()

  // Memoised by the layout for this request, so neither costs a round trip.
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!isEligibleClass(profile.school_class)) redirect('/isc')

  /*
    Independent of each other and of the entry lookup below, so they are
    fetched together rather than as two waits stacked in front of the page.
  */
  const [mine, deadline] = await Promise.all([
    // Read-only: neither browsing a track nor opening its form creates
    // anything. The entry is written by the first real action — see
    // resolveEntryId.
    getMyIscEntries(),
    getTrackDeadline(track.id),
  ])
  const existing = mine.find((e) => e.track === track.id)
  // A pending invite has a row here but isn't joined yet — send them back to
  // /isc to respond on the banner rather than showing a half-formed team page,
  // and critically, rather than falling through to "Ready when you are", which
  // would try to create a second entry for a track they already have a
  // (pending) row on and loop back to this exact redirect.
  if (existing && !existing.isAccepted) redirect('/isc')
  const entry = existing ? await getIscEntry(existing.entryId) : null

  const locked = isTrackLocked(deadline ?? '', new Date())
  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null
  // One instant for the whole render, taken as a value rather than by calling
  // Date.now() mid-render, which the React compiler treats as impure.
  const now = new Date()
  const daysLeft = deadline
    ? Math.ceil((new Date(deadline).getTime() - now.getTime()) / 86_400_000)
    : null

  // The form is open either because an entry exists, or because the student
  // just asked to start one (?start=1) and nothing has been written yet.
  const opening = !entry && start === '1' && !locked

  // Before the entry exists there is no members row to read, so stand in the
  // one member it will certainly have: the student looking at the page. Shaped
  // exactly like a real accepted leader so TeamPanel needs no special case.
  const previewMembers: IscMember[] = [
    {
      memberId: 'preview-leader',
      userId: profile.id,
      name: profile.full_name ?? null,
      schoolClass: profile.school_class ?? null,
      invitedEmail: null,
      inviteToken: null,
      isLeader: true,
      acceptedAt: new Date().toISOString(),
    },
  ]

  // Withdrawing is only offered while it is genuinely still just theirs.
  const canLeave =
    entry !== null &&
    entry.isLeader &&
    entry.status === 'draft' &&
    entry.members.length === 1 &&
    !locked

  // A teammate can step off a draft at any time; the leader's own route is
  // the withdraw button above, which deletes the whole entry.
  const canLeaveTeam = entry !== null && !entry.isLeader && entry.status === 'draft' && !locked

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

      {!entry && !opening ? (
        <div className="clay-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="font-display font-bold text-foreground">
              {locked ? 'Entries have closed' : 'Ready when you are'}
            </p>
            <p className="text-sm text-muted mt-1">
              {locked
                ? 'The school-level deadline for this track has passed.'
                : 'Opening the form does not enter you — nothing is saved until you press Save draft.'}
            </p>
          </div>
          {!locked && <EnterTrackButton slug={track.slug} />}
        </div>
      ) : (
        <>
          <TeamPanel
            entryId={entry?.entryId ?? ''}
            slug={track.slug}
            members={entry ? entry.members : previewMembers}
            maxTeamSize={track.maxTeamSize}
            canEdit={entry ? entry.isLeader && !locked && entry.status !== 'submitted' : true}
            submitted={entry?.status === 'submitted'}
          />

          <EntryForm
            entryId={entry?.entryId ?? ''}
            track={entry?.track ?? track.id}
            submission={entry?.submission ?? {}}
            status={entry?.status ?? 'draft'}
            locked={locked}
            canEdit={entry ? entry.isLeader : true}
          />

          {canLeave && entry && <LeaveEntryButton entryId={entry.entryId} slug={track.slug} />}
          {canLeaveTeam && entry && <LeaveTeamButton entryId={entry.entryId} slug={track.slug} />}
        </>
      )}
    </div>
  )
}
