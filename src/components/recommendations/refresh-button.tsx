'use client'

import { useActionState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { generateRecommendationsAction } from '@/app/(platform)/recommendations/actions'

export function RefreshButton({ studentId, hasRun }: { studentId: string; hasRun: boolean }) {
  const [state, action, pending] = useActionState(generateRecommendationsAction, undefined)

  return (
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="student_id" value={studentId} />
      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white px-5 h-11 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {pending ? 'Analysing…' : hasRun ? 'Refresh suggestions' : 'Generate suggestions'}
      </button>
      {state?.error && <span className="text-xs text-red-500">{state.error}</span>}
    </form>
  )
}
