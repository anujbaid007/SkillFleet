'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createOptionAction } from '@/app/(admin)/admin/questionnaire/actions'

export function AddOptionForm({ questionId }: { questionId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState(createOptionAction, undefined)

  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="clay-card p-4 space-y-2">
      <input type="hidden" name="question_id" value={questionId} />
      <h3 className="font-semibold text-foreground text-sm">Add Option</h3>
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="flex gap-2">
        <input
          name="text"
          placeholder="Option text"
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
      <p className="text-xs text-muted">Set parameter points after adding — edit the option below.</p>
    </form>
  )
}
