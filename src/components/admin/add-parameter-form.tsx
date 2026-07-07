'use client'

import { useActionState } from 'react'
import { createParameterAction } from '@/app/(admin)/admin/parameters/actions'

export function AddParameterForm() {
  const [state, action, pending] = useActionState(createParameterAction, undefined)

  return (
    <form action={action} className="clay-card p-5 space-y-3">
      <h3 className="font-semibold text-foreground text-sm">Add Parameter</h3>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="Parameter name"
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
      <input
        name="description"
        placeholder="Description (optional)"
        className="w-full h-10 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </form>
  )
}
