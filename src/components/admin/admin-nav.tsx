'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Sliders,
  FolderTree,
  Package,
  Layers,
  HelpCircle,
  ClipboardList,
  Users,
  FileCheck,
  CheckSquare,
  Megaphone,
  Store,
  LogOut,
} from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

const adminNavItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/parameters', label: 'Parameters', icon: Sliders },
  { href: '/admin/taxonomy', label: 'Taxonomy', icon: FolderTree },
  { href: '/admin/offerings', label: 'Offerings', icon: Package },
  { href: '/admin/vendors', label: 'Vendors', icon: Store },
  { href: '/admin/requests', label: 'Requests', icon: Megaphone },
  { href: '/admin/packages', label: 'Packages', icon: Layers },
  { href: '/admin/questionnaire', label: 'Questionnaire', icon: HelpCircle },
  { href: '/admin/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/certificates', label: 'Certificates', icon: FileCheck },
  { href: '/admin/completions', label: 'Completions', icon: CheckSquare },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 px-3 py-4 space-y-0.5">
        {adminNavItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-black/5 hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </div>

      <div className="px-3 pb-4 border-t border-black/[0.06] pt-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
