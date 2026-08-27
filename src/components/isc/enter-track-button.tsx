import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * Opens the entry form. Deliberately a plain link, not a mutation: clicking
 * through to read the questions must not create anything, because a student's
 * own entry blocks anyone from inviting them to a team for that track. The
 * entry is created by the first real action — saving, or adding a teammate.
 *
 * Consent is a one-time step for the season, so it is asked before the form
 * rather than on every save.
 */
export function EnterTrackButton({ slug, needsConsent }: { slug: string; needsConsent: boolean }) {
  const href = needsConsent
    ? `/isc/consent?next=${encodeURIComponent(`/isc/${slug}?start=1`)}`
    : `/isc/${slug}?start=1`

  return (
    <Link
      href={href}
      className="clay-button bg-cta text-white px-6 h-12 text-sm font-semibold inline-flex items-center gap-2"
    >
      Start your entry
      <ArrowRight className="w-4 h-4" />
    </Link>
  )
}
