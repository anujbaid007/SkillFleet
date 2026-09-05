'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

/**
 * The last catch for the admin area.
 *
 * Every reader under src/lib/admin returns an AdminResult, so a database that
 * answers badly is drawn as a MigrationMissing or a SectionFailed panel inside
 * the section that asked. But a reader can also THROW — a socket dropped
 * mid-request, a fetch that never resolves, a bug in a page — and a thrown
 * error unwinds straight past a Suspense boundary. Without this file that took
 * the whole admin area to a 500, which is exactly what /admin's own streaming
 * was there to prevent.
 *
 * It sits in the (admin) segment, not on the page, so it covers every admin
 * screen. An error file does not wrap the layout in its own segment, so the
 * sidebar, the global search and the navigation stay on screen and the admin
 * can go somewhere else in one click rather than reaching for the back button.
 *
 * `retry` — not `reset` — is this Next version's prop for having another go;
 * it re-fetches and re-renders the segment, which is the right offer here
 * because nothing that failed was cached (cachedOk never stores a failure), so
 * pressing it really does ask the database again.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // The server log is where the real message is: a Server Component error
    // reaches the browser as a generic string plus a digest, and the digest is
    // the only thing that ties this screen to the line that threw.
    console.error('admin error boundary:', error)
  }, [error])

  return (
    <div className="clay-card flex max-w-2xl items-start gap-4 p-6" role="alert">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-pink/15">
        <AlertTriangle className="h-5 w-5 text-accent-pink" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-display font-bold text-foreground">This screen could not load</p>
        <p className="mt-1 text-sm text-muted">
          Something went wrong on the way to the database. Nothing has been changed, and the rest
          of the admin area still works — the menu on the left will take you anywhere else.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted">
            Reference <span className="font-mono">{error.digest}</span> — quote it if you report
            this, it points at the line in the server log.
          </p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="clay-button mt-4 inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  )
}
