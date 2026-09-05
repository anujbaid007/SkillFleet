import Link from 'next/link'
import { UserCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui/page-header'

/*
  The Coordinators section is four screens behind one nav entry, so they share
  one header: the same eyebrow, the same tab strip in the same place, and the
  page's own title underneath.

  Rendered by every page in the section INCLUDING the ones that answer
  "migration missing", so the way out of a half-built page is always on screen.
*/

export type CoordinatorTab = 'overview' | 'directory' | 'claims' | 'support'

const TABS: { key: CoordinatorTab; href: string; label: string }[] = [
  { key: 'overview', href: '/admin/coordinators', label: 'Overview' },
  { key: 'directory', href: '/admin/coordinators/directory', label: 'Directory' },
  { key: 'claims', href: '/admin/coordinators/claims', label: 'Claims' },
  { key: 'support', href: '/admin/coordinators/support', label: 'Support' },
]

const TAB_ON = 'bg-primary text-white'
const TAB_OFF = 'border border-black/10 text-muted hover:text-foreground'

/**
 * The strip on its own, for a page that already has its own heading — the
 * detail page, which is titled with a person's name rather than a tab's.
 */
export function CoordinatorTabs({ active }: { active?: CoordinatorTab }) {
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Coordinators">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? 'page' : undefined}
          className={`h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center transition-colors ${
            active === t.key ? TAB_ON : TAB_OFF
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

export function CoordinatorHeader({
  active,
  title,
  subtitle,
  breadcrumb,
  action,
}: {
  active?: CoordinatorTab
  title: string
  subtitle?: string
  /** The way back up, on the state page. */
  breadcrumb?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="space-y-4">
      {breadcrumb}
      <PageHeader
        eyebrow="ISC"
        icon={UserCheck}
        title={title}
        subtitle={subtitle}
        action={action}
      />
      <CoordinatorTabs active={active} />
    </div>
  )
}
