'use client'

import { useActionState } from 'react'
import { Trash2 } from 'lucide-react'
import { updateOptionAction, deleteOptionAction } from '@/app/(admin)/admin/questionnaire/actions'

interface Parameter {
  id: string
  name: string
}

interface Props {
  questionId: string
  option: { id: string; text: string; display_order: number }
  scores: Record<string, number>
  parameters: Parameter[]
}

export function QuestionOptionRow({ questionId, option, scores, parameters }: Props) {
  const [state, action, pending] = useActionState(updateOptionAction, undefined)
  const [delState, delAction, delPending] = useActionState(deleteOptionAction, undefined)

  return (
    <div className="clay-card p-4 space-y-3">
      <form action={action} className="space-y-3">
        <input type="hidden" name="option_id" value={option.id} />
        <input type="hidden" name="question_id" value={questionId} />

        <div className="flex items-center gap-3">
          <input
            name="text"
            defaultValue={option.text}
            required
            className="flex-1 px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            name="display_order"
            type="number"
            min={0}
            defaultValue={option.display_order}
            className="w-16 px-2 py-2 rounded-lg border border-black/10 text-sm text-center focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {parameters.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <label className="text-xs text-muted flex-1 truncate" title={p.name}>
                {p.name}
              </label>
              <input
                name={`pts_${p.id}`}
                type="number"
                min={0}
                max={1000}
                defaultValue={scores[p.id] ?? 0}
                className="w-16 px-2 py-1 rounded-lg border border-black/10 text-xs text-center focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
          {state?.success && <p className="text-xs text-green-600">{state.success}</p>}
        </div>
      </form>

      <form action={delAction} className="pt-2 border-t border-black/[0.06]">
        <input type="hidden" name="option_id" value={option.id} />
        <input type="hidden" name="question_id" value={questionId} />
        <button
          type="submit"
          disabled={delPending}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {delPending ? 'Deleting…' : 'Delete option'}
        </button>
        {delState?.error && <p className="text-xs text-red-500 mt-1">{delState.error}</p>}
      </form>
    </div>
  )
}
