import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Trophy } from 'lucide-react'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ISC_TRACKS, PUZZLE_MASTER } from '@/lib/isc/tracks'

export const metadata: Metadata = {
  title: 'Join your school on SkillFleet',
  robots: { index: false, follow: false },
}

/**
 * The landing page for a coordinator's share link.
 *
 * Remembers which school the link belongs to, then hands the student to
 * signup. Nothing here is privileged — the school name is already on the
 * public school list — so the page is deliberately readable without an
 * account. The cookie only prefills a form the student can still edit.
 */
export default async function JoinPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params

  // Read with the service-role client: a signed-out visitor is exactly who
  // this link is for, and RLS on `schools` assumes a session.
  const { data: school } = await adminClient
    .from('schools')
    .select('id, name, state, district')
    .eq('id', schoolId)
    .maybeSingle()

  // A dead or mistyped link should still lead somewhere useful.
  if (!school) redirect('/signup')

  // The cookie itself is written by the proxy — a Server Component render is
  // not allowed to set one. This page only has to show the invitation.

  // Already signed in? The cookie is set, so send them where it gets used.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/onboarding/details')

  const tracks = [...ISC_TRACKS, PUZZLE_MASTER]

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="isc-stage relative overflow-hidden rounded-[22px] border-2 border-white p-6 shadow-[8px_8px_24px_rgba(80,50,160,0.10)] sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm">
            <Trophy className="h-3.5 w-3.5" />
            International Skill Championship 2026
          </span>

          <h1 className="font-display mt-4 text-2xl font-bold text-foreground sm:text-3xl">
            You&apos;re invited to enter with{' '}
            <span className="text-primary">{school.name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {school.district}, {school.state}
          </p>

          <div className="isc-rule mt-4 h-[5px] w-32" />

          <p className="mt-4 text-sm text-foreground/75">
            Four championships, open to Classes 5 to 12. Enter as many as you like — school
            screening is free.
          </p>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {tracks.map((t) => (
              <li
                key={t.name}
                className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-foreground"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${t.gradient}`}
                >
                  <t.icon className="h-3.5 w-3.5 text-white" />
                </span>
                {t.name}
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            className="clay-button mt-6 flex h-12 w-full items-center justify-center gap-2 bg-cta font-semibold text-white"
          >
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-center text-xs text-muted">
            Your school is already filled in. Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
