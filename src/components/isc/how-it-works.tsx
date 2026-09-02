const STAGES = [
  {
    n: '01',
    title: 'School level',
    body: 'Enter online, free. Skill Fleet judges every entry centrally.',
    note: 'Free to enter',
  },
  {
    n: '02',
    title: 'State championship',
    body: 'The top three in each track from your school go through to the state round.',
    note: 'Opens later',
  },
  {
    n: '03',
    title: 'National finals',
    body: 'The top three in each track from every state meet in person.',
    note: 'April 2027',
  },
]

/** The three rounds from the Skill Fleet deck, drawn as a route rather than a
    list, so a student can see where entering actually leads. Only the first
    round is open; the other two are announcements, and are drawn as the empty
    stops they are. */
export function HowItWorks() {
  return (
    <div className="clay-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
          Three rounds to the national finals
        </h2>
        <span className="isc-rule h-1 w-16 shrink-0" />
      </div>

      <ol className="relative mt-4 grid gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
        {STAGES.map((s, i) => {
          // Only the first round is actually open.
          const open = i === 0
          return (
            /*
              One compact row per round on a phone, three stops from `sm` up.
              Stacked as full cards these three ran to roughly 1,500px, pushing
              the championships themselves — the reason for the page — well
              below the fold.
            */
            <li
              key={s.n}
              className={`relative flex items-start gap-3 rounded-2xl border p-4 sm:block ${
                open
                  ? 'border-primary/25 bg-gradient-to-br from-primary/[0.14] via-accent-purple/[0.05] to-transparent'
                  : 'border-black/[0.05] bg-black/[0.015]'
              }`}
            >
              <span
                className={`font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  open
                    ? 'isc-halo bg-gradient-to-br from-primary to-primary-light text-white'
                    : 'border-2 border-dashed border-primary/25 bg-white text-primary/45'
                }`}
              >
                {s.n}
              </span>

              {/*
                The route between the stops, drawn one gap at a time. A single
                line spanning the row showed through the panels' translucent
                washes and struck out the text; this only ever occupies the
                16px gap to the next stop. top-9 is the badge's centre: 16px of
                panel padding plus half of the 40px badge.
              */}
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-9 -right-4 hidden w-4 border-t-2 border-dashed border-primary/30 sm:block"
                />
              )}
              <div className="min-w-0">
                <h3 className="font-display font-bold text-foreground sm:mt-3">{s.title}</h3>
                <p className="mt-1 text-xs text-muted">{s.body}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold sm:mt-3 ${
                    open ? 'bg-green-100 text-green-700' : 'bg-white text-muted'
                  }`}
                >
                  {s.note}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
