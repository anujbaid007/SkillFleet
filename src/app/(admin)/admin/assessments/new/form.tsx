'use client'

import { useActionState } from 'react'
import { createAssessmentAction } from '../actions'

export function NewAssessmentForm() {
  const [state, action, pending] = useActionState(createAssessmentAction, undefined)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">New Assessment</h1>
        <p className="text-muted mt-1 text-sm">Add questions and answer options after creating it.</p>
      </div>

      <form action={action} className="clay-card p-6 space-y-4">
        {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Title *</label>
          <input
            name="title"
            required
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            name="description"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create & Add Questions'}
        </button>
      </form>
    </div>
  )
}
