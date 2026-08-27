'use client'

import Link from 'next/link'
import { Download, PhoneOff, UserCheck } from 'lucide-react'
import { toCsv } from '@/lib/isc/csv'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { ProgressRow } from '@/components/dashboard/charts'
import type { ColdSchoolRow } from '@/lib/isc/outreach'
import type { CountRow } from '@/lib/isc/analytics'

/**
 * A cold school is still a school worth opening — its roster names the exact
 * students who have not started, which is what an outreach call needs. The
 * comparison chart cannot link there, because a school with no entries never
 * appears in it.
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

const COVERAGE_BAR: Record<string, string> = {
  approved: 'bg-emerald-500',
  pending: 'bg-amber-400',
  none: 'bg-slate-300',
  rejected: 'bg-rose-300',
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
    <div className="grid gap-4 lg:grid-cols-2">
      {/*
        Side by side on purpose: cold schools cluster under "nobody has
        applied", and seeing the two together says that without needing a
        correlation stat to prove it.
      */}
      <Panel
        title="Schools yet to start"
        subtitle="Students signed up, nothing entered — biggest opportunity first"
        icon={PhoneOff}
        action={
          <button
            type="button"
            onClick={download}
            disabled={coldSchools.length === 0}
            className="h-8 px-2.5 rounded-lg border border-black/10 bg-white text-[11px] font-semibold text-foreground hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        }
      >
        {coldSchools.length === 0 ? (
          <PanelEmpty>Every school with eligible students has at least one entry.</PanelEmpty>
        ) : (
          <>
            <ul className="divide-y divide-black/[0.05] max-h-96 overflow-y-auto">
              {coldSchools.map((s) => (
                <li key={s.schoolId}>
                  <Link
                    href={schoolHref(s)}
                    className="px-2 py-3 flex items-start justify-between gap-3 group hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] text-foreground font-semibold truncate group-hover:text-primary">
                        {s.schoolName}
                      </span>
                      <span className="block text-[11px] text-muted mt-0.5">
                        {s.district}, {s.state} ·{' '}
                        {COORDINATOR_LABEL[s.coordinatorStatus] ?? s.coordinatorStatus}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-bold text-foreground tabular-nums">
                        {s.eligibleCount}
                      </span>
                      <span className="block text-[10px] text-muted">eligible</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {coldSchoolsCapped && (
              <p className="text-[11px] text-muted mt-3 pt-3 border-t border-black/[0.05]">
                Showing the {coldSchools.length} with the most eligible students. Drill into a state
                or district to see the rest.
              </p>
            )}
          </>
        )}
      </Panel>

      <Panel
        title="Coordinator coverage"
        subtitle={`${totalSchools} ${totalSchools === 1 ? 'school' : 'schools'} with a coordinator claim`}
        icon={UserCheck}
      >
        {coordinatorCoverage.length === 0 ? (
          <PanelEmpty>No schools here yet.</PanelEmpty>
        ) : (
          <ul className="space-y-3.5">
            {coordinatorCoverage.map((r) => (
              <ProgressRow
                key={r.label}
                label={COORDINATOR_LABEL[r.label] ?? r.label}
                value={r.count}
                of={totalSchools}
                barClass={COVERAGE_BAR[r.label] ?? 'bg-slate-300'}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
