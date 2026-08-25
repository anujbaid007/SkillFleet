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

/** The three stages from the Skill Fleet deck, so a student can see where
    entering actually leads rather than just filling a form. */
export function HowItWorks() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {STAGES.map((s, i) => (
        <div key={s.n} className="clay-card p-5 relative">
          <span className="font-display text-2xl font-bold text-primary/25">{s.n}</span>
          <h3 className="font-display font-bold text-foreground mt-1">{s.title}</h3>
          <p className="text-xs text-muted mt-1">{s.body}</p>
          <span
            className={`inline-block mt-3 text-[10px] font-bold px-2 py-1 rounded-full ${
              i === 0 ? 'bg-green-50 text-green-700' : 'bg-black/[0.05] text-muted'
            }`}
          >
            {s.note}
          </span>
        </div>
      ))}
    </div>
  )
}
