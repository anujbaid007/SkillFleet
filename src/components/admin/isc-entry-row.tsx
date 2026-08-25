'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { TRACK_FIELDS, trackById, type IscTrackId } from '@/lib/isc/tracks'
import { editCountLabel, type EntryRevision } from '@/lib/isc/revisions'
import { IscEntryHistory } from '@/components/admin/isc-entry-history'

export interface AdminIscEntry {
  entryId: string
  track: IscTrackId
  schoolName: string
  schoolState: string
  leaderName: string
  teamSize: number
  status: string
  submittedAt: string | null
  updatedAt: string
  language: string | null
  editCount: number
  revisions: EntryRevision[]
  submission: Record<string, unknown>
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

/**
 * Read-only on purpose: judging is not part of this build, and an edit control
 * here would be a way to alter a submission with no audit trail.
 */
export function IscEntryRow({ entry }: { entry: AdminIscEntry }) {
  const [open, setOpen] = useState(false)
  const track = trackById(entry.track)

  return (
    <div className="px-5 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            {track?.name ?? entry.track} · {entry.schoolName}
          </span>
          <span className="block text-xs text-muted">
            {entry.leaderName} · team of {entry.teamSize}
            {entry.schoolState && ` · ${entry.schoolState}`}
            {entry.language && ` · ${entry.language}`}
          </span>
          <span className="block text-xs text-muted">
            {entry.submittedAt
              ? `Submitted ${new Date(entry.submittedAt).toLocaleDateString('en-IN')}`
              : 'Not submitted'}
            {' · '}
            {editCountLabel(entry.editCount)}
            {entry.editCount > 0 &&
              ` · last edit ${new Date(entry.updatedAt).toLocaleDateString('en-IN')}`}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              entry.status === 'submitted'
                ? 'bg-primary/10 text-primary'
                : 'bg-black/[0.05] text-muted'
            }`}
          >
            {entry.status === 'submitted' ? 'Submitted' : 'Draft'}
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted" />
          )}
        </span>
      </button>

      {open && (
        <dl className="mt-4 space-y-3 rounded-xl bg-black/[0.02] p-4">
          {TRACK_FIELDS[entry.track].map((spec) => {
            const raw = entry.submission?.[spec.key]
            const value = typeof raw === 'string' ? raw : ''
            return (
              <div key={spec.key}>
                <dt className="text-xs font-semibold text-muted uppercase tracking-wide">
                  {spec.label}
                </dt>
                <dd className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                  {!value ? (
                    <span className="text-muted">Not filled in</span>
                  ) : isUrl(value) ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {value}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      )}

      {open && (
        <div className="mt-4 rounded-xl bg-black/[0.02] p-4">
          <IscEntryHistory revisions={entry.revisions} />
        </div>
      )}
    </div>
  )
}
