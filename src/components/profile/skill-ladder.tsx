import { Sparkles, Target } from 'lucide-react'

export interface SkillRow {
  parameterId: string
  name: string
  /** Raw internal points, used for ordering and shown as the figure. */
  total: number
  /** 0–100, what the bar fills to. */
  percent: number
  levelName: string
  /** score_levels.color_class, e.g. 'text-accent-teal'. */
  levelColorClass: string
}

// Tailwind cannot scan class names built at runtime, so the level's colour is
// mapped to real classes here.
const BAR: Record<string, string> = {
  'text-accent-yellow': 'bg-accent-yellow',
  'text-accent-teal': 'bg-accent-teal',
  'text-primary': 'bg-primary',
  'text-accent-purple': 'bg-accent-purple',
  'text-accent-pink': 'bg-accent-pink',
}

const PILL: Record<string, string> = {
  'text-accent-yellow': 'bg-accent-yellow/15 text-[#8a5a00]',
  'text-accent-teal': 'bg-accent-teal/15 text-accent-teal',
  'text-primary': 'bg-primary/15 text-primary',
  'text-accent-purple': 'bg-accent-purple/15 text-accent-purple',
  'text-accent-pink': 'bg-accent-pink/15 text-accent-pink',
}

/**
 * Every skill on one axis, strongest first.
 *
 * This replaced a grid of six identical cards, each showing a name, a level and
 * a number. Six tiles of equal size say nothing about which skill is ahead —
 * the reader has to compare figures by hand. Bars on a shared scale answer
 * "where am I strong, where am I not" in a glance, which is the only question
 * this page exists to answer.
 */
export function SkillLadder({ skills }: { skills: SkillRow[] }) {
  const ranked = [...skills].sort((a, b) => b.total - a.total)
  const scored = ranked.filter((s) => s.total > 0)

  return (
    <div className="clay-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
          Every skill, strongest first
        </h2>
        <span className="text-xs text-muted">
          {scored.length} of {ranked.length} scored
        </span>
      </div>

      <ol className="mt-5 space-y-4">
        {ranked.map((s, i) => (
          <li key={s.parameterId}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="font-display w-5 shrink-0 text-xs font-bold text-muted tabular-nums">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-semibold text-foreground">{s.name}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    PILL[s.levelColorClass] ?? PILL['text-primary']
                  }`}
                >
                  {s.levelName}
                </span>
              </div>
              <span className="font-display shrink-0 text-sm font-bold text-foreground tabular-nums">
                {s.total}
              </span>
            </div>

            <div className="mt-1.5 ml-7 h-2 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className={`h-full rounded-full ${BAR[s.levelColorClass] ?? BAR['text-primary']}`}
                // Width is the one value that genuinely varies per row, so it
                // has to be inline — a Tailwind class cannot carry it.
                style={{ width: `${Math.max(s.percent, s.total > 0 ? 3 : 0)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * The two skills worth saying something about.
 *
 * A list of scores is data; "this is your strongest, this is the one to work
 * on" is the reading of it, and it is the thing a student or a parent actually
 * takes away. Hidden entirely until something has been scored, because
 * "strongest: 0 points" is worse than saying nothing.
 */
export function SkillHighlights({ skills }: { skills: SkillRow[] }) {
  const scored = skills.filter((s) => s.total > 0)
  if (scored.length < 2) return null

  const ranked = [...scored].sort((a, b) => b.total - a.total)
  const best = ranked[0]
  const focus = ranked[ranked.length - 1]

  const cards = [
    {
      key: 'best',
      icon: Sparkles,
      label: 'Strongest',
      name: best.name,
      note: `${best.levelName} · ${best.total} pts`,
      wash: 'from-accent-teal/[0.16]',
      badge: 'from-accent-teal to-primary',
    },
    {
      key: 'focus',
      icon: Target,
      label: 'Worth working on',
      name: focus.name,
      note: `${focus.levelName} · ${focus.total} pts`,
      wash: 'from-accent-yellow/[0.18]',
      badge: 'from-accent-yellow to-accent-pink',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c) => (
        <div key={c.key} className="clay-card relative overflow-hidden p-5">
          <span
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.wash} to-transparent`}
          />
          <div className="relative flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.badge}`}
            >
              <c.icon className="h-4 w-4 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-wider text-foreground/50 uppercase">
                {c.label}
              </p>
              <p className="font-display truncate text-lg font-bold text-foreground">{c.name}</p>
              <p className="text-xs text-muted">{c.note}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
