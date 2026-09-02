'use client'

import { useState } from 'react'
import { Check, Copy, Link2, MessageCircle } from 'lucide-react'
import { joinUrl, whatsappShareHref } from '@/lib/coordinator/join-link'

/**
 * The share panel a coordinator sends to their students.
 *
 * `origin` comes from the request's own host rather than a constant, so the
 * copied link always points at the host the coordinator is actually using —
 * building it from a hardcoded domain is the classic way this breaks on
 * staging. Passing it in rather than reading window.location on mount also
 * means the real link is in the first paint, with no empty field to flash.
 */
export function ShareLinks({
  schoolId,
  schoolName,
  origin,
}: {
  schoolId: string
  schoolName: string
  origin: string
}) {
  const [copied, setCopied] = useState(false)

  const url = joinUrl(schoolId, schoolName, origin)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is blocked in some in-app browsers; the input below is
      // selectable, so there is still a way to get the link out.
      setCopied(false)
    }
  }

  return (
    <div className="clay-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-teal to-primary">
          <Link2 className="h-4 w-4 text-white" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
            Invite your students
          </h2>
          <p className="text-xs text-muted">
            Anyone who signs up through this link joins {schoolName} automatically.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your school's signup link"
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-black/[0.06] bg-black/[0.02] px-3 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="clay-button inline-flex h-11 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
          <a
            href={whatsappShareHref(schoolName, url)}
            target="_blank"
            rel="noopener noreferrer"
            className="clay-button inline-flex h-11 items-center justify-center gap-2 bg-[#25D366] px-4 text-sm font-semibold text-white"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        The link fills in your school on the signup form. Students can still change it, and it
        gives nobody access to your console.
      </p>
    </div>
  )
}
