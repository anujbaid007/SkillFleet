import { AlertTriangle } from 'lucide-react'

/**
 * One panel could not load. The rest of the page still renders: a whole admin
 * screen going blank because a single tile timed out is worse than the tile
 * saying so, and nothing here is cached, so a reload really does retry.
 */
export function SectionFailed({ title, message }: { title: string; message: string }) {
  return (
    <div className="clay-card flex items-start gap-3 p-5" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-pink" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title} could not load</p>
        <p className="mt-0.5 text-xs text-muted">{message}</p>
      </div>
    </div>
  )
}
