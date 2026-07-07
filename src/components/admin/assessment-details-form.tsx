'use client'

import { useActionState } from 'react'
import { updateAssessmentAction } from '@/app/(admin)/admin/assessments/actions'

interface Props {
  assessment: { id: string; title: string; description: string | null; is_active: boolean }
}

export function AssessmentDetailsForm({ assessment }: Props) {
  const [state, action, pending] = useActionState(updateAssessmentAction, undefined)

  return (
    <form action={action} className="clay-card p-6 space-y-4">
      <input type="hidden" name="id" value={assessment.id} />
      <h2 className="font-semibold text-foreground">Assessment Details</h2>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Title *</label>
        <input
          name="title"
          defaultValue={assessment.title}
          required
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          name="description"
          defaultValue={assessment.description ?? ''}
          rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" name="is_active" value="true" defaultChecked={assessment.is_active} className="rounded" />
          Active
        </label>
        {/* checkbox sends nothing when unchecked; hidden fallback ensures is_active=false submits. */}
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
