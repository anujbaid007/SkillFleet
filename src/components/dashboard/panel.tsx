import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * One panel of a dashboard, with the chrome every panel shares.
 *
 * Every analytics panel across the admin and coordinator dashboards renders
 * through this, so a page reads as one instrument rather than a pile of
 * separately-invented cards — which is most of what made the old pages feel
 * unfinished.
 */
export function Panel({
  title,
  subtitle,
  icon: Icon,
  action,
  padded = true,
  className = '',
  children,
}: {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** Top-right slot: an export button, a legend, a "view all" link. */
  action?: ReactNode
  /** Off for panels whose body is a full-bleed table or list. */
  padded?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`dash-panel flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <span className="w-8 h-8 rounded-lg bg-primary/[0.08] text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display font-bold text-foreground text-[15px] leading-tight">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-muted mt-1 leading-relaxed">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={`flex-1 ${padded ? 'px-5 pb-5' : 'pb-1'}`}>{children}</div>
    </section>
  )
}

/** Groups panels under a labelled band, so a long page reads as zones. */
export function DashboardSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2 className="font-display font-bold text-foreground text-lg">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

/** Consistent empty copy inside a panel. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted py-6 text-center">{children}</p>
}
