import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/*
  One titled card per part of a form, so a long form reads as a few short
  steps rather than one endless column. Chrome only: the fields inside keep
  their own names and ids, so the action behind the form is untouched.
*/
export function FormSection({
  icon: Icon,
  tint,
  title,
  hint,
  children,
}: {
  icon: LucideIcon
  /** Background and ink for the icon tile, e.g. `bg-primary/10 text-primary`. */
  tint: string
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="clay-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
