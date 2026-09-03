import { cookies } from 'next/headers'
import Image from 'next/image'
import { LANDING_AFTER_LOGIN } from '@/lib/launch'
import { RegistrationConsentGate } from '@/components/onboarding/registration-consent-gate'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JOIN_COOKIE } from '@/lib/coordinator/join-link'
import { resolveJoinSchool } from '@/lib/coordinator/resolve-school'
import { isStudentDetailsComplete } from '@/lib/profile/details'
import { DetailsForm } from '@/components/onboarding/details-form'
import { getSchoolStates } from '@/app/actions/schools'
import { MIN_SIGNUP_AGE } from '@/lib/validation/dob'

export default async function OnboardingDetailsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      'full_name, role, onboarding_completed, school_class, school_name, school_state, school_district, city, parent_mobile, date_of_birth, family_id, terms_agreed_at'
    )
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'student') redirect('/dashboard')

  // Already complete? Skip the gate. Always to the dashboard: the starter
  // assessment is optional and offered there as a card, never as a step
  // standing between somebody and the platform.
  if (isStudentDetailsComplete(profile)) {
    redirect(LANDING_AFTER_LOGIN)
  }

  /*
    A coordinator's share link left the school in a cookie. Resolved with the
    service-role client because the student has no school of their own yet,
    which is what the RLS policy on `schools` keys off.
  */
  const joinSlug = (await cookies()).get(JOIN_COOKIE)?.value
  const joinSchool = joinSlug ? await resolveJoinSchool(joinSlug) : null

  const states = await getSchoolStates()

  // Latest date of birth that still satisfies the minimum signup age. Computed
  // on the server so the input's `max` is identical on both renders.
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - MIN_SIGNUP_AGE)
  const maxDob = cutoff.toISOString().split('T')[0]
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-10">
      {/* Consent before the details below are collected. */}
      <RegistrationConsentGate agreed={!!profile.terms_agreed_at} isCoordinator={false} />
      <div className="mx-auto max-w-5xl">
        {/* Where this sits in the journey: details now, the championship next. */}
        <ol className="flex items-center gap-3 text-xs font-semibold" aria-label="Progress">
          <li className="flex items-center gap-2 text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">1</span>
            Your details
          </li>
          <li aria-hidden className="h-[3px] w-10 rounded-full bg-[linear-gradient(90deg,#7447E1_0%,#14B8A6_38%,#EC4899_70%,#FBBF24_100%)]" />
          <li className="flex items-center gap-2 text-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-black/10 text-[11px] font-bold">2</span>
            ISC 2026
          </li>
        </ol>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
          <div>
            <div className="mb-6">
              <h1 className="font-display text-3xl font-bold text-foreground">
                A few details, {firstName} 👋
              </h1>
              <p className="text-muted mt-2">
                Tell us a little about you so we can personalise your SkillFleet experience.
              </p>
            </div>
            <DetailsForm
              states={states}
              previousFreeText={profile.school_name ?? ''}
              defaultName={profile.full_name ?? ''}
              prefillSchool={joinSchool ?? undefined}
              needsDob={!profile.date_of_birth}
              needsParent={!profile.family_id}
              maxDob={maxDob}
            />
          </div>

          {/* The championship's own art beside the form, so this page belongs
              to the same season as the pages after it. */}
          <aside className="isc-stage sticky top-8 hidden overflow-hidden rounded-[22px] border-2 border-white shadow-[8px_8px_24px_rgba(80,50,160,0.10),-4px_-4px_14px_rgba(255,255,255,0.9)] lg:block">
            <div className="p-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm">
                Next up
              </span>
              <p className="font-display mt-3 text-lg font-bold leading-snug text-foreground">
                International Skill Championship <span className="text-accent-yellow">2026</span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-foreground/70">
                <li>Takes about two minutes.</li>
                <li>A parent or guardian&apos;s contact is part of it.</li>
                <li>Everything here can be changed later from Account.</li>
              </ul>
            </div>
            <Image
              src="/isc/2026/students.webp"
              alt=""
              width={1400}
              height={932}
              sizes="340px"
              className="h-auto w-full"
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
