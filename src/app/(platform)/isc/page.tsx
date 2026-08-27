import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { ISC_TRACKS, PUZZLE_MASTER } from '@/lib/isc/tracks'
import { isEligibleClass } from '@/lib/isc/validate'
import { iscGroupForClass, iscGroupLabel } from '@/lib/isc/groups'
import { getMyIscEntries, getMyPendingInvites } from '@/app/actions/isc'
import { TrackCard, type TrackCardState } from '@/components/isc/track-card'
import { HowItWorks } from '@/components/isc/how-it-works'
import { PendingInvites } from '@/components/isc/pending-invites'

export default async function IscPage() {
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

  const eligible = isEligibleClass(profile?.school_class)
  const entries = eligible ? await getMyIscEntries() : []
  // A pending invite is not one of "my championships" yet — it must not make
  // a track card read as draft/submitted before the student has agreed to join.
  const byTrack = new Map(entries.filter((e) => e.isAccepted).map((e) => [e.track, e]))
  const invites = eligible ? await getMyPendingInvites() : []
  const group = eligible ? iscGroupForClass(profile?.school_class) : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="International Skill Championship"
        icon={Trophy}
        title="ISC 2026"
        subtitle="Four championships, open to Classes 5 to 12. Enter as many as you like — school screening is free."
      />

      <PendingInvites invites={invites} />

      {group && (
        <p className="text-sm text-muted">
          You&apos;re in {iscGroupLabel(group)}. You can team up with classmates from those classes
          at your school.
        </p>
      )}

      {!eligible && (
        <Reveal delay={0.05}>
          <div className="clay-card p-6 flex items-start gap-4">
            <span className="w-11 h-11 rounded-2xl bg-black/[0.05] flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-muted" />
            </span>
            <div>
              <p className="font-display font-bold text-foreground">Not open to your class yet</p>
              <p className="text-sm text-muted mt-1">
                ISC 2026 is for{' '}
                <span className="font-semibold text-foreground">Classes 5 to 12</span>.
                {profile?.school_class
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
            <Reveal key={track.id} delay={0.1 + i * 0.05} className="h-full">
              <TrackCard
                name={track.name}
                tagline={track.tagline}
                state={state}
                href={eligible ? `/isc/${track.slug}` : undefined}
                teamNote={`On your own or a team of up to ${track.maxTeamSize}`}
                icon={track.icon}
                gradient={track.gradient}
                tint={track.tint}
                accent={track.accent}
              />
            </Reveal>
          )
        })}

        <Reveal delay={0.25} className="h-full">
          <TrackCard
            name={PUZZLE_MASTER.name}
            tagline={PUZZLE_MASTER.tagline}
            state="coming_soon"
            teamNote="Individual only"
            icon={PUZZLE_MASTER.icon}
            gradient={PUZZLE_MASTER.gradient}
            tint={PUZZLE_MASTER.tint}
            accent={PUZZLE_MASTER.accent}
          />
        </Reveal>
      </div>
    </div>
  )
}
