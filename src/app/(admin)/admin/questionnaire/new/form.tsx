'use client'

import { useActionState } from 'react'
import { createQuestionAction } from '../actions'

export function NewQuestionForm() {
  const [state, action, pending] = useActionState(createQuestionAction, undefined)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">New Question</h1>
        <p className="text-muted mt-1 text-sm">
          Add options and parameter points after creating the question.
        </p>
      </div>

      <form action={action} className="clay-card p-6 space-y-4">
        {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Question text *</label>
          <textarea
            name="text"
            required
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create & Add Options'}
        </button>
      </form>
    </div>
  )
}
