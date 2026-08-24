'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, BookOpen, ShoppingBag, Users, LogOut, UserRound, Award, Megaphone, ShoppingCart, Wallet, CalendarDays, Trophy } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import { AccountSwitcher } from '@/components/platform/account-switcher'
import type { SwitchTarget } from '@/app/actions/switch'
import type { UserProfile } from '@/lib/types/database'

// One account per student, so one nav. Everything a parent used to do —
// cart, wallet, the family view — now lives on the student's own account.
const studentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Growth Profile', icon: Activity },
  { href: '/isc', label: 'ISC 2026', icon: Trophy },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/catalog', label: 'Explore', icon: BookOpen },
  { href: '/requests', label: 'Requests', icon: Megaphone },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/bookings', label: 'My Bookings', icon: ShoppingBag },
  { href: '/certificates', label: 'Certificates', icon: Award },
  { href: '/family', label: 'My Family', icon: Users },
]

const adminNav = [{ href: '/admin', label: 'Admin', icon: Users }]

interface PlatformNavProps {
  profile: UserProfile
  /** Live cart count, shown as a badge next to Cart. */
  cartCount?: number
  /** Linked family accounts this user can switch into. */
  switchTargets?: SwitchTarget[]
}

export function PlatformNav({ profile, cartCount = 0, switchTargets = [] }: PlatformNavProps) {
  const pathname = usePathname()
  const navItems = profile.role === 'admin' ? adminNav : studentNav

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-black/5 hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {href === '/cart' && cartCount > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <div className="px-3 pb-4 border-t border-black/[0.06] pt-3 space-y-1">
        <AccountSwitcher targets={switchTargets} />
        <Link
          href="/account"
          className={[
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            pathname === '/account' || pathname.startsWith('/account/')
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-black/5 hover:text-foreground',
          ].join(' ')}
        >
          <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <UserRound className="w-4 h-4 text-primary" />
          </span>
          <span className="truncate">{profile.full_name ?? 'My Account'}</span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
