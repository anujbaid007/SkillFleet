'use client'

import { Download } from 'lucide-react'
import { toCsv } from '@/lib/isc/csv'
import { trackById, type IscTrackId } from '@/lib/isc/tracks'
import { formatIstDay, istDay } from '@/lib/isc/dates'

/** Exactly the columns a screening spreadsheet needs. */
export interface ExportRow {
  schoolName: string
  schoolState: string
  schoolDistrict: string
  leaderName: string
  track: IscTrackId
  teamSize: number
  status: string
  language: string | null
  submittedAt: string | null
  updatedAt: string
}

const HEADERS = [
  'School',
  'State',
  'District',
  'Team leader',
  'Championship',
  'Team size',
  'Status',
  'Language',
  'Submitted on',
  'Last edited',
]

/**
 * Downloads what is on screen, filters and all — unlike the panels above, which
 * always describe the whole cycle. Choosing the export by filtering is the
 * point of the button.
 *
 * Built in the browser from props rather than fetched: the page has already
 * done the filtering, and a second server round trip could return a different
 * set from the one the admin is looking at.
 */
export function IscExport({ rows, filename }: { rows: ExportRow[]; filename: string }) {
  const download = () => {
    const csv = toCsv(
      HEADERS,
      rows.map((r) => [
        r.schoolName,
        r.schoolState,
        r.schoolDistrict,
        r.leaderName,
        trackById(r.track)?.name ?? r.track,
        r.teamSize,
        // The same vocabulary the student and the coordinator see. "Submitted"
        // here and "Entered" on screen would read as two different things.
        r.status === 'submitted' ? 'Entered' : 'Draft',
        r.language ?? '',
        r.submittedAt ? formatIstDay(istDay(r.submittedAt)) : '',
        formatIstDay(istDay(r.updatedAt)),
      ])
    )
    // A BOM so Excel opens Hindi titles as UTF-8 rather than mojibake. Written
    // as an escape, not a literal — an invisible character in source is a bug
    // waiting to be deleted by accident.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="h-9 px-3 rounded-xl border-2 border-black/[0.06] bg-white text-xs font-semibold text-foreground hover:bg-black/[0.03] disabled:opacity-50 inline-flex items-center gap-1.5"
    >
      <Download className="w-3.5 h-3.5" />
      Download CSV
    </button>
  )
}
