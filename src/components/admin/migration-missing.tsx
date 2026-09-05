import { Database } from 'lucide-react'

/**
 * Shown when a reader answers `migration-missing`: PostgREST could not find
 * the function, which means docs/admin-scale-migration.sql has not been pasted
 * into the Supabase SQL editor yet.
 *
 * A setup step, not a fault — so it reads as an instruction and sits inside
 * the page it belongs to, under that page's own heading and breadcrumb, rather
 * than replacing the screen with an error.
 */
export function MigrationMissing({ message }: { message: string }) {
  return (
    <div className="clay-card flex items-start gap-4 p-6" role="alert">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-yellow/15">
        <Database className="h-5 w-5 text-accent-yellow" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display font-bold text-foreground">This page needs a database update</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    </div>
  )
}
