import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuestionDetailsForm } from '@/components/admin/question-details-form'
import { QuestionOptionRow } from '@/components/admin/question-option-row'
import { AddOptionForm } from '@/components/admin/add-option-form'
import { requireAdmin } from '@/lib/admin/guard'

interface RawQuestion {
  id: string
  text: string
  display_order: number
  is_active: boolean
}

interface RawOption {
  id: string
  text: string
  display_order: number
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

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  const { data: question } = (await supabase
    .from('questionnaire_questions')
    .select('id, text, display_order, is_active')
    .eq('id', id)
    .single()) as unknown as { data: RawQuestion | null }

  if (!question) notFound()

  const [{ data: options }, { data: parameters }] = (await Promise.all([
    supabase
      .from('questionnaire_options')
      .select('id, text, display_order')
      .eq('question_id', id)
      .order('display_order'),
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
  ])) as [{ data: RawOption[] | null }, { data: RawParameter[] | null }]

  const optionIds = (options ?? []).map((o) => o.id)
  const { data: scores } = optionIds.length
    ? ((await supabase
        .from('questionnaire_option_scores')
        .select('option_id, parameter_id, points')
        .in('option_id', optionIds)) as unknown as { data: RawScore[] | null })
    : { data: [] as RawScore[] }

  const scoresByOption = new Map<string, Record<string, number>>()
  for (const s of scores ?? []) {
    const bucket = scoresByOption.get(s.option_id) ?? {}
    bucket[s.parameter_id] = s.points
    scoresByOption.set(s.option_id, bucket)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/admin/questionnaire"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Questionnaire
      </Link>

      <QuestionDetailsForm question={question} />

      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Options</h2>
        {(options ?? []).map((o) => (
          <QuestionOptionRow
            key={o.id}
            questionId={id}
            option={o}
            scores={scoresByOption.get(o.id) ?? {}}
            parameters={parameters ?? []}
          />
        ))}
        <AddOptionForm questionId={id} />
      </div>
    </div>
  )
}
