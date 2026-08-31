const STAGES = [
  {
    n: '01',
    title: 'School screening',
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

/**
 * The open stage's purple wash.
 *
 * Applied as an inline style rather than Tailwind's bg-gradient-* utilities on
 * purpose: .clay-card declares `background: #ffffff` and `border: 2px solid …`
 * as CSS *shorthands*, which reset background-image to none and overwrite any
 * border-color utility at the same specificity. A gradient class simply does
 * not survive that, so the value has to come from the style attribute.
 *
 * Colours are read from the palette tokens rather than hardcoded, so the card
 * still tracks the design system.
 */
const OPEN_STAGE_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(135deg, color-mix(in srgb, var(--color-accent-purple) 16%, transparent), color-mix(in srgb, var(--color-primary) 16%, transparent), color-mix(in srgb, var(--color-primary-light) 22%, transparent))',
  borderColor: 'color-mix(in srgb, var(--color-primary) 35%, transparent)',
}

/** The three stages from the Skill Fleet deck, so a student can see where
    entering actually leads rather than just filling a form. */
export function HowItWorks() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {STAGES.map((s, i) => {
        // Only the first stage is actually open; the other two are announcements.
        const open = i === 0
        return (
          /*
            One compact row per stage on a phone, three cards from `sm` up.
            Stacked as full cards these three ran to roughly 1,500px, pushing
            the championships themselves — the reason for the page — well below
            the fold. The number moves beside the text rather than above it.
          */
          <div
            key={s.n}
            className="clay-card p-4 sm:p-5 relative flex sm:block items-start gap-3"
            style={open ? OPEN_STAGE_STYLE : undefined}
          >
            <span
              className={`font-display text-xl sm:text-2xl font-bold leading-none mt-0.5 sm:mt-0 shrink-0 ${open ? 'text-primary' : 'text-primary/25'}`}
            >
              {s.n}
            </span>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-foreground sm:mt-1">{s.title}</h3>
              <p className="text-xs text-muted mt-1">{s.body}</p>
              <span
                className={`inline-block mt-2 sm:mt-3 text-[10px] font-bold px-2 py-1 rounded-full ${
                  open ? 'bg-green-50 text-green-700' : 'bg-black/[0.05] text-muted'
                }`}
              >
                {s.note}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
