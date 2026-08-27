'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  /** Second line under the label — used to tell apart schools that share a name. */
  sublabel?: string | null
}

interface Props {
  /** Shared input styling from the host form. */
  className: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  /** Shown while the options are still loading. */
  loading?: boolean
  /** Pinned to the bottom of the list — e.g. "My school isn't listed". */
  footerAction?: { label: string; onSelect: () => void }
  /** Longest list we render at once; typing narrows towards it. */
  limit?: number
  inputId?: string
  ariaLabel?: string
}

/**
 * A type-to-filter dropdown that always opens downward.
 *
 * A native <select> flips its list upward when it is near the bottom of the
 * viewport — the browser decides, and CSS cannot override it. These lists are
 * long (36 states, up to 75 districts, 729 schools), so the flip happened
 * often. Owning the element is the only way to control the direction, and it
 * lets the same field be typed into as well as picked from.
 */
export function SearchableSelect({
  className,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  loading = false,
  footerAction,
  limit = 50,
  inputId,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const generatedId = useId()
  const listId = `${generatedId}-listbox`

  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, limit)
    // Every term must appear somewhere, so word order does not matter.
    const terms = q.split(/\s+/)
    return options
      .filter((o) => {
        const hay = `${o.label} ${o.sublabel ?? ''}`.toLowerCase()
        return terms.every((t) => hay.includes(t))
      })
      .slice(0, limit)
  }, [options, query, limit])

  // Close when focus or a click leaves the field, so the list never strands open.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(next: string) {
    onChange(next)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        placeholder={loading ? 'Loading…' : placeholder}
        // While the list is open the field is a search box; when closed it
        // shows what was chosen.
        value={open ? query : selected?.label ?? ''}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        className={`${className} pr-10`}
      />
      <ChevronDown
        className={`w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${
          open ? 'rotate-180' : ''
        } ${disabled ? 'text-muted/40' : 'text-muted'}`}
      />

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          // top-full pins the list below the field — the whole point of this
          // component over a native <select>.
          className="absolute top-full left-0 z-30 mt-1 w-full max-h-64 overflow-y-auto clay-card p-1 bg-white"
        >
          {filtered.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => choose(o.value)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-black/[0.04] ${
                  o.value === value ? 'bg-primary/[0.06]' : ''
                }`}
              >
                <span className="block text-sm font-medium text-foreground">{o.label}</span>
                {o.sublabel && (
                  <span className="block text-xs text-muted truncate">{o.sublabel}</span>
                )}
              </button>
            </li>
          ))}

          {filtered.length === 0 && !loading && (
            <li className="px-3 py-2 text-sm text-muted">No match.</li>
          )}

          {footerAction && (
            <li className="border-t border-black/[0.06] mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  footerAction.onSelect()
                  setQuery('')
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/[0.06]"
              >
                {footerAction.label}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
