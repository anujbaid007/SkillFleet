'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle } from 'lucide-react'

/**
 * The last gate before an irreversible submit.
 *
 * The confirming button lives in this dialog but belongs to the entry form,
 * via the HTML `form` attribute — so submitting still goes through the form's
 * own action and its single useActionState, with no duplicated wiring and no
 * second code path that could drift from the first.
 */
export function ConfirmSubmitDialog({
  open,
  onCancel,
  onConfirm,
  formId,
  pending,
}: {
  open: boolean
  onCancel: () => void
  /** Closes the dialog. The submit itself is the button's native form submit. */
  onConfirm: () => void
  formId: string
  pending: boolean
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Escape closes it, and the background does not scroll underneath — the
  // same treatment MobileNavDrawer already gives its overlay.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus lands on Cancel, not Submit: the safe choice should be the one a
    // stray Enter or Space hits.
    cancelRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-submit-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="clay-card p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-accent-yellow/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-accent-yellow" />
              </span>
              <div className="min-w-0">
                <h2
                  id="confirm-submit-title"
                  className="font-display font-bold text-foreground text-lg"
                >
                  Submit this entry?
                </h2>
                <p className="text-sm text-muted mt-2">
                  Once submitted it cannot be changed — not your answers, not your links, and not
                  your team. Check everything before you go ahead.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="px-4 h-10 rounded-xl text-sm font-semibold border border-black/10 text-foreground hover:bg-black/[0.03] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={formId}
                name="intent"
                value="submit"
                onClick={onConfirm}
                disabled={pending}
                className="clay-button bg-cta text-white px-5 h-10 text-sm font-semibold disabled:opacity-60"
              >
                {pending ? 'Submitting…' : 'Yes, submit'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
