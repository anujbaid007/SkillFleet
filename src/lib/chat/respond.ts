import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { openRouterChat, activeModelName } from '@/lib/recommender/openrouter'
import { runRecommender, runPlanner } from '@/lib/recommender/generate'
import { calculateAge, isAgeEligible } from '@/lib/utils/age'
import { coerceIntent, classifyFallback, type ChatIntent } from '@/lib/chat/intent'
import { MAX_CART_ITEMS, discountPercentFor } from '@/lib/commerce/discount'

export interface ChatOfferingCard {
  offeringId: string
  title: string
  type: string
  pricePaise: number
  reason?: string
  parameters?: { id: string; name: string }[]
}

export interface ChatMessageIn {
  role: 'user' | 'assistant'
  text: string
}

export interface ChatTurnResult {
  reply: string
  offerings: ChatOfferingCard[]
  childId: string | null
  childName: string | null
  /** Which model answered, or 'fallback' when the deterministic path ran. */
  model: string
}

export interface Learner {
  id: string
  name: string
  dob: string | null
}

/** Ask the model to classify the request. Falls back to keywords if unavailable. */
async function classify(
  history: ChatMessageIn[],
  message: string,
  childNames: string[]
): Promise<{ intent: ChatIntent; reply?: string; usedModel: boolean }> {
  const recent = history
    .slice(-6)
    .map((m) => (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.text)
    .join('\n')

  const system =
    'You route messages for SkillFleet, a growth platform for school students. ' +
    'Classify the request. You never invent activities and never make bookings. ' +
    'Reply with ONLY a JSON object with these keys: kind (one of suggest, plan, search, add, unshortlist, help), ' +
    'childName (string or null), count (number or null), type (one of workshop, trip, event, competition, internship, or null), ' +
    'maxPricePaise (number or null), refs (array of 1-based numbers or null), all (boolean), reply (one short friendly sentence). ' +
    'Use "add" when the user refers to items just listed, and "unshortlist" when they want to remove something they saved. Use "plan" for a whole year, ' +
    '"suggest" for gap-based ideas, "search" for browsing, "help" if unclear.'

  const user =
    'Children: ' + (childNames.join(', ') || '(none)') + '\n' +
    'Recent conversation:\n' + (recent || '(none)') + '\n\n' +
    'New message: ' + message

  const raw = await openRouterChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { maxTokens: 300, temperature: 0.2 }
  )

  if (!raw) return { intent: classifyFallback(message), usedModel: false }

  try {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      intent: coerceIntent(parsed, message),
      reply: typeof parsed.reply === 'string' ? parsed.reply.trim() : undefined,
      usedModel: true,
    }
  } catch {
    return { intent: classifyFallback(message), usedModel: false }
  }
}

/** Live, approved, not-past activities this learner could still book. */
async function searchOfferings(
  supabase: SupabaseClient,
  learner: Learner,
  intent: Extract<ChatIntent, { kind: 'search' }>
): Promise<ChatOfferingCard[]> {
  const nowIso = new Date().toISOString()

  const [{ data: rows }, { data: booked }] = await Promise.all([
    supabase
      .from('offerings')
      .select('id, title, type, price_paise, min_age, max_age, scheduled_at')
      .eq('status', 'live')
      .eq('review_status', 'approved')
      .or('scheduled_at.is.null,scheduled_at.gte.' + nowIso)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(60),
    supabase
      .from('bookings')
      .select('offering_id')
      .eq('student_id', learner.id)
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled'),
  ])

  const bookedIds = new Set((booked ?? []).map((b) => b.offering_id))
  const age = learner.dob ? calculateAge(learner.dob) : null

  return (rows ?? [])
    .filter((o) => !bookedIds.has(o.id))
    .filter((o) => age === null || isAgeEligible(age, o.min_age, o.max_age))
    .filter((o) => (intent.type ? o.type === intent.type : true))
    .filter((o) => (intent.maxPricePaise ? o.price_paise <= intent.maxPricePaise : true))
    .slice(0, 6)
    .map((o) => ({ offeringId: o.id, title: o.title, type: o.type, pricePaise: o.price_paise }))
}

/** Attach live price/type to engine output, dropping anything no longer bookable. */
async function decorate(
  supabase: SupabaseClient,
  items: { offering_id: string; title: string; reason: string; parameters: { id: string; name: string }[] }[]
): Promise<ChatOfferingCard[]> {
  if (items.length === 0) return []

  const { data } = await supabase
    .from('offerings')
    .select('id, type, price_paise, status, review_status')
    .in('id', items.map((i) => i.offering_id))
  const meta = new Map((data ?? []).map((o) => [o.id, o]))

  return items
    .filter((i) => {
      const m = meta.get(i.offering_id)
      return m?.status === 'live' && m?.review_status === 'approved'
    })
    .map((i) => {
      const m = meta.get(i.offering_id)!
      return {
        offeringId: i.offering_id,
        title: i.title,
        type: m.type,
        pricePaise: m.price_paise,
        reason: i.reason,
        parameters: i.parameters,
      }
    })
}

/**
 * One conversational turn.
 *
 * The model only classifies intent — every activity shown comes from the same
 * rules engine the rest of the app uses, and adding to the cart goes through
 * the add_to_cart RPC, so age limits, duplicates and the 50-item cap all still
 * apply.
 */
