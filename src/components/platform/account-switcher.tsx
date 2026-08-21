'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { GraduationCap, ChevronRight, Loader2 } from 'lucide-react'
import { switchAccountAction, type SwitchTarget } from '@/app/actions/switch'

function SwitchButton({ label, icon: Icon }: { label: string; icon: typeof GraduationCap }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-primary bg-primary/[0.07] hover:bg-primary/[0.12] transition-colors disabled:opacity-60"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate text-left flex-1">{label}</span>
      {!pending && <ChevronRight className="w-4 h-4 opacity-60" />}
    </button>
  )
}

/**
 * Moves between the students in one family without a second sign-in.
 * Every account is a real, separate account — this only changes which one is
 * active, so RLS applies exactly as it would after a normal login.
 */
export function AccountSwitcher({ targets }: { targets: SwitchTarget[] }) {
  const [open, setOpen] = useState(false)

  // An only child has nobody to switch to.
  if (targets.length === 0) return null

  if (targets.length === 1) {
    const sibling = targets[0]
    return (
      <form action={switchAccountAction}>
        <input type="hidden" name="target_id" value={sibling.user_id} />
        <SwitchButton
          label={`Switch to ${sibling.full_name?.split(' ')[0] ?? 'sibling'}`}
          icon={GraduationCap}
        />
      </form>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-primary bg-primary/[0.07] hover:bg-primary/[0.12] transition-colors"
      >
        <GraduationCap className="w-4 h-4 flex-shrink-0" />
        <span className="truncate text-left flex-1">Switch student</span>
        <ChevronRight className={`w-4 h-4 opacity-60 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="pl-2 space-y-0.5">
          {targets.map((sibling) => (
            <form key={sibling.user_id} action={switchAccountAction}>
              <input type="hidden" name="target_id" value={sibling.user_id} />
              <button
                type="submit"
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-muted hover:bg-black/5 hover:text-foreground transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {(sibling.full_name ?? 'S').charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{sibling.full_name ?? 'Student'}</span>
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  )
}
