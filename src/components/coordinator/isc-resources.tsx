import { Download, FileText, Lock, Users } from 'lucide-react'
import { ISC_TRACKS, PUZZLE_MASTER } from '@/lib/isc/tracks'
import { HowItWorks } from '@/components/isc/how-it-works'

/** dd Mon yyyy, in IST, matching how deadlines read elsewhere. */
function deadlineLabel(iso: string | undefined): string {
  if (!iso) return 'To be announced'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'To be announced'
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Everything a coordinator needs to brief their school, available before an
 * admin has approved them. Waiting on a review is exactly when they want to
 * read the rules and talk to their students — not after.
 */
export function IscResources({ deadlines }: { deadlines: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <HowItWorks />

      <div className="clay-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
            The four championships
          </h2>
          <span className="isc-rule h-1 w-16 shrink-0" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ISC_TRACKS.map((track) => (
            <div
              key={track.id}
              className={`relative overflow-hidden rounded-2xl border border-black/[0.05] bg-gradient-to-br p-4 ${track.wash} to-transparent`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${track.gradient}`}
                >
                  <track.icon className="h-4 w-4 text-white" />
                </span>
                <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-foreground">
                  Closes {deadlineLabel(deadlines[track.id])}
                </span>
              </div>

              <h3 className="font-display mt-3 font-bold text-foreground">{track.name}</h3>
              <p className="mt-1 text-xs text-muted">{track.brief}</p>

              <p className="mt-3 text-[11px] font-bold tracking-wide text-foreground/60 uppercase">
                What they need ready
              </p>
              <ul className="mt-1 space-y-1">
                {track.prepare.map((item) => (
                  <li key={item} className="flex gap-2 text-xs text-muted">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/40"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-foreground">
                <span className="font-bold">Prize · </span>
                {track.prize}
              </p>

              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted">
                <Users className="h-3 w-3" />
                On their own or a team of up to {track.maxTeamSize}
              </p>
            </div>
          ))}

          <div
            className={`relative overflow-hidden rounded-2xl border border-black/[0.05] bg-gradient-to-br p-4 ${PUZZLE_MASTER.wash} to-transparent sm:col-span-2`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${PUZZLE_MASTER.gradient}`}
              >
                <PUZZLE_MASTER.icon className="h-4 w-4 text-white" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-muted">
                <Lock className="h-3 w-3" />
                {PUZZLE_MASTER.note}
              </span>
            </div>
            <h3 className="font-display mt-3 font-bold text-foreground">{PUZZLE_MASTER.name}</h3>
            <p className="mt-1 text-xs text-muted">{PUZZLE_MASTER.tagline}</p>
            <p className="mt-2 text-xs text-muted">{PUZZLE_MASTER.divisions}</p>
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-foreground">
              <span className="font-bold">Prize · </span>
              {PUZZLE_MASTER.prize}
            </p>
          </div>
        </div>
      </div>

      <a
        href="/decks/ISC-School-Deck.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="clay-card dash-panel-link flex items-center gap-4 p-5 sm:p-6"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light">
          <FileText className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-foreground">The ISC school deck</p>
          <p className="text-xs text-muted">
            The full programme to share with your principal and staff — PDF, 6.6 MB.
          </p>
        </div>
        <Download className="h-4 w-4 shrink-0 text-muted" />
      </a>
    </div>
  )
}
