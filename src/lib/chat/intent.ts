// What the assistant is being asked to do.
//
// The language model's ONLY job is to turn a message into one of these — it
// never touches the database. Execution always runs through the existing rules
// engine and RPCs, so age checks and cart limits still apply exactly as they
// do elsewhere.

export const MAX_PLAN_SIZE = 50

export type ChatIntent =
  | { kind: 'suggest'; childName?: string; count?: number }
  | { kind: 'plan'; childName?: string; count: number }
  | { kind: 'search'; childName?: string; type?: string; maxPricePaise?: number; query?: string }
  | { kind: 'add'; refs: number[]; all: boolean }
  | { kind: 'unshortlist'; refs: number[]; all: boolean }
  | { kind: 'help' }

const OFFERING_TYPES = ['workshop', 'trip', 'event', 'competition', 'internship'] as const

const ORDINALS: Record<string, number> = {
  first: 1, '1st': 1,
  second: 2, '2nd': 2,
  third: 3, '3rd': 3,
  fourth: 4, '4th': 4,
  fifth: 5, '5th': 5,
  sixth: 6, '6th': 6,
}

function clampCount(n: number): number {
  return Math.max(1, Math.min(MAX_PLAN_SIZE, Math.round(n)))
}

/** First plain number in the text, if any. */
function firstNumber(text: string): number | undefined {
  const m = text.match(/\b(\d{1,3})\b/)
  return m ? Number(m[1]) : undefined
}

/** A price ceiling like "under 500", "below ₹1,200", "less than 800". */
function maxPrice(text: string): number | undefined {
  const m = text.match(/(?:under|below|less than|cheaper than|max|upto|up to)\s*₹?\s*([\d,]+)/i)
  if (!m) return undefined
  const rupees = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(rupees) ? rupees * 100 : undefined
}

/** Lowercased word tokens. Matches whole words without regex escaping traps. */
function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9#]+/).filter(Boolean))
}

function offeringType(text: string): string | undefined {
  const w = words(text)
  return OFFERING_TYPES.find((t) => w.has(t) || w.has(`${t}s`))
}

/** Which listed items a message refers to: "the second one", "#3", "all". */
function pickRefs(t: string): { refs: number[]; all: boolean } {
  const tokens = words(t)
  if (tokens.has('all')) return { refs: [], all: true }

  const refs: number[] = []
  for (const [word, n] of Object.entries(ORDINALS)) {
    if (tokens.has(word)) refs.push(n)
  }
  for (const m of t.matchAll(/(?:number\s*|#)(\d{1,2})/g)) refs.push(Number(m[1]))
  // A bare number only counts right after the verb, so "under 500" is never
  // mistaken for item #500.
  if (refs.length === 0) {
    const n = t.match(/(?:add|book|put|remove|drop|delete|unshortlist)\s+(\d{1,2})(?!\d)/)
    if (n) refs.push(Number(n[1]))
  }
  return { refs: [...new Set(refs)], all: false }
}
/**
 * Keyword classifier used when the language model is unavailable — and as the
 * spec the model is prompted against. Deliberately conservative: anything it
 * cannot read confidently becomes `help` rather than a wrong action.
 */
export function classifyFallback(text: string): ChatIntent {
  const t = text.toLowerCase().trim()
  if (!t) return { kind: 'help' }

  // "remove the second one" / "unshortlist all" — checked before "add" so the
  // two never collide.
  if (['unshortlist', 'remove', 'drop', 'delete'].some((v) => words(t).has(v))) {
    const picked = pickRefs(t)
    if (picked.all || picked.refs.length > 0) {
      return { kind: 'unshortlist', refs: picked.refs, all: picked.all }
    }
    return { kind: 'help' }
  }

  // "add the second one" / "add all" / "book the first"
  if (['add', 'book', 'put'].some((v) => words(t).has(v))) {
    const picked = pickRefs(t)
    if (picked.all) return { kind: 'add', refs: [], all: true }
    if (picked.refs.length > 0) return { kind: 'add', refs: picked.refs, all: false }
    return { kind: 'help' }
  }

  // "plan the year", "plan 12 activities"
  if (/\bplan\b|whole year|year plan|for the year/.test(t)) {
    return { kind: 'plan', count: clampCount(firstNumber(t) ?? 6) }
  }

  // "what should she do", "suggest something", "recommendations"
  if (/\b(suggest|recommend|recommendation|what should|ideas?|gaps?|weak|improve|help .* grow)\b/.test(t)) {
    const n = firstNumber(t)
    return { kind: 'suggest', count: n ? clampCount(n) : undefined }
  }

  // "show me workshops", "anything under 500", "fitness activities"
  const type = offeringType(t)
  const price = maxPrice(t)
  if (type || price || /\b(show|find|search|browse|looking for|any|activities|options)\b/.test(t)) {
    return { kind: 'search', type, maxPricePaise: price, query: text.trim() }
  }

  return { kind: 'help' }
}

/** Narrows a loose object (e.g. model JSON) into a safe ChatIntent. */
export function coerceIntent(raw: unknown, fallbackText: string): ChatIntent {
  if (!raw || typeof raw !== 'object') return classifyFallback(fallbackText)
  const o = raw as Record<string, unknown>
  const kind = typeof o.kind === 'string' ? o.kind : ''
  const childName = typeof o.childName === 'string' && o.childName.trim() ? o.childName.trim() : undefined

  switch (kind) {
    case 'plan':
      return { kind: 'plan', childName, count: clampCount(Number(o.count) || 6) }
    case 'suggest': {
      const n = Number(o.count)
      return { kind: 'suggest', childName, count: Number.isFinite(n) && n > 0 ? clampCount(n) : undefined }
    }
    case 'search': {
      const price = Number(o.maxPricePaise)
      const type = typeof o.type === 'string' ? o.type.toLowerCase() : undefined
      return {
        kind: 'search',
        childName,
        type: OFFERING_TYPES.includes(type as (typeof OFFERING_TYPES)[number]) ? type : undefined,
        maxPricePaise: Number.isFinite(price) && price > 0 ? price : undefined,
        query: typeof o.query === 'string' ? o.query : fallbackText,
      }
    }
    case 'unshortlist':
    case 'add': {
      const all = o.all === true
      const refs = Array.isArray(o.refs)
        ? [...new Set(o.refs.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
        : []
      if (!all && refs.length === 0) return classifyFallback(fallbackText)
      return { kind: kind === 'unshortlist' ? 'unshortlist' : 'add', refs, all }
    }
    case 'help':
      return { kind: 'help' }
    default:
      return classifyFallback(fallbackText)
  }
}
