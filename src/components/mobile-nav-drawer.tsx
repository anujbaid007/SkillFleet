'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

// Mobile top bar + slide-out navigation drawer for the logged-in app shells
// (platform + admin). The desktop sidebar is hidden below `md`; this provides
// the equivalent navigation on phones/tablets. The actual nav (PlatformNav /
// AdminNav) is passed in as `children` so this stays layout-agnostic.
export function MobileNavDrawer({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the drawer whenever the route changes (i.e. a nav link was tapped).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-black/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="SkillFleet" width={110} height={30} className="h-7 w-auto" priority />
          {subtitle && (
            <span className="text-[10px] font-medium text-muted uppercase tracking-wider">{subtitle}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 rounded-xl text-foreground hover:bg-black/5 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="absolute left-0 top-0 h-full w-72 max-w-[80%] bg-white shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-black/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                  <Image src="/logo.svg" alt="SkillFleet" width={110} height={30} className="h-7 w-auto" />
                  {subtitle && (
                    <span className="text-[10px] font-medium text-muted uppercase tracking-wider">{subtitle}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="p-2 -mr-2 rounded-xl text-foreground hover:bg-black/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{children}</div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
