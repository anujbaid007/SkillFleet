import Link from 'next/link'
import { ArrowUpRight, BookOpen, Download, FileText } from 'lucide-react'

/*
  Two ways to read about the championship without being signed in to it: the
  public guide page, which is the same thing outreach and ads point at, and
  the deck a student can hand to a parent.

  Both open in a new tab. The guide sits outside the platform shell, so
  navigating in place would drop the sidebar and lose the reader's spot.
*/
export function GuideAndDeck() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link
        href="/isc-2026"
        target="_blank"
        rel="noopener noreferrer"
        className="clay-card dash-panel-link flex items-center gap-4 p-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-teal">
          <BookOpen className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-foreground">ISC 2026 guide</p>
          <p className="text-xs text-muted">
            Rules, prizes and dates on one page. Opens in a new tab.
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </Link>

      <a
        href="/decks/ISC-Student-Deck.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="clay-card dash-panel-link flex items-center gap-4 p-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-teal to-primary">
          <FileText className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-foreground">Download the deck</p>
          <p className="text-xs text-muted">
            The championship in 12 slides, to show a parent or your class. PDF, 6.6 MB.
          </p>
        </div>
        <Download className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </a>
    </div>
  )
}
