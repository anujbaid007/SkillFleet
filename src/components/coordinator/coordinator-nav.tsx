'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

const items = [{ href: '/coordinator', label: 'Dashboard', icon: LayoutDashboard, exact: true }]

export function CoordinatorNav({ approved = true }: { approved?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 px-3 py-4 space-y-0.5">
        {/* An unapproved coordinator has nowhere to navigate to yet — showing a
            Dashboard link that only leads to a waiting screen is a false promise. */}
        {!approved && (
          <p className="px-3 py-2 text-xs text-muted">
            Your console opens once an admin approves your school.
          </p>
        )}
        {(approved ? items : []).map(({ href, label, icon: Icon, exact }) => {
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
