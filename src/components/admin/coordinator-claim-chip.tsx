/*
  Plain words for the claim status, in one place, because three screens in this
  section show it and the database enum ('none') is not a word anybody outside
  the schema should have to read.

  'none' is a real coordinator, not a missing row: somebody who signed up and
  has not claimed a school. The wording says that rather than "—".
*/

export const CLAIM_LABEL: Record<string, string> = {
  none: 'No school claimed',
  pending: 'Waiting on your review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const CLAIM_CHIP: Record<string, string> = {
  none: 'bg-slate-100 text-slate-600',
  pending: 'bg-accent-yellow/15 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

export function ClaimChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        CLAIM_CHIP[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {CLAIM_LABEL[status] ?? status}
    </span>
  )
}
