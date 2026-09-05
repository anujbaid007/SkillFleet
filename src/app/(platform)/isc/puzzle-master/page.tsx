import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/session'
import { PUZZLE_MASTER } from '@/lib/isc/tracks'
import { isEligibleClass } from '@/lib/isc/validate'
import { TrackHero } from '@/components/isc/track-hero'
import { TrackFacts } from '@/components/isc/track-facts'
import { TrackAbout } from '@/components/isc/track-about'
import { PracticeGames } from '@/components/isc/practice-games'
import { PuzzleRegister } from '@/components/isc/puzzle-register'
import { getMyIscEntries } from '@/app/actions/isc'

/**
 * Puzzle Master.
 *
 * A static segment rather than a slug handled by [track], because it is not
 * one: the other three championships are entered by saving a submission, and
 * everything that route does — the entry lookup, the team panel, the form, the
 * deadline lock — exists to serve that. Puzzle Master is played live, so the
 * page briefs the student and hands them the practice games instead. The one
 * act is registering, which creates the entry the coordinator sees.
 */
export default async function PuzzleMasterPage() {
  // Memoised by the layout for this request, so it costs no round trip.
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!isEligibleClass(profile.school_class)) redirect('/isc')
  const entries = await getMyIscEntries()
  const registered = entries.some((e) => e.track === PUZZLE_MASTER.id && e.status === 'submitted')

  return (
    <div className="space-y-6">
      <TrackHero
        name={PUZZLE_MASTER.name}
        brief={PUZZLE_MASTER.brief}
        icon={PUZZLE_MASTER.icon}
        gradient={PUZZLE_MASTER.gradient}
        tint={PUZZLE_MASTER.tint}
        teamNote={`Individual only · runs ${PUZZLE_MASTER.window}`}
        // Played live on a date Brainweave sets, so there is no submission
        // deadline to count down to.
        deadlineLabel={null}
        daysLeft={null}
      />

      <TrackAbout name={PUZZLE_MASTER.name} description={PUZZLE_MASTER.description} sections={PUZZLE_MASTER.sections} accent={PUZZLE_MASTER.accent} />

      <TrackFacts
        prize={PUZZLE_MASTER.prize}
        prepare={PUZZLE_MASTER.prepare}
        accent={PUZZLE_MASTER.accent}
      />

      <PuzzleRegister registered={registered} />

      <PracticeGames />
    </div>
  )
}
