'use client'

import { useRef, type MouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Clock, X } from 'lucide-react'

/*
  Bookings are not open yet, so a catalogue card opens a small notice instead
  of the offering page. It stays a real link underneath: keyboard users get a
  focusable element, and with scripting unavailable the click falls through
  to the detail page, which shows the same notice in place of the booking
  form. Pass `comingSoon={false}` and it is a plain link again.
*/
export function CatalogCardLink({
  href,
  comingSoon,
  className,
  children,
}: {
  href: string
  comingSoon: boolean
  className?: string
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  if (!comingSoon) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }

  function open(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    dialogRef.current?.showModal()
  }

  function onBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    // The dialog element itself is only the target when the click lands on
    // the backdrop; clicks inside the card land on its children.
    if (e.target === dialogRef.current) dialogRef.current?.close()
  }

  return (
    <>
      <Link href={href} className={className} onClick={open}>
        {children}
      </Link>
      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-labelledby="coming-soon-title"
        className="m-auto w-[min(92vw,26rem)] rounded-3xl border-0 p-0 bg-transparent backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="clay-card p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <p id="coming-soon-title" className="font-display font-bold text-foreground text-lg">
            Coming soon
          </p>
          <p className="text-sm text-muted">
            Bookings open shortly. We&apos;ll let you know the moment this one is ready.
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="clay-button bg-cta text-white px-5 h-10 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <X className="w-4 h-4" aria-hidden="true" /> Close
          </button>
        </div>
      </dialog>
    </>
  )
}

/** The same message for the offering page, where there is no card to click. */
export function ComingSoonNotice() {
  return (
    <div className="clay-card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
      </div>
      <div>
        <p className="font-display font-bold text-foreground text-sm">Coming soon</p>
        <p className="text-xs text-muted mt-0.5">
          Bookings open shortly. We&apos;ll let you know the moment this one is ready.
        </p>
      </div>
    </div>
  )
}
