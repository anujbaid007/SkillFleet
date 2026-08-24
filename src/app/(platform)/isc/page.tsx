import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ISC_TRACKS, PUZZLE_MASTER } from '@/lib/isc/tracks'
import { isEligibleClass } from '@/lib/isc/validate'
import { getMyIscEntries } from '@/app/actions/isc'
import { TrackCard, type TrackCardState } from '@/components/isc/track-card'

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
  const byTrack = new Map(entries.map((e) => [e.track, e]))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="International Skill Championship"
        icon={Trophy}
        title="ISC 2026"
        subtitle="Four championships. Enter as many as you like — school screening is free."
      />

      {!eligible && (
        <div className="clay-card p-6 text-sm text-muted">
          ISC 2026 is open to <span className="font-semibold text-foreground">Classes 5 to 12</span>.
          {profile?.school_class
            ? ` Your profile says ${profile.school_class}, so you can't enter this cycle.`
            : ' Add your class to your profile to check whether you can enter.'}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {ISC_TRACKS.map((track) => {
          const entry = byTrack.get(track.id)
          const state: TrackCardState = !eligible
            ? 'not_started'
            : entry?.status === 'submitted'
              ? 'submitted'
              : entry
                ? 'draft'
                : 'not_started'
          return (
            <TrackCard
              key={track.id}
              name={track.name}
              tagline={track.tagline}
              state={state}
              href={eligible ? `/isc/${track.slug}` : undefined}
              teamNote={`On your own or a team of up to ${track.maxTeamSize}`}
            />
          )
        })}

        <TrackCard
          name={PUZZLE_MASTER.name}
          tagline={PUZZLE_MASTER.tagline}
          state="coming_soon"
          teamNote="Individual only"
        />
      </div>
    </div>
  )
}
