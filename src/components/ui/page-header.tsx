import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Reveal } from './reveal'

// Branded page header used across the app: an optional eyebrow chip (icon +
// label), a display-font title, a subtitle, and an optional right-aligned
// action (e.g. a "New offering" button). Animates in on load.
export function PageHeader({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string
  icon?: LucideIcon
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <Reveal>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-muted mt-1 text-sm max-w-2xl">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Reveal>
  )
}
