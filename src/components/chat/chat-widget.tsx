'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X, Send, Loader2, ShoppingCart, GripVertical } from 'lucide-react'
import { sendChatMessageAction } from '@/app/actions/chat'
import type { ChatOfferingCard } from '@/lib/chat/respond'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  offerings?: ChatOfferingCard[]
}

const POSITION_KEY = 'sf-chat-position'
const BUTTON = 56
const MARGIN = 16

function formatPrice(paise: number) {
  return paise === 0 ? 'Free' : '₹' + (paise / 100).toLocaleString('en-IN')
}

/** Keeps the launcher fully on screen after drags and window resizes. */
function clamp(x: number, y: number) {
  const maxX = Math.max(MARGIN, window.innerWidth - BUTTON - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - BUTTON - MARGIN)
  return { x: Math.min(Math.max(x, MARGIN), maxX), y: Math.min(Math.max(y, MARGIN), maxY) }
}

export function ChatWidget({ firstName, siblingNames = [] }: { firstName: string; siblingNames?: string[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [activeChildId, setActiveChildId] = useState<string | null>(null)

  const dragState = useRef<{ dx: number; dy: number; moved: boolean } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Restore the saved position (per device), defaulting to bottom-right.
  useEffect(() => {
    const saved = localStorage.getItem(POSITION_KEY)
    if (saved) {
      try {
        const p = JSON.parse(saved)
        if (typeof p?.x === 'number' && typeof p?.y === 'number') {
          setPos(clamp(p.x, p.y))
          return
        }
      } catch {
        // Ignore a corrupt value and fall through to the default.
      }
    }
    setPos(clamp(window.innerWidth - BUTTON - 24, window.innerHeight - BUTTON - 24))
  }, [])

  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clamp(p.x, p.y) : p))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  function onPointerDown(e: React.PointerEvent) {
    if (!pos) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragState.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragState.current
    if (!d) return
    const next = clamp(e.clientX - d.dx, e.clientY - d.dy)
    // Only count as a drag once it actually moves, so a tap still opens the panel.
    if (Math.abs(next.x - (pos?.x ?? 0)) > 3 || Math.abs(next.y - (pos?.y ?? 0)) > 3) d.moved = true
    setPos(next)
  }

  function onPointerUp() {
    const d = dragState.current
    dragState.current = null
    if (!d) return
    if (d.moved && pos) localStorage.setItem(POSITION_KEY, JSON.stringify(pos))
    else setOpen((v) => !v)
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || pending) return

    const history = messages.map((m) => ({ role: m.role, text: m.text }))
    const lastOfferingIds =
      [...messages].reverse().find((m) => m.offerings?.length)?.offerings?.map((o) => o.offeringId) ?? []

    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setInput('')
    setPending(true)

    try {
      const res = await sendChatMessageAction({ message: trimmed, history, lastOfferingIds, activeChildId })
      if (res.childId) setActiveChildId(res.childId)
      setMessages((m) => [...m, { role: 'assistant', text: res.reply, offerings: res.offerings }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'Something went wrong reaching the assistant. Please try again.' },
      ])
    } finally {
      setPending(false)
    }
  }

  // With siblings on the account, offer one starter that names them, so it is
  // obvious the assistant can plan for the whole family.
  const suggestions = [
    'What should I do next?',
    ...(siblingNames.length ? [`What should ${siblingNames[0]} do next?`] : ['Plan my whole year']),
    'Show me workshops under 700',
  ]

  if (!pos) return null

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          className="fixed z-50 clay-card flex flex-col overflow-hidden"
          style={{
            width: 'min(24rem, calc(100vw - 2rem))',
            height: 'min(32rem, calc(100vh - 6rem))',
            left: Math.min(pos.x, Math.max(MARGIN, window.innerWidth - 400)),
            top: Math.max(MARGIN, pos.y - Math.min(512, window.innerHeight - 96) - 12),
          }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.06] bg-gradient-to-r from-primary/[0.08] to-accent-teal/[0.06]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-foreground text-sm leading-tight">SkillFleet Assistant</p>
              <p className="text-[11px] text-muted">Suggestions, plans and bookings</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Hi! I can suggest activities that close growth gaps, plan a whole year, or search the
                  catalogue — and add them straight to your cart.
                </p>
                <div className="space-y-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl bg-primary/[0.06] text-primary hover:bg-primary/[0.12] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={
                    m.role === 'user'
                      ? 'ml-auto max-w-[85%] bg-primary text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-sm'
                      : 'mr-auto max-w-[92%] bg-black/[0.04] text-foreground rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm'
                  }
                >
                  {m.text}
                </div>

                {m.offerings && m.offerings.length > 0 && (
                  <div className="space-y-2">
                    {m.offerings.map((o, idx) => {
                      const meta = OFFERING_TYPE_META[o.type]
                      const Icon = meta?.icon
                      return (
                        <div key={o.offeringId} className="rounded-xl border border-black/[0.07] p-3 bg-white">
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div
                              className={
                                'w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br ' +
                                (meta?.gradient ?? 'from-primary to-primary-light')
                              }
                            >
                              {Icon && <Icon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={'/catalog/' + o.offeringId}
                                className="font-semibold text-foreground text-sm hover:text-primary transition-colors block truncate"
                              >
                                {o.title}
                              </Link>
                              <p className="text-[11px] text-muted">
                                {meta?.label ?? o.type} · {formatPrice(o.pricePaise)}
                              </p>
                              {o.reason && <p className="text-xs text-muted mt-1">{o.reason}</p>}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    <button
                      type="button"
                      onClick={() => send('add all')}
                      disabled={pending}
                      className="w-full clay-button bg-cta text-white h-10 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {'Add all ' + m.offerings.length + ' to cart'}
                    </button>
                    <p className="text-[11px] text-muted text-center">
                      Or say “add the second one”.
                    </p>
                  </div>
                )}
              </div>
            ))}

            {pending && (
              <div className="mr-auto bg-black/[0.04] rounded-2xl rounded-bl-sm px-3.5 py-2 inline-flex items-center gap-2 text-sm text-muted">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="p-3 border-t border-black/[0.06] flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for activities…"
              maxLength={500}
              className="flex-1 h-10 px-3 rounded-xl border-2 border-black/[0.06] bg-white text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              aria-label="Send"
              className="w-10 h-10 rounded-xl bg-cta text-white flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Draggable launcher */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        style={{ left: pos.x, top: pos.y, width: BUTTON, height: BUTTON, touchAction: 'none' }}
        className="fixed z-50 rounded-full bg-gradient-to-br from-primary to-accent-teal text-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition-transform group"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
        <GripVertical className="w-3 h-3 absolute -right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-70 transition-opacity" />
      </button>
    </>
  )
}
