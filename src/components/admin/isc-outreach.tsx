'use client'

import Link from 'next/link'
import { Download } from 'lucide-react'
import { toCsv } from '@/lib/isc/csv'
import type { ColdSchoolRow } from '@/lib/isc/outreach'
import type { CountRow } from '@/lib/isc/analytics'

/**
 * A cold school is still a school worth opening — its roster names the exact
 * students who have not started, which is what an outreach call needs. The
 * comparison chart above cannot link there, because a school with no entries
 * never appears in it.
 */
function schoolHref(s: ColdSchoolRow) {
  return `/admin/isc/state/${encodeURIComponent(s.state)}/district/${encodeURIComponent(
    s.district
  )}/school/${s.schoolId}`
}

/** Plain words for a database enum nobody outside the schema should have to read. */
const COORDINATOR_LABEL: Record<string, string> = {
  none: 'Nobody has applied',
  pending: 'Waiting on your review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const HEADERS = ['School', 'State', 'District', 'Eligible students', 'Coordinator']

export function IscOutreach({
  coldSchools,
  coordinatorCoverage,
  coldSchoolsCapped,
  filenamePrefix,
}: {
  coldSchools: ColdSchoolRow[]
  coordinatorCoverage: CountRow[]
  /** True when the list was truncated, so the panel can say so rather than
      letting a capped list read as the complete one. */
  coldSchoolsCapped: boolean
  filenamePrefix: string
}) {
  const totalSchools = coordinatorCoverage.reduce((sum, r) => sum + r.count, 0)

  const download = () => {
    const csv = toCsv(
      HEADERS,
      coldSchools.map((r) => [
        r.schoolName,
        r.state,
        r.district,
        r.eligibleCount,
        COORDINATOR_LABEL[r.coordinatorStatus] ?? r.coordinatorStatus,
      ])
    )
    // A BOM so Excel opens the file as UTF-8, matching IscExport.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filenamePrefix}-cold-schools.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/*
        Side by side on purpose: cold schools cluster under "nobody has
        applied", and seeing the two lists together says that without needing
        a correlation stat to prove it.
      */}
      <div className="clay-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-foreground text-sm">Schools yet to start</h2>
            <p className="text-xs text-muted mt-0.5">
              Students signed up, nothing entered — biggest first
            </p>
          </div>
          <button
            type="button"
            onClick={download}
            disabled={coldSchools.length === 0}
            className="h-8 px-2.5 rounded-xl border-2 border-black/[0.06] bg-white text-[11px] font-semibold text-foreground hover:bg-black/[0.03] disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        </div>

        {coldSchools.length === 0 ? (
          <p className="text-xs text-muted mt-3">
            Every school with eligible students has at least one entry.
          </p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-black/[0.06] max-h-80 overflow-y-auto">
              {coldSchools.map((s) => (
                <li key={s.schoolId}>
                  <Link
                    href={schoolHref(s)}
                    className="py-2 flex items-start justify-between gap-3 text-xs group"
                  >
                    <span className="min-w-0">
                      <span className="block text-foreground font-medium truncate group-hover:underline">
                        {s.schoolName}
                      </span>
                      <span className="block text-muted">
                        {s.district}, {s.state} ·{' '}
                        {COORDINATOR_LABEL[s.coordinatorStatus] ?? s.coordinatorStatus}
                      </span>
                    </span>
                    <span className="text-foreground font-semibold tabular-nums shrink-0">
                      {s.eligibleCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {coldSchoolsCapped && (
              <p className="text-[11px] text-muted mt-2">
                Showing the {coldSchools.length} with the most eligible students. Drill into a state
                or district to see the rest.
              </p>
            )}
          </>
        )}
      </div>

      <div className="clay-card p-5">
        <h2 className="font-display font-bold text-foreground text-sm">Coordinator coverage</h2>
        <p className="text-xs text-muted mt-0.5">
          {totalSchools} {totalSchools === 1 ? 'school' : 'schools'} in this view
        </p>
        {coordinatorCoverage.length === 0 ? (
          <p className="text-xs text-muted mt-3">No schools here yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {coordinatorCoverage.map((r) => {
              const pct = totalSchools ? (r.count / totalSchools) * 100 : 0
              return (
                <li key={r.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">
                      {COORDINATOR_LABEL[r.label] ?? r.label}
                    </span>
                    <span className="text-muted tabular-nums">{r.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        r.label === 'approved'
                          ? 'bg-green-600'
                          : r.label === 'pending'
                            ? 'bg-accent-yellow'
                            : 'bg-black/20'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
