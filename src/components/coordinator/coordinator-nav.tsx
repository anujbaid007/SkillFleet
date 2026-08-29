'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut, Mail } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

const items = [
  { href: '/coordinator', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/coordinator/support', label: 'Contact Admin', icon: Mail, exact: false },
]

export function CoordinatorNav({ approved = true }: { approved?: boolean }) {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  /**
   * Live unread count for the Contact Admin badge.
   *
   * Re-derives the whole count on every change rather than incrementing and
   * decrementing it: a fresh count cannot drift out of step with reality after
   * a burst of messages or a dropped-then-resumed connection, and it avoids
   * capturing anything stale in the subscription callback. SupportThread's own
   * mark-read is what drives the number back down; this only reflects it.
   *
   * CoordinatorNav lives in the persistent sidebar layout rather than a page,
   * so this subscription survives navigation between /coordinator and
   * /coordinator/support instead of being torn down on every move.
   */
  useEffect(() => {
    if (!approved) return
    let cancelled = false
    const supabase = createClient()
    let convId: string | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null

    const refreshCount = async () => {
      if (!convId || cancelled) return
      const { count } = await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', convId)
        .eq('sender_role', 'admin')
        .is('read_at', null)
      if (!cancelled) setUnread(count ?? 0)
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user || cancelled) return

      // Realtime authenticates separately from ordinary queries — without this
      // the subscription registers as `anon`, auth.uid() is NULL in the RLS
      // check, and nothing is ever delivered. See SupportThread for the longer
      // note; this component only worked before because awaiting the session
      // happened to give the client time to load it.
      await supabase.realtime.setAuth(session.access_token)
      if (cancelled) return

      const { data: conv } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('coordinator_id', user.id)
        .maybeSingle()
      if (!conv || cancelled) return
      convId = conv.id

      await refreshCount()
      if (cancelled) return

      channel = supabase
        .channel(`coordinator-nav-unread-${conv.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'support_messages',
            filter: `conversation_id=eq.${conv.id}`,
          },
          () => {
            void refreshCount()
          }
        )
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [approved])

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
              {href === '/coordinator/support' && unread > 0 && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">
                  {unread}
                </span>
              )}
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
