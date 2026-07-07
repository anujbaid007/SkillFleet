'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, BookOpen, ShoppingBag, Users, Baby, LogOut, UserRound, Award, Layers } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import type { UserProfile } from '@/lib/types/database'

const studentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Growth Profile', icon: Activity },
  { href: '/catalog', label: 'Explore', icon: BookOpen },
  { href: '/packages', label: 'My Packages', icon: Layers },
  { href: '/bookings', label: 'My Bookings', icon: ShoppingBag },
  { href: '/certificates', label: 'Certificates', icon: Award },
]

const parentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/children', label: 'My Children', icon: Baby },
  { href: '/catalog', label: 'Explore', icon: BookOpen },
  { href: '/packages', label: 'Packages', icon: Layers },
  { href: '/bookings', label: 'My Bookings', icon: ShoppingBag },
]

const adminNav = [{ href: '/admin', label: 'Admin', icon: Users }]

interface PlatformNavProps {
  profile: UserProfile
}

export function PlatformNav({ profile }: PlatformNavProps) {
  const pathname = usePathname()
  const navItems =
    profile.role === 'parent' ? parentNav : profile.role === 'admin' ? adminNav : studentNav

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
            </Link>
          )
        })}
      </div>

      <div className="px-3 pb-4 border-t border-black/[0.06] pt-3 space-y-1">
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
