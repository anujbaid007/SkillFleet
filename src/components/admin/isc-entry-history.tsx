import { ArrowRight, History } from 'lucide-react'
import { truncate, type EntryRevision } from '@/lib/isc/revisions'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * What changed, when, and by whom — newest first.
 *
 * Read-only like the rest of /admin/isc: seeing an earlier value is not an
 * invitation to restore it.
 */
export function IscEntryHistory({ revisions }: { revisions: EntryRevision[] }) {
  if (revisions.length === 0) {
    return (
      <p className="text-xs text-muted">
        No edits recorded. History starts from the first change after this feature shipped.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide inline-flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        Edit history
      </h3>

      <ol className="space-y-3">
        {revisions.map((rev) => (
          <li key={rev.revisionId} className="rounded-xl bg-white/70 p-3">
            <p className="text-xs text-muted">
              {fmt(rev.editedAt)}
              {rev.editorName && ` · ${rev.editorName}`}
              {' · '}
              {rev.changes.length} field{rev.changes.length === 1 ? '' : 's'} changed
            </p>

            <ul className="mt-2 space-y-2">
              {rev.changes.map((c) => (
                <li key={c.key}>
                  <p className="text-xs font-semibold text-foreground">{c.label}</p>
                  <p className="text-xs text-muted flex items-start gap-1.5 mt-0.5 flex-wrap">
                    <span className="line-through opacity-70 break-words">{truncate(c.from)}</span>
                    <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="text-foreground break-words">{truncate(c.to)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
