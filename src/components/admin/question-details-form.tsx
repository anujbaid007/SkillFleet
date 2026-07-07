'use client'

import { useActionState } from 'react'
import { updateQuestionAction } from '@/app/(admin)/admin/questionnaire/actions'

interface Props {
  question: { id: string; text: string; display_order: number; is_active: boolean }
}

export function QuestionDetailsForm({ question }: Props) {
  const [state, action, pending] = useActionState(updateQuestionAction, undefined)

  return (
    <form action={action} className="clay-card p-6 space-y-4">
      <input type="hidden" name="id" value={question.id} />
      <h2 className="font-semibold text-foreground">Question Details</h2>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Text *</label>
        <textarea
          name="text"
          defaultValue={question.text}
          required
          rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Order</label>
          <input
            name="display_order"
            type="number"
            min={0}
            defaultValue={question.display_order}
            className="w-16 px-2 py-1.5 rounded-lg border border-black/10 text-sm text-center focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" name="is_active" value="true" defaultChecked={question.is_active} className="rounded" />
          Active
        </label>
        {/* checkbox sends nothing when unchecked; this fallback ensures is_active=false is submitted.
            formData.get() returns the first match, so the checkbox (earlier in DOM) wins when checked. */}
        <input type="hidden" name="is_active" value="false" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
