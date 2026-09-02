import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { getCurrentProfile } from '@/lib/supabase/session'
import { Reveal } from '@/components/ui/reveal'
import { ISC_TRACKS, PUZZLE_MASTER } from '@/lib/isc/tracks'
import { isEligibleClass } from '@/lib/isc/validate'
import { iscGroupForClass, iscGroupLabel } from '@/lib/isc/groups'
import { getMyIscEntries, getMyPendingInvites } from '@/app/actions/isc'
import { IscHero } from '@/components/isc/isc-hero'
import { TrackCard, type TrackCardState } from '@/components/isc/track-card'
import { HowItWorks } from '@/components/isc/how-it-works'
import { PendingInvites } from '@/components/isc/pending-invites'

export default async function IscPage() {
  // Already fetched and memoised by the layout — free here.
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const eligible = isEligibleClass(profile.school_class)
  // Neither list depends on the other, so they are fetched together.
  const [entries, invites] = eligible
    ? await Promise.all([getMyIscEntries(), getMyPendingInvites()])
    : [[], []]
  // A pending invite is not one of "my championships" yet — it must not make
  // a track card read as draft/submitted before the student has agreed to join.
  const byTrack = new Map(entries.filter((e) => e.isAccepted).map((e) => [e.track, e]))
  const group = eligible ? iscGroupForClass(profile.school_class) : null

  return (
    <div className="space-y-6">
      <Reveal>
        <IscHero groupLabel={group ? iscGroupLabel(group) : null} />
      </Reveal>

      <PendingInvites invites={invites} />

      {!eligible && (
        <Reveal delay={0.05}>
          <div className="clay-card flex items-start gap-4 p-4 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05]">
              <Trophy className="h-5 w-5 text-muted" />
            </span>
            <div>
              <p className="font-display font-bold text-foreground">Not open to your class yet</p>
              <p className="mt-1 text-sm text-muted">
                ISC 2026 is for{' '}
                <span className="font-semibold text-foreground">Classes 5 to 12</span>.
                {profile.school_class
                  ? ` Your profile says ${profile.school_class}, so you can’t enter this cycle — but you can still read what each championship involves.`
                  : ' Add your class to your profile to check whether you can enter.'}
              </p>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.08}>
        <HowItWorks />
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
            Choose your championship
          </h2>
          <span className="text-xs text-muted">
            {ISC_TRACKS.length + 1} tracks · enter as many as you like
          </span>
        </div>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2">
        {ISC_TRACKS.map((track, i) => {
          const entry = byTrack.get(track.id)
          const state: TrackCardState = !eligible
            ? 'not_started'
            : entry?.status === 'submitted'
              ? 'submitted'
              : entry
                ? 'draft'
                : 'not_started'
          return (
            <Reveal key={track.id} delay={0.12 + i * 0.05} className="h-full">
              <TrackCard
                name={track.name}
                tagline={track.tagline}
                state={state}
                href={eligible ? `/isc/${track.slug}` : undefined}
                teamNote={`On your own or a team of up to ${track.maxTeamSize}`}
                icon={track.icon}
                gradient={track.gradient}
                wash={track.wash}
                accent={track.accent}
                verb={track.verb}
                art={track.art}
              />
            </Reveal>
          )
        })}

        <Reveal delay={0.27} className="h-full">
          <TrackCard
            name={PUZZLE_MASTER.name}
            tagline={PUZZLE_MASTER.tagline}
            state="not_started"
            href={eligible ? `/isc/${PUZZLE_MASTER.slug}` : undefined}
            teamNote="Individual only"
            icon={PUZZLE_MASTER.icon}
            gradient={PUZZLE_MASTER.gradient}
            wash={PUZZLE_MASTER.wash}
            accent={PUZZLE_MASTER.accent}
            verb={PUZZLE_MASTER.verb}
            art={PUZZLE_MASTER.art}
          />
        </Reveal>
      </div>
    </div>
  )
}
