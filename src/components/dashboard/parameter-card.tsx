// Server Component — no 'use client'. Renders ScoreBar (a Client Component)
// by passing serializable props across the SC→CC boundary.
import { ScoreBar } from './score-bar'

interface ParameterCardProps {
  name: string
  total: number
  levelName: string
  /** score_levels.color_class, e.g. 'text-accent-teal'. Drives the card tint,
   *  level pill, accent dot, and the ScoreBar fill. */
  levelColorClass: string
}

// Static maps (Tailwind can't scan dynamically-built class names) from the
// level's text color to a tinted card wash, pill, and dot.
const LEVEL_TINT: Record<string, string> = {
  'text-accent-yellow': 'from-accent-yellow/[0.14]',
  'text-accent-teal': 'from-accent-teal/[0.14]',
  'text-primary': 'from-primary/[0.14]',
  'text-accent-purple': 'from-accent-purple/[0.14]',
  'text-accent-pink': 'from-accent-pink/[0.14]',
}

const LEVEL_PILL: Record<string, string> = {
  'text-accent-yellow': 'bg-accent-yellow/15 text-accent-yellow',
  'text-accent-teal': 'bg-accent-teal/15 text-accent-teal',
  'text-primary': 'bg-primary/15 text-primary',
  'text-accent-purple': 'bg-accent-purple/15 text-accent-purple',
  'text-accent-pink': 'bg-accent-pink/15 text-accent-pink',
}

const LEVEL_DOT: Record<string, string> = {
  'text-accent-yellow': 'bg-accent-yellow',
  'text-accent-teal': 'bg-accent-teal',
  'text-primary': 'bg-primary',
  'text-accent-purple': 'bg-accent-purple',
  'text-accent-pink': 'bg-accent-pink',
}

export function ParameterCard({ name, total, levelName, levelColorClass }: ParameterCardProps) {
  const tint = LEVEL_TINT[levelColorClass] ?? 'from-primary/[0.14]'
  const pill = LEVEL_PILL[levelColorClass] ?? 'bg-primary/15 text-primary'
  const dot = LEVEL_DOT[levelColorClass] ?? 'bg-primary'

  return (
    <div className="clay-card p-5 space-y-3 relative overflow-hidden">
      {/* colour wash tinted to the skill's level */}
      <div className={`absolute inset-0 bg-gradient-to-br ${tint} to-transparent pointer-events-none`} />
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
            <h3 className="font-display font-bold text-foreground text-sm leading-tight truncate">{name}</h3>
          </div>
          <span className={`text-xs font-bold shrink-0 px-2.5 py-0.5 rounded-full ${pill}`}>
            {levelName}
          </span>
        </div>
        <ScoreBar total={total} levelColorClass={levelColorClass} />
      </div>
    </div>
  )
}
