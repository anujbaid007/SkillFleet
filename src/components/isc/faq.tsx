'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, LifeBuoy, Search, Trophy } from 'lucide-react'
import type { FaqAccent, FaqGroup } from '@/lib/isc/faq'

const ACCENT: Record<FaqAccent, { dot: string; ring: string; text: string }> = {
  primary: { dot: 'bg-primary', ring: 'ring-primary/25', text: 'text-primary' },
  teal: { dot: 'bg-accent-teal', ring: 'ring-accent-teal/25', text: 'text-accent-teal' },
  pink: { dot: 'bg-accent-pink', ring: 'ring-accent-pink/25', text: 'text-accent-pink' },
  yellow: { dot: 'bg-accent-yellow', ring: 'ring-accent-yellow/30', text: 'text-amber-600' },
}

/*
  The ISC FAQ page: a banner in the championship's own art, a search box that
  narrows every group as you type, and grouped accordions. One question is
  open at a time so the page never turns into a wall of text.
*/
export function IscFaq({ groups, subtitle }: { groups: FaqGroup[]; subtitle: string }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(groups[0]?.items[0]?.id ?? null)

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.join(' ').toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0)
  }, [groups, q])
  const count = visible.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="isc-stage relative overflow-hidden rounded-[22px] border-2 border-white shadow-[8px_8px_24px_rgba(80,50,160,0.10),-4px_-4px_14px_rgba(255,255,255,0.9)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="isc-ring absolute -bottom-[14rem] right-[-5rem] h-[24rem] w-[30rem]" />
          <span className="absolute right-[22%] top-4 h-14 w-14 rounded-full bg-accent-teal/20 blur-2xl" />
          <span className="absolute left-[38%] bottom-4 h-16 w-16 rounded-full bg-accent-pink/15 blur-2xl" />
        </div>
        <div className="relative grid items-end gap-4 p-5 sm:p-7 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm">
              <Trophy className="h-3.5 w-3.5" />
              ISC 2026
            </span>
            <h1 className="font-display mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              Everything about the championship,{' '}
              <span className="text-primary">answered</span>
              <span className="text-accent-teal">.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-foreground/70">
              {subtitle}{' '}
              <Link href="/isc-2026" className="font-semibold text-primary hover:underline">
                Read the public overview
              </Link>
              .
            </p>
            <label className="mt-4 flex max-w-md items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/90 px-3.5 py-2.5 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a question, e.g. teams, deadline, video"
                aria-label="Search the FAQ"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/70 focus:outline-none"
              />
              {q && (
                <span className="shrink-0 text-xs font-semibold text-muted">
                  {count} {count === 1 ? 'answer' : 'answers'}
                </span>
              )}
            </label>
          </div>
          <div className="hidden lg:block lg:w-[300px]">
            <Image
              src="/isc/2026/students.webp"
              alt=""
              width={1400}
              height={932}
              sizes="300px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>

      {/* Groups */}
      {visible.length === 0 ? (
        <div className="clay-card p-10 text-center">
          <p className="font-display font-bold text-foreground">Nothing matches that</p>
          <p className="mt-1 text-sm text-muted">Try a shorter word, or clear the search to see every question.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map((g) => {
            const accent = ACCENT[g.accent]
            return (
              <section key={g.id} aria-labelledby={`faq-${g.id}`} className="clay-card p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${accent.dot} ring-4 ${accent.ring}`} aria-hidden="true" />
                  <h2 id={`faq-${g.id}`} className="font-display text-base font-bold text-foreground">
                    {g.title}
                  </h2>
                  <span className="ml-auto text-xs text-muted">{g.items.length}</span>
                </div>
                <div className="divide-y divide-black/[0.06]">
                  {g.items.map((it) => {
                    const isOpen = open === it.id
                    return (
                      <div key={it.id}>
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : it.id)}
                          aria-expanded={isOpen}
                          aria-controls={`faq-a-${it.id}`}
                          className="flex w-full items-start justify-between gap-3 py-3 text-left"
                        >
                          <span className={`text-sm font-semibold ${isOpen ? accent.text : 'text-foreground'}`}>{it.q}</span>
                          <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-0.5 shrink-0 text-muted"
                          >
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              id={`faq-a-${it.id}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-2 pb-3 pr-6">
                                {it.a.map((p, i) => (
                                  <p key={i} className="text-sm leading-relaxed text-muted">
                                    {p}
                                  </p>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Still stuck */}
      <div className="clay-card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-teal text-white shadow-sm">
          <LifeBuoy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-foreground">Still stuck?</p>
          <p className="mt-0.5 text-sm text-muted">
            Write to the championship team and a person will answer, usually within a working day.
          </p>
        </div>
        <a
          href="mailto:contact@skillfleet.org"
          className="clay-button inline-flex h-10 shrink-0 items-center bg-cta px-5 text-sm font-semibold text-white"
        >
          contact@skillfleet.org
        </a>
      </div>
    </div>
  )
}
