/*
  One result shape for every admin reader, so a page never has to catch.

  The kind that matters is 'migration-missing'. PostgREST answers PGRST202 when
  the function it was asked for is not in the schema cache -- which, for these
  ten functions, means the founder has not pasted
  docs/admin-scale-migration.sql into the SQL editor yet. That is a setup step,
  not a fault, so it gets its own kind and its own panel rather than a stack
  trace.
*/

export type AdminErrorKind = 'migration-missing' | 'failed'

export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: AdminErrorKind; message: string }

export const MIGRATION_MISSING_MESSAGE =
  'Run docs/admin-scale-migration.sql in the Supabase SQL editor, then reload.'

/** PostgREST answers PGRST202 when the function does not exist. */
export function mapRpcError(error: { code?: string; message?: string } | null): AdminResult<never> {
  if (error?.code === 'PGRST202') {
    return { ok: false, kind: 'migration-missing', message: MIGRATION_MISSING_MESSAGE }
  }
  return { ok: false, kind: 'failed', message: error?.message ?? 'Unknown error' }
}

export function ok<T>(data: T): AdminResult<T> {
  return { ok: true, data }
}

/**
 * The same mapping as an exception, for the one caller that cannot return a
 * result: iterateExport, which is a generator feeding a streamed CSV. A route
 * handler can catch this and still tell "run the migration" apart from a real
 * failure by reading `kind`.
 */
export class AdminError extends Error {
  readonly kind: AdminErrorKind

  constructor(kind: AdminErrorKind, message: string) {
    super(message)
    this.name = 'AdminError'
    this.kind = kind
  }
}

export function adminError(error: { code?: string; message?: string } | null): AdminError {
  const r = mapRpcError(error)
  // r is always the failure branch: mapRpcError never returns ok.
  return r.ok ? new AdminError('failed', 'Unknown error') : new AdminError(r.kind, r.message)
}
