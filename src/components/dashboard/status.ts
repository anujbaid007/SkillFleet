/**
 * One colour vocabulary for ISC status, shared by every dashboard.
 *
 * Submitted was green in one panel, primary-purple in another, and a plain
 * chip in a third — so the same fact looked like three different facts
 * depending where you read it. Defined once here, imported everywhere.
 */
export const STATUS_COLOR = {
  submitted: {
    label: 'Submitted',
    /** Solid fill for bars and dots. */
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
    chip: 'bg-emerald-50 text-emerald-700',
    /** Raw hex, for inline styles (gradients, SVG) where a class cannot go. */
    hex: '#10B981',
  },
  draft: {
    label: 'Draft',
    bar: 'bg-amber-400',
    text: 'text-amber-600',
    chip: 'bg-amber-50 text-amber-700',
    hex: '#FBBF24',
  },
  not_started: {
    label: 'Not started',
    bar: 'bg-slate-300',
    text: 'text-muted',
    chip: 'bg-slate-100 text-slate-500',
    hex: '#CBD5E1',
  },
  invited: {
    label: 'Invited',
    bar: 'bg-violet-300',
    text: 'text-primary',
    chip: 'bg-violet-50 text-primary',
    hex: '#C4B5FD',
  },
} as const

export type StatusKey = keyof typeof STATUS_COLOR

/** A draft/submitted string from the database, mapped to the vocabulary. */
export function entryStatusKey(status: string): StatusKey {
  return status === 'submitted' ? 'submitted' : 'draft'
}
