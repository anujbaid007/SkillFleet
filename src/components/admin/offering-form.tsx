'use client'

import { useActionState, useState } from 'react'
import type { OfferingFormState } from '@/app/(admin)/admin/offerings/actions'
import { modeOptionsForType } from '@/lib/offering-meta'

interface Topic {
  id: string
  name: string
  category_id: string
}
interface Category {
  id: string
  name: string
}
interface Parameter {
  id: string
  name: string
}
interface InitialContribution {
  parameter_id: string
  points: number
}

interface Props {
  action: (prev: OfferingFormState, formData: FormData) => Promise<OfferingFormState>
  offeringId?: string
  categories: Category[]
  topics: Topic[]
  parameters: Parameter[]
  initial?: {
    title?: string
    description?: string
    type?: string
    status?: string
    topic_id?: string
    price_paise?: number
    min_age?: number | null
    max_age?: number | null
    scheduled_at?: string | null
    duration_minutes?: number | null
    location?: string | null
    mode?: string | null
    contributions?: InitialContribution[]
  }
}

const TYPES = ['workshop', 'trip', 'event', 'competition', 'internship']
const STATUSES = ['planned', 'live', 'completed', 'retired']

// Format stored IST timestamptz → datetime-local value 'YYYY-MM-DDTHH:MM'
function toDatetimeLocal(ts: string | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  // Convert to IST (UTC+5:30)
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`
}

export function OfferingForm({ action, offeringId, categories, topics, parameters, initial = {} }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [selectedCat, setSelectedCat] = useState<string>(() => {
    if (!initial.topic_id) return ''
    return topics.find((t) => t.id === initial.topic_id)?.category_id ?? ''
  })
  const [selectedType, setSelectedType] = useState<string>(initial.type ?? 'workshop')

  const modeOptions = modeOptionsForType(selectedType)
  const filteredTopics = selectedCat ? topics.filter((t) => t.category_id === selectedCat) : topics
  const initialPts = new Map((initial.contributions ?? []).map((c) => [c.parameter_id, c.points]))
  const errors = state?.errors ?? {}

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {offeringId && <input type="hidden" name="offering_id" value={offeringId} />}

      {state?.error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{state.error}</div>}

      <div className="clay-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Core Details</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Title *</label>
          <input
            name="title"
            defaultValue={initial.title ?? ''}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Type *</label>
            <select
              name="type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Status</label>
            <select
              name="status"
              defaultValue={initial.status ?? 'live'}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {modeOptions.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mode</label>
            <select
              name="mode"
              defaultValue={initial.mode ?? ''}
              key={selectedType}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Select mode —</option>
              {modeOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            name="description"
            defaultValue={initial.description ?? ''}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category</label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— All —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Topic</label>
            <select
              name="topic_id"
              defaultValue={initial.topic_id ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— None —</option>
              {filteredTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="clay-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Pricing &amp; Schedule</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Price (₹)</label>
            <input
              name="price_rupees"
              type="number"
              min={0}
              step={1}
              defaultValue={initial.price_paise != null ? initial.price_paise / 100 : 0}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Duration (minutes)</label>
            <input
              name="duration_minutes"
              type="number"
              min={0}
              defaultValue={initial.duration_minutes ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Scheduled (IST)</label>
          <input
            name="scheduled_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(initial.scheduled_at)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Location</label>
          <input
            name="location"
            defaultValue={initial.location ?? ''}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Min age</label>
            <input
              name="min_age"
              type="number"
              min={3}
              max={18}
              defaultValue={initial.min_age ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Max age</label>
            <input
              name="max_age"
              type="number"
              min={3}
              max={18}
              defaultValue={initial.max_age ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        {errors.age_range && <p className="text-xs text-red-500">{errors.age_range}</p>}
      </div>

      <div className="clay-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Skills Contribution</h2>
          <p className="text-xs text-muted mt-0.5">
            Points awarded per parameter on completion (internal 0–1000 scale). Leave 0 for no contribution.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parameters.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <label className="text-sm text-foreground flex-1 truncate" title={p.name}>
                {p.name}
              </label>
              <input
                name={`pts_${p.id}`}
                type="number"
                min={0}
                max={1000}
                defaultValue={initialPts.get(p.id) ?? 0}
                className="w-20 px-3 py-1.5 rounded-lg border border-black/10 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {pending ? 'Saving…' : offeringId ? 'Save Changes' : 'Create Offering'}
      </button>
    </form>
  )
}
