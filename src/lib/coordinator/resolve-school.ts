import { adminClient } from '@/lib/supabase/admin'
import { idRangeForCode, parseJoinSlug, schoolSlug } from '@/lib/coordinator/join-link'

export interface JoinSchool {
  id: string
  name: string
  state: string
  district: string
}

/**
 * The school a join slug points at, or null.
 *
 * Reads both link shapes: the readable `st-johns-421849`, and the original
 * bare uuid, which is still honoured because a link already sent to a school
 * WhatsApp group cannot be recalled.
 *
 * Uses the service-role client throughout: a signed-out visitor is exactly who
 * these links are for, and RLS on `schools` assumes a session.
 */
export async function resolveJoinSchool(raw: string): Promise<JoinSchool | null> {
  const parsed = parseJoinSlug(raw)

  if (parsed.schoolId) {
    const { data } = await adminClient
      .from('schools')
      .select('id, name, state, district')
      .eq('id', parsed.schoolId)
      .maybeSingle()
    return data ?? null
  }

  if (!parsed.code) return null

  const { low, high } = idRangeForCode(parsed.code)
  const { data } = await adminClient
    .from('schools')
    .select('id, name, state, district')
    .gte('id', low)
    .lte('id', high)

  const rows = data ?? []
  if (rows.length <= 1) return rows[0] ?? null

  // Six hex characters across ~33,000 schools makes this vanishingly rare,
  // but if two ids do share a prefix the readable half still separates them.
  return rows.find((r) => schoolSlug(r.name) === parsed.slug) ?? null
}
