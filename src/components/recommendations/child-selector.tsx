'use client'

import { useRouter } from 'next/navigation'

interface Child {
  student_id: string
  full_name: string | null
}

export function ChildSelector({
  children,
  selectedId,
  basePath = '/recommendations',
  allowAll = false,
  preserveParams,
}: {
  children: Child[]
  selectedId: string
  basePath?: string
  /** Adds an "All children" option whose value is empty (drops the child filter). */
  allowAll?: boolean
  /** Extra query params to keep when switching child (e.g. the calendar's month). */
  preserveParams?: Record<string, string | number | undefined>
}) {
  const router = useRouter()

  function go(value: string) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(preserveParams ?? {})) {
      if (v !== undefined && v !== '') params.set(k, String(v))
    }
    if (value) params.set('child', value)
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted">For</span>
      <select
        value={selectedId}
        onChange={(e) => go(e.target.value)}
        className="h-10 px-3 rounded-xl border-2 border-black/[0.06] bg-white font-semibold text-foreground focus:outline-none focus:border-primary transition-colors"
      >
        {allowAll && <option value="">All children</option>}
        {children.map((c) => (
          <option key={c.student_id} value={c.student_id}>
            {c.full_name ?? 'Student'}
          </option>
        ))}
      </select>
    </label>
  )
}
