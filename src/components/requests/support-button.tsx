'use client'

import { useFormStatus } from 'react-dom'
import { ArrowBigUp, Loader2 } from 'lucide-react'
import { toggleSupportAction } from '@/app/(platform)/requests/actions'

function Inner({ supporting, total, isRequester }: { supporting: boolean; total: number; isRequester: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || isRequester}
      title={isRequester ? 'This is your request' : supporting ? 'Remove your support' : 'I want this too'}
      className={[
        'inline-flex items-center gap-1.5 rounded-xl px-3 h-9 text-sm font-bold transition-colors shrink-0',
        supporting ? 'bg-primary text-white' : 'bg-black/[0.05] text-muted hover:text-foreground',
        isRequester ? 'cursor-default' : '',
      ].join(' ')}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowBigUp className={`w-4 h-4 ${supporting ? 'fill-current' : ''}`} />}
      {total}
    </button>
  )
}

export function SupportButton({
  requestId,
  supporting,
  total,
  isRequester,
}: {
  requestId: string
  supporting: boolean
  total: number
  isRequester: boolean
}) {
  return (
    <form action={toggleSupportAction}>
      <input type="hidden" name="request_id" value={requestId} />
      <Inner supporting={supporting} total={total} isRequester={isRequester} />
    </form>
  )
}
