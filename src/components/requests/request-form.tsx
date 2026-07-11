'use client'

import { useActionState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { submitRequestAction } from '@/app/(platform)/requests/actions'

interface Category {
  id: string
  name: string
}

export function RequestForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(submitRequestAction, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the form after a successful submit.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state?.ok])

  return (
    <form ref={formRef} action={action} className="clay-card p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">What would you like us to run?</label>
        <input
          name="title"
          required
          maxLength={120}
          placeholder="e.g. Beginner robotics club for 10–12 year olds"
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Category <span className="text-muted font-normal">(optional)</span>
          </label>
          <select
            name="category_id"
            className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
          >
            <option value="">— Any —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Details <span className="text-muted font-normal">(optional)</span>
        </label>
        <textarea
          name="description"
          rows={3}
          maxLength={600}
          placeholder="Anything specific — age group, format, weekends only, etc."
          className="w-full px-4 py-2.5 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
        />
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Thanks! Your request is on the board.</p>}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white px-5 h-11 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {pending ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  )
}
