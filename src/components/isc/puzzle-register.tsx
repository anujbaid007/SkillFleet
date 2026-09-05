'use client'

import { useActionState } from 'react'
import { CheckCircle2, Puzzle } from 'lucide-react'
import { registerForPuzzleMasterAction, type PuzzleRegisterState } from '@/app/actions/isc'

/*
  One button, because registering is the whole entry. Once it is done the card
  turns into a confirmation and stays that way; the coordinator sees the
  student on the roster from that moment.
*/
export function PuzzleRegister({ registered }: { registered: boolean }) {
  const [state, action, pending] = useActionState<PuzzleRegisterState, FormData>(
    async () => registerForPuzzleMasterAction(),
    undefined
  )
  const done = registered || state?.ok

  return (
    <div className="clay-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${done ? 'bg-green-100' : 'bg-accent-yellow/15'}`}>
          {done ? <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" /> : <Puzzle className="h-5 w-5 text-accent-yellow" aria-hidden="true" />}
        </span>
        <div>
          <p className="font-display font-bold text-foreground">
            {done ? 'You are registered for Puzzle Master' : 'Register for Puzzle Master'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {done
              ? 'Your coordinator can see you on the school roster. The round dates for your school come from them; practise below until then.'
              : 'Nothing to upload. Register once, and your scores in the official rounds become your entry.'}
          </p>
          {state?.error && !done && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
        </div>
      </div>
      {!done && (
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="clay-button h-11 bg-cta px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Registering…' : 'Register'}
          </button>
        </form>
      )}
    </div>
  )
}
