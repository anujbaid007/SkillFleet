'use client'

import { useRef } from 'react'
import { updateRequestStatusAction } from '@/app/(admin)/admin/requests/actions'

const OPTIONS: { value: string; label: string }[] = [
  { value: 'open', label: 'Gathering interest' },
  { value: 'planned', label: 'Planned' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'declined', label: 'Declined' },
]

export function RequestStatusForm({ id, status }: { id: string; status: string }) {
  const ref = useRef<HTMLFormElement>(null)
  return (
    <form ref={ref} action={updateRequestStatusAction}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => ref.current?.requestSubmit()}
        className="h-9 px-3 rounded-lg border border-black/10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  )
}
