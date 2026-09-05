import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * One headline figure.
 *
 * The number is the loudest thing on the card by a wide margin — a KPI strip
 * exists to be read from across the room, and the old tiles set the figure at
 * roughly the same weight as its own caption.
 *
 * Given an `href` the whole card becomes the link, on the .dash-panel-link
 * hover that already exists for clickable panels. A tile on a landing page
 * that reports a queue and cannot open it is a tile that gets read once and
 * then ignored, so the admin overview gives every one of its tiles an href.
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
  href,
}: {
  label: string
  value: number | string
  sub?: string
  icon?: LucideIcon
  tone?: 'neutral' | 'primary' | 'positive' | 'warning' | 'teal'
  progress?: number
  footer?: ReactNode
  /** Makes the whole card a link. Omitted, the card is a plain div. */
  href?: string
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

  const body = (
    <>
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
    </>
  )

  const shell = 'dash-panel p-5 flex flex-col'

  // h-full only on the link: a row of clickable tiles with ragged heights has
  // ragged hover targets. The plain card keeps exactly the height it had.
  if (href) {
    return (
      <Link
        href={href}
        className={`${shell} h-full dash-panel-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
      >
        {body}
      </Link>
    )
  }

  return <div className={shell}>{body}</div>
}
