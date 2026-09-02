import type { ReactNode } from 'react'

/**
 * Shared shell for /privacy and /terms.
 *
 * Legal pages are read to find one specific answer, not front to back, so the
 * section list is a real table of contents with anchors rather than decoration.
 */
export function LegalDoc({
  updated,
  intro,
  sections,
}: {
  updated: string
  intro: ReactNode
  sections: { id: string; title: string; body: ReactNode }[]
}) {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="clay-card p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Last updated {updated}
          </p>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-foreground/80">{intro}</div>
        </div>

        <nav aria-label="Contents" className="clay-card mt-5 p-5 sm:p-6">
          <h2 className="font-display text-base font-bold text-foreground">On this page</h2>
          <ol className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id} className="flex gap-2 text-sm">
                <span className="font-display font-bold text-primary/50 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <a href={`#${s.id}`} className="text-muted hover:text-primary hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-5 space-y-5">
          {sections.map((s, i) => (
            <article key={s.id} id={s.id} className="clay-card scroll-mt-28 p-6 sm:p-8">
              <h2 className="font-display flex items-baseline gap-3 text-lg font-bold text-foreground sm:text-xl">
                <span className="text-primary/45 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-foreground/80">
                {s.body}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Bulleted list with the spacing the rest of the document uses. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
