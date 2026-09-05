import { ExternalLink, Wrench } from 'lucide-react'
import type { TrackSection } from '@/lib/isc/tracks'

/*
  The full brief for one championship: a few short paragraphs a student can
  actually act on, and, where building something is the task, the places
  that will build it from a description without any setup.
*/
export function TrackAbout({
  name,
  description,
  sections,
  tools,
  accent,
}: {
  name: string
  description: string[]
  sections?: TrackSection[]
  tools?: { name: string; url: string; note: string }[]
  accent: string
}) {
  return (
    <section className="clay-card p-4 sm:p-6">
      <h2 className="font-display font-bold text-foreground">About {name}</h2>
      <div className="mt-2 space-y-3">
        {description.map((para) => (
          <p key={para.slice(0, 40)} className="text-sm leading-relaxed text-muted">
            {para}
          </p>
        ))}
      </div>

      {sections && sections.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {sections.map((sec) => {
            const List = sec.ordered ? 'ol' : 'ul'
            return (
              <div key={sec.title} className="rounded-2xl border border-black/[0.05] bg-white/70 p-4">
                <h3 className="text-sm font-semibold text-foreground">{sec.title}</h3>
                {sec.body && <p className="mt-1 text-xs leading-relaxed text-muted">{sec.body}</p>}
                {sec.items && (
                  <List className={`mt-2 space-y-1.5 ${sec.ordered ? 'list-decimal pl-4' : ''}`}>
                    {sec.items.map((item) => (
                      <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted">
                        {!sec.ordered && <span aria-hidden className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${accent.replace('text-', 'bg-')}`} />}
                        <span>{item}</span>
                      </li>
                    ))}
                  </List>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tools && tools.length > 0 && (
        <div className="mt-5 rounded-2xl border border-black/[0.05] bg-white/70 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wrench className={`h-4 w-4 ${accent}`} aria-hidden="true" />
            Where you can build it
          </p>
          <p className="mt-1 text-xs text-muted">
            Suggestions, not requirements: each turns a plain-English description into a working app with a link you can share. Any language or platform is fine.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {tools.map((tool) => (
              <li key={tool.url}>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 rounded-xl border-2 border-black/[0.05] bg-white px-3 py-2.5 transition-colors hover:border-primary"
                >
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted group-hover:text-primary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{tool.name}</span>
                    <span className="block text-xs text-muted">{tool.note}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
