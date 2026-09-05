import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/session'
import { PUZZLE_MASTER } from '@/lib/isc/tracks'
import { isEligibleClass } from '@/lib/isc/validate'
import { TrackHero } from '@/components/isc/track-hero'
import { TrackFacts } from '@/components/isc/track-facts'
import { TrackAbout } from '@/components/isc/track-about'
import { PracticeGames } from '@/components/isc/practice-games'
import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { getMyIscEntries } from '@/app/actions/isc'

/**
 * Puzzle Master.
 *
 * A static segment rather than a slug handled by [track], because it is not
 * one: the other three championships are entered by saving a submission, and
 * everything that route does — the entry lookup, the team panel, the form, the
 * deadline lock — exists to serve that. Puzzle Master is played live, so the
 * page briefs the student and hands them the practice games instead. There is
 * nothing to register for: the challenge opens on 1 October and playing it is
 * the entry, so until then the page says when, and the one rule that matters.
 */
export default async function PuzzleMasterPage() {
  // Memoised by the layout for this request, so it costs no round trip.
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!isEligibleClass(profile.school_class)) redirect('/isc')
  const entries = await getMyIscEntries()
  const takenPart = entries.some((e) => e.track === PUZZLE_MASTER.id && e.status === 'submitted')

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

      <div className="clay-card p-4 sm:p-6 flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${takenPart ? 'bg-green-100' : 'bg-accent-yellow/15'}`}>
          {takenPart ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
          ) : (
            <CalendarClock className="h-5 w-5 text-accent-yellow" aria-hidden="true" />
          )}
        </span>
        <div>
          <p className="font-display font-bold text-foreground">
            {takenPart ? 'You have taken part in Puzzle Master' : 'Opens 1 October 2026'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {takenPart
              ? 'Your attempt is recorded and your coordinator can see it. Results follow the round.'
              : `Puzzle Master runs ${PUZZLE_MASTER.window}. There is nothing to register for. You get one valid entry, so practise as much as you can below before you attempt the challenge.`}
          </p>
        </div>
      </div>

      <PracticeGames />
    </div>
  )
}
