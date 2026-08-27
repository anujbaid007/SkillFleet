import { Trophy, Users, Sparkles } from 'lucide-react'

export interface RankInfo {
  total_points: number
  student_rank: number
  cohort_size: number
  percentile: number
  band_label: string
}

/** A percentile only says something once there are enough peers to compare against. */
const MIN_COHORT_FOR_PERCENTILE = 5

export function RankCard({ rank, name }: { rank: RankInfo; name?: string }) {
  const { total_points, student_rank, cohort_size, percentile, band_label } = rank
  const who = name ?? 'You'
  const isSelf = !name

  const alone = cohort_size <= 1
  const showPercentile = cohort_size >= MIN_COHORT_FOR_PERCENTILE

  return (
    <div className="clay-card p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-yellow/[0.08] via-primary/[0.05] to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-center gap-5 flex-wrap">
        {/* Total */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-yellow to-accent-pink flex items-center justify-center text-white shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-foreground leading-none">{total_points}</p>
            <p className="text-xs text-muted mt-1">total points</p>
          </div>
        </div>

        <div className="hidden sm:block w-px h-12 bg-black/[0.07]" />

        {/* Standing */}
        <div className="flex-1 min-w-[12rem]">
          {alone ? (
            <>
              <p className="font-display font-bold text-foreground inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent-yellow" />
                {isSelf ? 'First in the' : `${who} is first in the`} {band_label} group
              </p>
              <p className="text-xs text-muted mt-0.5">
                Rankings get more meaningful as more students join this age group.
              </p>
            </>
          ) : (
            <>
              <p className="font-display font-bold text-foreground">
                Rank <span className="text-primary">#{student_rank}</span> of {cohort_size}
              </p>
              <p className="text-xs text-muted mt-0.5 inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                among {band_label} students
                {showPercentile && (
                  <>
                    {' · '}
                    <span className="font-semibold text-accent-teal">Top {percentile}%</span>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
