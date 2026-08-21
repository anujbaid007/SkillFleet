import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { isStudentDetailsComplete } from '@/lib/profile/details'

// Local types for the nested Supabase selects.
// The generated database.ts does not include nested relation shapes,
// so we define them here for the page only.
interface RawOption {
  id: string
  text: string
  display_order: number
}

interface RawQuestion {
  id: string
  text: string
  display_order: number
  questionnaire_options: RawOption[]
}

interface RawAssessmentOption {
  id: string
  text: string
  display_order: number
  // is_correct intentionally excluded from select — never sent to client
}

interface RawAssessmentQuestion {
  id: string
  text: string
  display_order: number
  assessment_options: RawAssessmentOption[]
}

interface RawAssessment {
  id: string
  title: string
  assessment_questions: RawAssessmentQuestion[]
}

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      'full_name, role, onboarding_completed, school_class, school_name, school_state, school_district, city, parent_mobile'
    )
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'student') redirect('/dashboard')
  // Details gate comes before the questionnaire.
  if (!isStudentDetailsComplete(profile)) redirect('/onboarding/details')
  if (profile.onboarding_completed) redirect('/dashboard')

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  // Fetch all questionnaire questions + options (scores NOT fetched — server only)
  const { data: rawQuestions } = (await supabase
    .from('questionnaire_questions')
    .select('id, text, display_order, questionnaire_options(id, text, display_order)')
    .eq('is_active', true)
    .order('display_order')) as unknown as { data: RawQuestion[] | null }

  // Fetch the first active assessment + questions + options (is_correct excluded)
  const { data: rawAssessments } = (await supabase
    .from('assessments')
    .select(
      'id, title, assessment_questions(id, text, display_order, assessment_options(id, text, display_order))'
    )
    .eq('is_active', true)
    .limit(1)) as unknown as { data: RawAssessment[] | null }

  // Active parameters for cert upload dropdown
  const { data: parameters } = await supabase
    .from('growth_parameters')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order')

  const rawAssessment = rawAssessments?.[0] ?? null

  // Sort nested arrays by display_order
  const questions = (rawQuestions ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    options: (q.questionnaire_options ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(({ id, text }) => ({ id, text })),
  }))

  const assessment = rawAssessment
    ? {
        id: rawAssessment.id,
        title: rawAssessment.title,
        questions: (rawAssessment.assessment_questions ?? [])
          .sort((a, b) => a.display_order - b.display_order)
          .map((q) => ({
            id: q.id,
            text: q.text,
            options: (q.assessment_options ?? [])
              .sort((a, b) => a.display_order - b.display_order)
              .map(({ id, text }) => ({ id, text })),
          })),
      }
    : null

  // Graceful fallback: no content configured yet
  if (!questions.length || !assessment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="clay-card w-full max-w-lg p-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome, {firstName}!
          </h1>
          <p className="text-muted mt-3">
            Onboarding content is still being prepared. Please check back soon.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome aboard, {firstName}! 🌱
          </h1>
          <p className="text-muted mt-2">
            Let&apos;s set up your growth profile — take it now or come back to it anytime.
          </p>
        </div>

        <OnboardingWizard
          studentId={user.id}
          questionnaire={{ questions }}
          assessment={assessment}
          parameters={parameters ?? []}
        />
      </div>
    </main>
  )
}
