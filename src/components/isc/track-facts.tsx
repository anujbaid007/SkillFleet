import { Check, Trophy } from 'lucide-react'

export function TrackFacts({
  prize,
  prepare,
  accent,
}: {
  prize: string
  prepare: string[]
  accent: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="clay-card p-5">
        <h2 className="font-display font-bold text-foreground inline-flex items-center gap-2">
          <Trophy className={`w-4 h-4 ${accent}`} />
          What the winners get
        </h2>
        <p className="text-sm text-muted mt-2">{prize}</p>
        <p className="text-xs text-muted mt-3">
          Everyone who enters receives a digital participation certificate.
        </p>
      </div>

      <div className="clay-card p-5">
        <h2 className="font-display font-bold text-foreground">What you’ll need</h2>
        <ul className="mt-2 space-y-2">
          {prepare.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted">
              <Check className={`w-4 h-4 mt-0.5 shrink-0 ${accent}`} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
