import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * Opens the entry form. Deliberately a plain link, not a mutation: clicking
 * through to read the questions must not create anything, because a student's
 * own entry blocks anyone from inviting them to a team for that track. The
 * entry is created by the first real action — saving, or adding a teammate.
 *
 * There is no separate consent step: the account's registration consent
 * already covers taking part, so the form opens directly.
 */
export function EnterTrackButton({ slug }: { slug: string }) {
  return (
    <Link
      href={`/isc/${slug}?start=1#entry`}
      className="clay-button bg-cta text-white px-6 h-12 text-sm font-semibold flex sm:inline-flex w-full sm:w-auto items-center justify-center gap-2"
    >
      Start your entry
      <ArrowRight className="w-4 h-4" />
    </Link>
  )
}
