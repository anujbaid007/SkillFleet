import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * One headline figure.
 *
 * The number is the loudest thing on the card by a wide margin — a KPI strip
 * exists to be read from across the room, and the old tiles set the figure at
 * roughly the same weight as its own caption.
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'neutral',
  /** 0–100. Draws a thin progress track under the figure when given. */
  progress,
  footer,
}: {
  label: string
  value: number | string
  sub?: string
  icon?: LucideIcon
  tone?: 'neutral' | 'primary' | 'positive' | 'warning' | 'teal'
  progress?: number
  footer?: ReactNode
}) {
  const tones = {
    neutral: { fig: 'text-foreground', badge: 'bg-slate-100 text-slate-500', bar: 'bg-slate-400' },
    primary: { fig: 'text-primary', badge: 'bg-primary/[0.08] text-primary', bar: 'bg-primary' },
    positive: {
      fig: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-600',
      bar: 'bg-emerald-500',
    },
    warning: { fig: 'text-amber-500', badge: 'bg-amber-50 text-amber-600', bar: 'bg-amber-400' },
    teal: {
      fig: 'text-accent-teal',
      badge: 'bg-accent-teal/10 text-accent-teal',
      bar: 'bg-accent-teal',
    },
  }[tone]

  return (
    <div className="dash-panel p-5 flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-muted uppercase tracking-wider">{label}</p>
        {Icon && (
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tones.badge}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      <p className={`font-display text-[2.5rem] leading-none font-bold mt-3 ${tones.fig}`}>
        {value}
      </p>

      {typeof progress === 'number' && (
        <div className="h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full ${tones.bar}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {sub && <p className="text-xs text-muted mt-2.5 leading-relaxed">{sub}</p>}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </div>
  )
}
