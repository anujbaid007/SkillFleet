import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbSegment {
  label: string
  href: string
}

/**
 * National / Maharashtra / Pune / DAV Public School.
 *
 * Every segment but the last links back up, so the way out of a drill-down is
 * always on screen — the current scope is named rather than left to be
 * inferred from whichever numbers happen to be showing.
 */
export function IscBreadcrumb({
  segments,
  current,
}: {
  segments: BreadcrumbSegment[]
  current: string
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm flex-wrap">
      {segments.map((s) => (
        <span key={s.href} className="flex items-center gap-2">
          <Link href={s.href} className="text-muted hover:text-foreground font-medium">
            {s.label}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted/50" aria-hidden="true" />
        </span>
      ))}
      <span aria-current="page" className="font-semibold text-foreground">
        {current}
      </span>
    </nav>
  )
}