export async function respondToMessage(
  supabase: SupabaseClient,
  opts: {
    learners: Learner[]
    activeChildId: string | null
    message: string
    history: ChatMessageIn[]
    lastOfferingIds: string[]
  }
): Promise<ChatTurnResult> {
  const { learners, message, history, lastOfferingIds } = opts

  if (learners.length === 0) {
    return {
      reply: 'I could not find your growth profile yet — finish onboarding and I can help.',
      offerings: [],
      childId: null,
      childName: null,
      model: 'fallback',
    }
  }

  const { intent, reply: modelReply, usedModel } = await classify(
    history,
    message,
    learners.map((l) => l.name)
  )

  // An explicitly named child wins; otherwise stay with the active one.
  const namedChild =
    'childName' in intent && intent.childName
      ? learners.find((l) => l.name.toLowerCase().startsWith(String(intent.childName).toLowerCase()))
      : undefined
  const learner = namedChild ?? learners.find((l) => l.id === opts.activeChildId) ?? learners[0]

  const model = usedModel ? activeModelName() : 'fallback'
  const base = { childId: learner.id, childName: learner.name, model }

  switch (intent.kind) {
    case 'suggest': {
      const result = await runRecommender(supabase, learner.id, learner.name, learner.dob)
      // The model sometimes infers count: 1 from an open question like "what next?".
      // Only honour an explicit small number; otherwise show a useful handful.
      const limit = intent.count && intent.count >= 2 ? intent.count : 4
      const cards = (await decorate(supabase, result.items)).slice(0, limit)
      return {
        ...base,
        offerings: cards,
        reply: cards.length
          ? result.summary
          : 'I could not find anything new for ' + learner.name +
            ' right now — everything suitable is already booked or outside their age range.',
      }
    }

    case 'plan': {
      const result = await runPlanner(
        supabase,
        learner.id,
        learner.name,
        learner.dob,
        intent.count,
        Date.now()
      )
      const cards = await decorate(supabase, result.items)
      const shortfall =
        cards.length > 0 && cards.length < intent.count
          ? ' I could only find ' + cards.length +
            (cards.length === 1 ? ' suitable activity' : ' suitable activities') + ' right now.'
          : ''
      return {
        ...base,
        offerings: cards,
        reply: cards.length
          ? result.summary + shortfall
          : 'I could not build a plan for ' + learner.name +
            ' yet — there are not enough suitable activities available.',
      }
    }

    case 'search': {
      const cards = await searchOfferings(supabase, learner, intent)
      return {
        ...base,
        offerings: cards,
        reply: cards.length
          ? modelReply ?? 'Here is what I found for ' + learner.name + '.'
          : 'Nothing matches that for ' + learner.name +
            ' at the moment — try a wider price range or a different type.',
      }
    }

    case 'add': {
      const ids = intent.all
        ? lastOfferingIds
        : intent.refs.map((r) => lastOfferingIds[r - 1]).filter(Boolean)

      if (ids.length === 0) {
        return {
          ...base,
          offerings: [],
          reply: 'I am not sure which one you meant — tell me the number, or ask me to suggest something first.',
        }
      }

      let added = 0
      for (const offeringId of ids.slice(0, MAX_CART_ITEMS)) {
        const { data } = await supabase.rpc('add_to_cart', {
          p_student_id: learner.id,
          p_offering_id: offeringId,
        })
        if (data === 'ok') added += 1
      }

      if (added === 0) {
        return {
          ...base,
          offerings: [],
          reply: 'Those are already in your cart or already booked — nothing new to add.',
        }
      }

      const { count } = await supabase.from('cart_items').select('id', { count: 'exact', head: true })
      const total = count ?? added
      const pct = discountPercentFor(total)
      const discountNote = pct > 0 ? ' Your cart now qualifies for ' + pct + '% off.' : ''

      return {
        ...base,
        offerings: [],
        reply:
          'Added ' + added + (added === 1 ? ' activity' : ' activities') + ' for ' + learner.name +
          '. Your cart has ' + total + (total === 1 ? ' item' : ' items') + '.' + discountNote,
      }
    }

    case 'unshortlist': {
      const ids = intent.all
        ? lastOfferingIds
        : intent.refs.map((r) => lastOfferingIds[r - 1]).filter(Boolean)

      if (ids.length === 0) {
        return {
          ...base,
          offerings: [],
          reply: 'Tell me which one to remove — for example "remove the second one".',
        }
      }

      const { error } = await supabase
        .from('student_shortlist')
        .delete()
        .eq('student_id', learner.id)
        .in('offering_id', ids)

      return {
        ...base,
        offerings: [],
        reply: error
          ? 'I could not update your shortlist, sorry.'
          : 'Removed ' + ids.length + (ids.length === 1 ? ' activity' : ' activities') + ' from your shortlist.',
      }
    }

    default:
      return {
        ...base,
        offerings: [],
        reply:
          modelReply ??
          'I can suggest activities that close ' + learner.name +
            ' growth gaps, plan a whole year, or search the catalogue. Try asking what ' +
            learner.name + ' should do next.',
      }
  }
}
