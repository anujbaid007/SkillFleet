'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createAssessmentOptionAction } from '@/app/(admin)/admin/assessments/actions'

export function AddAssessmentOptionForm({
  assessmentId,
  questionId,
}: {
  assessmentId: string
  questionId: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState(createAssessmentOptionAction, undefined)

  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="rounded-xl border border-dashed border-black/15 p-3 space-y-2">
      <input type="hidden" name="question_id" value={questionId} />
      <input type="hidden" name="assessment_id" value={assessmentId} />
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="flex gap-2">
        <input
          name="text"
          placeholder="New option text"
          required
          className="flex-1 h-9 px-3 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
        <input type="checkbox" name="is_correct" value="true" className="rounded" />
        Mark as correct answer
      </label>
      {/* checkbox sends nothing when unchecked; hidden fallback ensures is_correct=false submits. */}
      <input type="hidden" name="is_correct" value="false" />
      <p className="text-xs text-muted">Set parameter points after adding — edit the option above.</p>
    </form>
  )
}
