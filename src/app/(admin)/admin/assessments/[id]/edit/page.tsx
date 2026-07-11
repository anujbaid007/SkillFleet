import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AssessmentDetailsForm } from '@/components/admin/assessment-details-form'
import { AssessmentQuestionBlock } from '@/components/admin/assessment-question-block'
import { AddAssessmentQuestionForm } from '@/components/admin/add-assessment-question-form'

interface RawAssessment {
  id: string
  title: string
  description: string | null
  is_active: boolean
}

interface RawQuestion {
  id: string
  text: string
  display_order: number
}

interface RawOption {
  id: string
  question_id: string
  text: string
  display_order: number
  is_correct: boolean
}

interface RawScore {
  option_id: string
  parameter_id: string
  points: number
}

interface RawParameter {
  id: string
  name: string
}

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assessment } = (await supabase
    .from('assessments')
    .select('id, title, description, is_active')
    .eq('id', id)
    .single()) as unknown as { data: RawAssessment | null }

  if (!assessment) notFound()

  // Questions + parameters via RLS; options via the SECURITY DEFINER RPC
  // (is_correct is column-blocked from the normal client by migration 0009).
  const [{ data: questions }, { data: parameters }, { data: options }] = (await Promise.all([
    supabase
      .from('assessment_questions')
      .select('id, text, display_order')
      .eq('assessment_id', id)
      .order('display_order'),
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
    supabase.rpc('admin_get_assessment_options', { p_assessment_id: id }),
  ])) as [
    { data: RawQuestion[] | null },
    { data: RawParameter[] | null },
    { data: RawOption[] | null },
  ]

  const optionIds = (options ?? []).map((o) => o.id)
  const { data: scores } = optionIds.length
    ? ((await supabase
        .from('assessment_option_scores')
        .select('option_id, parameter_id, points')
        .in('option_id', optionIds)) as unknown as { data: RawScore[] | null })
    : { data: [] as RawScore[] }

  // Group options by question, scores by option
  const optionsByQuestion = new Map<string, RawOption[]>()
  for (const o of options ?? []) {
    const bucket = optionsByQuestion.get(o.question_id) ?? []
    bucket.push(o)
    optionsByQuestion.set(o.question_id, bucket)
  }

  const scoresByOption: Record<string, Record<string, number>> = {}
  for (const s of scores ?? []) {
    const bucket = scoresByOption[s.option_id] ?? {}
    bucket[s.parameter_id] = s.points
    scoresByOption[s.option_id] = bucket
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/admin/assessments"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Assessments
      </Link>

      <AssessmentDetailsForm assessment={assessment} />

      <div className="space-y-4">
        <h2 className="font-semibold text-foreground">Questions</h2>
        {(questions ?? []).map((q) => (
          <AssessmentQuestionBlock
            key={q.id}
            assessmentId={id}
            question={q}
            options={optionsByQuestion.get(q.id) ?? []}
            scoresByOption={scoresByOption}
            parameters={parameters ?? []}
          />
        ))}
        <AddAssessmentQuestionForm assessmentId={id} />
      </div>
    </div>
  )
}
