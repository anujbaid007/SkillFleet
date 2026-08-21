import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'

/**
 * Shown when the school a student typed in was rejected by an admin.
 *
 * Deliberately a notice rather than a redirect: their profile is still valid
 * and nothing they can do right now is blocked, so interrupting them would
 * cost more than it gains. It disappears on its own once they pick a listed
 * school.
 */
export function SchoolRejectedNotice({
  schoolName,
  reason,
}: {
  schoolName: string
  reason: string | null
}) {
  return (
    <div className="clay-card p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-yellow to-accent-pink flex items-center justify-center text-white shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-foreground text-sm">
          We couldn&apos;t verify “{schoolName}”
        </p>
        <p className="text-xs text-muted">
          {reason ? `${reason} — please` : 'Please'} pick your school again from the list.
        </p>
      </div>
      <Link
        href="/account"
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        Update <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
