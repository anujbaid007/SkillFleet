'use client'

import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'live', label: 'Live' },
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
]

// Status dropdown for the catalog. Navigates with the chosen status while
// preserving the active type/category filters.
export function CatalogStatusFilter({
  status,
  type,
  category,
}: {
  status?: string
  type?: string
  category?: string
}) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (category) params.set('category', category)
    if (e.target.value) params.set('status', e.target.value)
    const qs = params.toString()
    router.push(`/catalog${qs ? `?${qs}` : ''}`)
  }

  return (
    <select
      value={status ?? ''}
      onChange={handleChange}
      aria-label="Filter by status"
      className="h-9 px-3 rounded-full border border-black/10 bg-white text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
