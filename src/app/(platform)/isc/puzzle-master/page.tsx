import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/session'
import { PUZZLE_MASTER } from '@/lib/isc/tracks'
import { isEligibleClass } from '@/lib/isc/validate'
import { TrackHero } from '@/components/isc/track-hero'
import { TrackFacts } from '@/components/isc/track-facts'
import { PracticeGames } from '@/components/isc/practice-games'

/**
 * Puzzle Master.
 *
 * A static segment rather than a slug handled by [track], because it is not
 * one: the other three championships are entered by saving a submission, and
 * everything that route does — the entry lookup, the team panel, the form, the
 * deadline lock — exists to serve that. Puzzle Master is played live, so the
 * page briefs the student and hands them the practice games instead. There is
 * deliberately no "Ready when you are" block: there is nothing to open.
 */
export default async function PuzzleMasterPage() {
  // Memoised by the layout for this request, so it costs no round trip.
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!isEligibleClass(profile.school_class)) redirect('/isc')

  return (
    <div className="space-y-6">
      <TrackHero
        name={PUZZLE_MASTER.name}
        brief={PUZZLE_MASTER.brief}
        icon={PUZZLE_MASTER.icon}
        gradient={PUZZLE_MASTER.gradient}
        tint={PUZZLE_MASTER.tint}
        teamNote="Individual only"
        // Played live on a date Brainweave sets, so there is no submission
        // deadline to count down to.
        deadlineLabel={null}
        daysLeft={null}
      />

      <TrackFacts
        prize={PUZZLE_MASTER.prize}
        prepare={PUZZLE_MASTER.prepare}
        accent={PUZZLE_MASTER.accent}
      />

      <PracticeGames />
    </div>
  )
}
