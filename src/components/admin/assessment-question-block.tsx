'use client'

import { useActionState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  updateAssessmentQuestionAction,
  deleteAssessmentQuestionAction,
} from '@/app/(admin)/admin/assessments/actions'
import { AssessmentOptionRow } from './assessment-option-row'
import { AddAssessmentOptionForm } from './add-assessment-option-form'

interface Parameter {
  id: string
  name: string
}

interface Option {
  id: string
  text: string
  display_order: number
  is_correct: boolean
}

interface Props {
  assessmentId: string
  question: { id: string; text: string; display_order: number }
  options: Option[]
  scoresByOption: Record<string, Record<string, number>>
  parameters: Parameter[]
}

export function AssessmentQuestionBlock({
  assessmentId,
  question,
  options,
  scoresByOption,
  parameters,
}: Props) {
  const [state, action, pending] = useActionState(updateAssessmentQuestionAction, undefined)
  const [delState, delAction, delPending] = useActionState(deleteAssessmentQuestionAction, undefined)

  return (
    <div className="clay-card p-5 space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={question.id} />
        <input type="hidden" name="assessment_id" value={assessmentId} />
        <div className="flex items-start gap-3">
          <textarea
            name="text"
            defaultValue={question.text}
            required
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            name="display_order"
            type="number"
            min={0}
            defaultValue={question.display_order}
            className="w-14 px-2 py-2 rounded-lg border border-black/10 text-sm text-center focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save question'}
          </button>
          {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
          {state?.success && <p className="text-xs text-green-600">{state.success}</p>}
        </div>
      </form>

      <div className="space-y-2 pl-1">
        {options.map((o) => (
          <AssessmentOptionRow
            key={o.id}
            assessmentId={assessmentId}
            questionId={question.id}
            option={o}
            scores={scoresByOption[o.id] ?? {}}
            parameters={parameters}
          />
        ))}
        <AddAssessmentOptionForm assessmentId={assessmentId} questionId={question.id} />
      </div>

      <form action={delAction} className="pt-2 border-t border-black/[0.06]">
        <input type="hidden" name="id" value={question.id} />
        <input type="hidden" name="assessment_id" value={assessmentId} />
        <button
          type="submit"
          disabled={delPending}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {delPending ? 'Deleting…' : 'Delete question'}
        </button>
        {delState?.error && <p className="text-xs text-red-500 mt-1">{delState.error}</p>}
      </form>
    </div>
  )
}
