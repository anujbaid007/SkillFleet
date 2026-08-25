import Link from 'next/link'
import { GraduationCap, School } from 'lucide-react'

/**
 * Which kind of account is being created.
 *
 * Implemented as two links rather than client-side state: /signup and
 * /signup/coordinator are real, separately-linkable pages with different
 * fields and different server actions, and switching should be a navigation
 * rather than a form that silently changes what it submits.
 */
export function SignupTypeToggle({ active }: { active: 'student' | 'coordinator' }) {
  const base =
    'flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-colors'
  const on = 'bg-primary text-white shadow-sm'
  const off = 'text-muted hover:text-foreground'

  return (
    <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/[0.04] mb-6">
      <Link href="/signup" className={`${base} ${active === 'student' ? on : off}`}>
        <GraduationCap className="w-4 h-4" />
        I&apos;m a student
      </Link>
      <Link
        href="/signup/coordinator"
        className={`${base} ${active === 'coordinator' ? on : off}`}
      >
        <School className="w-4 h-4" />
        I&apos;m a coordinator
      </Link>
    </div>
  )
}
