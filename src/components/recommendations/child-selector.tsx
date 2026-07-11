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
}: {
  children: Child[]
  selectedId: string
  basePath?: string
}) {
  const router = useRouter()

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted">For</span>
      <select
        value={selectedId}
        onChange={(e) => router.push(`${basePath}?child=${e.target.value}`)}
        className="h-10 px-3 rounded-xl border-2 border-black/[0.06] bg-white font-semibold text-foreground focus:outline-none focus:border-primary transition-colors"
      >
        {children.map((c) => (
          <option key={c.student_id} value={c.student_id}>
            {c.full_name ?? 'Student'}
          </option>
        ))}
      </select>
    </label>
  )
}
