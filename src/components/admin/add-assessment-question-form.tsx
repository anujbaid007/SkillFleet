'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createAssessmentQuestionAction } from '@/app/(admin)/admin/assessments/actions'

export function AddAssessmentQuestionForm({ assessmentId }: { assessmentId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState(createAssessmentQuestionAction, undefined)

  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="clay-card p-4 space-y-2">
      <input type="hidden" name="assessment_id" value={assessmentId} />
      <h3 className="font-semibold text-foreground text-sm">Add Question</h3>
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="flex gap-2">
        <input
          name="text"
          placeholder="Question text"
          required
          className="flex-1 h-10 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
      <p className="text-xs text-muted">Add answer options after creating the question.</p>
    </form>
  )
}
