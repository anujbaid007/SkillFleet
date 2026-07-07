'use client'

import { useActionState, useState } from 'react'
import { updateParameterAction } from '@/app/(admin)/admin/parameters/actions'
import { Pencil, Check, X } from 'lucide-react'

interface Props {
  param: {
    id: string
    name: string
    description: string | null
    weight: number
    display_order: number
    is_active: boolean
  }
}

export function ParameterRow({ param }: Props) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(updateParameterAction, undefined)

  if (!editing) {
    return (
      <div className="flex items-center gap-4 px-5 py-3.5">
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${param.is_active ? 'text-foreground' : 'line-through text-muted'}`}>
            {param.name}
          </span>
          {param.description && <p className="text-xs text-muted truncate">{param.description}</p>}
        </div>
        <span className="text-xs text-muted shrink-0">#{param.display_order}</span>
        <span className="text-xs text-muted shrink-0">w={param.weight}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-muted hover:text-primary transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="px-5 py-3 space-y-2 bg-primary/[0.03]">
      <input type="hidden" name="id" value={param.id} />
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input
          name="name"
          defaultValue={param.name}
          required
          placeholder="Name"
          className="col-span-2 px-3 py-1.5 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          name="description"
          defaultValue={param.description ?? ''}
          placeholder="Description (optional)"
          className="col-span-2 px-3 py-1.5 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Weight (0–1)</label>
          <input
            name="weight"
            type="number"
            step={0.01}
            min={0}
            max={1}
            defaultValue={param.weight}
            className="w-20 px-2 py-1 rounded-lg border border-black/10 text-sm text-center focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Order</label>
          <input
            name="display_order"
            type="number"
            min={0}
            defaultValue={param.display_order}
            className="w-16 px-2 py-1 rounded-lg border border-black/10 text-sm text-center focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input type="checkbox" name="is_active" value="true" defaultChecked={param.is_active} className="rounded" />
          Active
        </label>
        {/* checkbox sends nothing when unchecked; this fallback ensures is_active=false is submitted.
            formData.get() returns the first match, so the checkbox (earlier in DOM) wins when checked. */}
        <input type="hidden" name="is_active" value="false" />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 text-xs text-muted hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </form>
  )
}
