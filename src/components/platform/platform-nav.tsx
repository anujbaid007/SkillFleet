'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, BookOpen, ShoppingBag, Users, LogOut, UserRound, Award, Megaphone, ShoppingCart, Wallet, CalendarDays, Trophy, HelpCircle, type LucideIcon } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import { AccountSwitcher } from '@/components/platform/account-switcher'
import type { SwitchTarget } from '@/app/actions/switch'
import type { UserProfile } from '@/lib/types/database'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Colour of the icon tile at rest: a soft wash and its ink. */
  tile: string
  /** The championship gets its own treatment: a gradient pill, always on. */
  featured?: boolean
}

// One account per student, so one nav. Everything a parent used to do —
// cart, wallet, the family view — now lives on the student's own account.
//
// Tiles cycle through the brand's four accents so neighbours never share a
// colour; the active item's tile goes solid primary with a white icon.
const studentNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tile: 'bg-primary/10 text-primary' },
  { href: '/profile', label: 'Growth Profile', icon: Activity, tile: 'bg-accent-teal/15 text-accent-teal' },
  { href: '/isc', label: 'ISC 2026', icon: Trophy, tile: '', featured: true },
  { href: '/faq', label: 'FAQ', icon: HelpCircle, tile: 'bg-accent-yellow/20 text-amber-600' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, tile: 'bg-accent-pink/15 text-accent-pink' },
  { href: '/catalog', label: 'Explore', icon: BookOpen, tile: 'bg-accent-yellow/20 text-amber-600' },
  { href: '/requests', label: 'Requests', icon: Megaphone, tile: 'bg-accent-purple/15 text-accent-purple' },
  { href: '/cart', label: 'Cart', icon: ShoppingCart, tile: 'bg-accent-teal/15 text-accent-teal' },
  { href: '/wallet', label: 'Wallet', icon: Wallet, tile: 'bg-accent-pink/15 text-accent-pink' },
  { href: '/bookings', label: 'My Bookings', icon: ShoppingBag, tile: 'bg-accent-yellow/20 text-amber-600' },
  { href: '/certificates', label: 'Certificates', icon: Award, tile: 'bg-primary/10 text-primary' },
  { href: '/family', label: 'My Family', icon: Users, tile: 'bg-accent-purple/15 text-accent-purple' },
]

const adminNav: NavItem[] = [{ href: '/admin', label: 'Admin', icon: Users, tile: 'bg-primary/10 text-primary' }]

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
        {navItems.map(({ href, label, icon: Icon, tile, featured }) => {
          const active = pathname === href || pathname.startsWith(href + '/')

          if (featured) {
            return (
              <Link
                key={href}
                href={href}
                prefetch
                className={[
                  'flex items-center gap-3 px-2.5 py-2 rounded-2xl text-sm font-bold text-white',
                  'bg-gradient-to-r from-primary via-accent-purple to-accent-teal',
                  'shadow-[0_6px_16px_rgba(116,71,225,0.28)] transition-[filter,box-shadow] hover:brightness-105',
                  active ? 'ring-2 ring-primary/35 ring-offset-2 ring-offset-white' : '',
                ].join(' ')}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-yellow animate-pulse" />
                  Live
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              /*
                Every page behind the sidebar is dynamic, and Next only
                prefetches a dynamic route as far as its loading boundary
                unless asked for the whole thing. Without this a tap showed the
                skeleton and then waited on the server; with it the page is
                usually already in the client cache when the tap lands.

                This is the sidebar of a signed-in app — a known, small set of
                destinations the reader moves between constantly — so warming
                them is worth the background requests. Results are reused for
                the `static` window in next.config.ts rather than refetched per
                navigation.
              */
              prefetch
              className={[
                'flex items-center gap-3 px-2.5 py-2 rounded-2xl text-sm font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-black/5 hover:text-foreground',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors',
                  active ? 'bg-primary text-white shadow-sm' : tile,
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
              </span>
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
            'flex items-center gap-3 px-2.5 py-2 rounded-2xl text-sm font-medium transition-colors',
            pathname === '/account' || pathname.startsWith('/account/')
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-black/5 hover:text-foreground',
          ].join(' ')}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <UserRound className="h-4 w-4 text-primary" />
          </span>
          <span className="truncate">{profile.full_name ?? 'My Account'}</span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-2.5 py-2 rounded-2xl text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]">
              <LogOut className="h-4 w-4" />
            </span>
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
