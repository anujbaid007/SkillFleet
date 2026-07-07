'use client'

import { useActionState } from 'react'
import { updateScoreLevelAction } from '@/app/(admin)/admin/parameters/actions'

interface Props {
  level: {
    id: string
    name: string
    min_score: number
    max_score: number
    color_class: string
  }
}

export function ScoreLevelRow({ level }: Props) {
  const [state, action, pending] = useActionState(updateScoreLevelAction, undefined)

  return (
    <form action={action} className="flex items-center gap-3 px-5 py-3 flex-wrap">
      <input type="hidden" name="id" value={level.id} />
      <input type="hidden" name="name" value={level.name} />
      <span className={`text-sm font-medium ${level.color_class} w-24 shrink-0`}>{level.name}</span>
      <div className="flex items-center gap-1.5 text-sm text-muted">
        <input
          name="min_score"
          type="number"
          min={0}
          max={100}
          defaultValue={level.min_score}
          className="w-16 px-2 py-1 rounded-lg border border-black/10 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span>–</span>
        <input
          name="max_score"
          type="number"
          min={0}
          max={100}
          defaultValue={level.max_score}
          className="w-16 px-2 py-1 rounded-lg border border-black/10 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <button type="submit" disabled={pending} className="ml-auto text-xs text-primary hover:underline disabled:opacity-50">
        {pending ? 'Saving…' : 'Save'}
      </button>
      {state?.error && <p className="w-full text-xs text-red-500">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-green-600">{state.success}</p>}
    </form>
  )
}
