'use client'

import { useActionState } from 'react'
import { reviewCertAction } from '@/app/(admin)/admin/certificates/[id]/actions'

interface Parameter {
  id: string
  name: string
}

interface Props {
  certId: string
  currentParameterId: string | null
  currentStatus: string
  currentPoints: number
  parameters: Parameter[]
}

export function CertReviewForm({
  certId,
  currentParameterId,
  currentStatus,
  currentPoints,
  parameters,
}: Props) {
  const [state, action, pending] = useActionState(reviewCertAction, undefined)
  const isReReview = currentStatus !== 'pending'
  const defaultPoints = currentStatus === 'approved' && currentPoints > 0 ? currentPoints : 50

  if (state?.success) {
    return (
      <div className="clay-card p-6 text-center space-y-2">
        <p className="font-semibold text-green-700">{state.success}</p>
        <a href="/admin/certificates" className="text-sm text-primary hover:underline">
          ← Back to certificates
        </a>
      </div>
    )
  }

  return (
    <form action={action} className="clay-card p-6 space-y-5">
      <input type="hidden" name="cert_id" value={certId} />
      <h2 className="font-semibold text-foreground">{isReReview ? 'Change Decision' : 'Review Decision'}</h2>

      {state?.error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{state.error}</div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Skill / Parameter{' '}
          <span className="text-muted font-normal">(override if tagged incorrectly)</span>
        </label>
        <select
          name="parameter_id"
          defaultValue={currentParameterId ?? ''}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">— Keep existing / none —</option>
          {parameters.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Points to award (approve only)</label>
        <input
          type="number"
          name="points_approved"
          min={0}
          max={1000}
          defaultValue={defaultPoints}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-muted">Internal scale 0–1000. Typical cert = 30–100 pts.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Admin notes <span className="text-muted font-normal">(optional, shown to student)</span>
        </label>
        <textarea
          name="admin_notes"
          rows={2}
          placeholder="Great achievement! / Could not verify this certificate."
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {pending ? 'Working…' : '✓ Approve & Award Points'}
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          ✕ Reject
        </button>
      </div>
    </form>
  )
}
