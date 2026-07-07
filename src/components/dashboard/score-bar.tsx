'use client'

import { motion } from 'motion/react'

// `score_levels.color_class` is a `text-*` Tailwind class. We need the
// corresponding background color for the bar fill. We can't do
// `bg-${cls.replace('text-','')}` because Tailwind's scanner won't detect
// dynamically-constructed class names — so we map to CSS variables instead.
const LEVEL_BAR_COLOR: Record<string, string> = {
  'text-accent-yellow': 'var(--color-accent-yellow)',
  'text-accent-teal':   'var(--color-accent-teal)',
  'text-primary':       'var(--color-primary)',
  'text-accent-purple': 'var(--color-accent-purple)',
  'text-accent-pink':   'var(--color-accent-pink)',
}

interface ScoreBarProps {
  /** Raw internal score 0–1000 (sum of baseline_score + accrued_score) */
  total: number
  /** score_levels.color_class value, e.g. 'text-accent-teal' */
  levelColorClass: string
  className?: string
}

export function ScoreBar({ total, levelColorClass, className = '' }: ScoreBarProps) {
  // Convert to display scale (0–100) — same logic as internalToDisplay() in @/lib/scoring.
  // Inlined here to keep ScoreBar self-contained (no server-only lib imports in a 'use client').
  const displayPct = Math.min(Math.round(Math.max(0, total) / 10), 100)
  const barColor = LEVEL_BAR_COLOR[levelColorClass] ?? 'var(--color-primary)'

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-xs text-muted">
        <span>{total} pts</span>
        <span>{displayPct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${displayPct}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.1 }}
        />
      </div>
    </div>
  )
}
