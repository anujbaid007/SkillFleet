import { Clock } from 'lucide-react'

/*
  A stand-in for a call to action that is not open yet. Deliberately not a
  button: there is nothing to press, and a disabled button invites people to
  keep trying. `onLight` picks the colours for a white card; otherwise the pill
  sits on one of the gradient banners.
*/
export function ComingSoonPill({ onLight = false, className = '' }: { onLight?: boolean; className?: string }) {
  const tone = onLight
    ? 'bg-black/[0.05] text-muted'
    : 'bg-white/20 text-white ring-1 ring-inset ring-white/30'
  return (
    <span
      aria-label="Coming soon"
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold select-none ${tone} ${className}`}
    >
      <Clock className="w-4 h-4" aria-hidden="true" />
      Coming soon
    </span>
  )
}
