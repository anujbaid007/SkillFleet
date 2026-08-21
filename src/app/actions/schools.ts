'use server'

import { createClient } from '@/lib/supabase/server'
import type { SchoolSelection } from '@/lib/schools/validate'

export interface SchoolOption {
  id: string
  name: string
  address: string | null
  pincode: string | null
}

/** Distinct states, for the first dropdown. Called from server components. */
export async function getSchoolStates(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_school_states')
  return ((data ?? []) as { state: string }[]).map((r) => r.state)
}

/** Districts within one state. A plain DISTINCT here would scan 32k rows client-side. */
export async function getSchoolDistrictsAction(state: string): Promise<string[]> {
  if (!state?.trim()) return []
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_school_districts', { p_state: state })
  return ((data ?? []) as { district: string }[]).map((r) => r.district)
}

/**
 * Every approved school in one district — 729 rows worst case (~21 KB), which
 * is what makes filtering in the browser viable instead of a request per keystroke.
 */
export async function getSchoolsAction(
  state: string,
  district: string
): Promise<SchoolOption[]> {
  if (!state?.trim() || !district?.trim()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('schools')
    .select('id, name, address, pincode')
    .eq('state', state)
    .eq('district', district)
    .eq('review_status', 'approved')
    .order('name')
  return (data ?? []) as SchoolOption[]
}

/**
 * Turns a submitted selection into a real schools.id, creating a pending row
 * when the student typed their school in. Also re-checks that a picked school
 * really is in the submitted state/district — the client can send anything.
 */
export async function resolveSchoolId(
  sel: SchoolSelection
): Promise<{ schoolId: string; name: string } | { error: string }> {
  const supabase = await createClient()

  if (sel.schoolId) {
    const { data } = await supabase
      .from('schools')
      .select('id, name, state, district')
      .eq('id', sel.schoolId)
      .single()

    if (!data) return { error: 'That school could not be found. Please pick again.' }
    if (data.state !== sel.state || data.district !== sel.district) {
      return { error: 'That school is not in the selected state and district.' }
    }
    return { schoolId: data.id, name: data.name }
  }

  const name = sel.manualName?.trim()
  if (!name) return { error: 'Please select your school.' }

  const { data, error } = await supabase.rpc('add_pending_school', {
    p_name: name,
    p_state: sel.state,
    p_district: sel.district,
  })
  if (error || !data) return { error: 'Could not save that school. Please try again.' }
  return { schoolId: data as string, name }
}
