'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { TRACK_FIELDS, trackById, trackBySlug, type IscTrackId } from '@/lib/isc/tracks'
import { validateSubmission } from '@/lib/isc/validate'

const ERR: Record<string, string> = {
  not_student: 'Only student accounts can enter ISC.',
  not_eligible: 'ISC 2026 is open to Classes 5 to 12.',
  no_school: 'Add your school to your profile before entering.',
  track_closed: 'Entries for this track have closed.',
  not_found: 'That entry could not be found.',
  not_leader: 'Only the team leader can change this entry.',
  consent_required: 'A parent or guardian must give consent before you submit.',
  empty_submission: 'Fill in your entry before submitting.',
  wrong_school: 'Everyone on the team must be at your school.',
}

// NOT exported: a 'use server' module may only export async functions, so a
// plain helper like this one has to stay module-private. Types are erased at
// compile time, which is why the interfaces below can still be exported.
function iscError(code: string | undefined): string {
  return ERR[code ?? ''] ?? 'Something went wrong. Please try again.'
}

export interface MyEntry {
  entryId: string
  track: string
  status: string
  isLeader: boolean
}

export async function getMyIscEntries(): Promise<MyEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('isc_get_my_entries')
  const rows = (data ?? []) as {
    entry_id: string
    track: string
    status: string
    is_leader: boolean
  }[]
  return rows.map((r) => ({
    entryId: r.entry_id,
    track: r.track,
    status: r.status,
    isLeader: r.is_leader,
  }))
}

/**
 * Creates this student's draft for a track if they have none, and returns its
 * id either way.
 *
 * Deliberately NOT a mutating action: the track page calls this during render,
 * and Next.js forbids revalidatePath() there. The RPC is idempotent, so there
 * is nothing to revalidate — a first visit creates the draft, later visits
 * return the same one.
 */
export async function ensureIscEntry(
  slug: string
): Promise<{ entryId: string } | { error: string }> {
  const track = trackBySlug(slug)
  if (!track) return { error: 'Unknown track.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_start_entry', { p_track: track.id })
  if (error) return { error: iscError(undefined) }

  const result = data as { ok: boolean; error?: string; entry_id?: string }
  if (!result?.ok || !result.entry_id) return { error: iscError(result?.error) }

  return { entryId: result.entry_id }
}

export interface IscMember {
  memberId: string
  userId: string | null
  name: string | null
  schoolClass: string | null
  invitedEmail: string | null
  inviteToken: string | null
  isLeader: boolean
}

export interface IscEntryDetail {
  entryId: string
  track: IscTrackId
  status: string
  submission: Record<string, unknown>
  isLeader: boolean
  members: IscMember[]
}

export async function getIscEntry(entryId: string): Promise<IscEntryDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('isc_get_entry', { p_entry_id: entryId })
  const r = data as {
    ok: boolean
    entry_id: string
    track: IscTrackId
    status: string
    submission: Record<string, unknown>
    is_leader: boolean
    members: {
      member_id: string
      user_id: string | null
      name: string | null
      school_class: string | null
      invited_email: string | null
      invite_token: string | null
      is_leader: boolean
    }[]
  } | null

  if (!r?.ok) return null
  return {
    entryId: r.entry_id,
    track: r.track,
    status: r.status,
    submission: r.submission ?? {},
    isLeader: r.is_leader,
    members: (r.members ?? []).map((m) => ({
      memberId: m.member_id,
      userId: m.user_id,
      name: m.name,
      schoolClass: m.school_class,
      invitedEmail: m.invited_email,
      inviteToken: m.invite_token,
      isLeader: m.is_leader,
    })),
  }
}

export type EntryFormState = { error?: string; ok?: string } | undefined

/** Reads the posted fields for a track into a plain submission object. */
function readSubmission(track: IscTrackId, formData: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const spec of TRACK_FIELDS[track]) {
    out[spec.key] = ((formData.get(spec.key) as string) ?? '').trim()
  }
  return out
}

/**
 * One action for both buttons, dispatched on `intent`. Two separate
 * useActionState hooks cannot express "whichever ran most recently", so a
 * failed submit would permanently mask a later successful save.
 */
export async function entryFormAction(
  _prev: EntryFormState,
  formData: FormData
): Promise<EntryFormState> {
  const entryId = (formData.get('entry_id') as string)?.trim()
  const trackId = (formData.get('track') as string)?.trim()
  const intent = (formData.get('intent') as string)?.trim()
  const track = trackById(trackId)
  if (!entryId || !track) return { error: 'Missing entry.' }

  const submission = readSubmission(track.id, formData)
  const supabase = await createClient()

  if (intent === 'submit') {
    // Field rules live in TypeScript; the RPC owns authorisation and consent.
    const invalid = validateSubmission(track.id, submission)
    if (invalid) return { error: invalid }
    if (formData.get('consent') !== 'on') return { error: iscError('consent_required') }
  }

  const { data: saved, error: saveError } = await supabase.rpc('isc_save_entry', {
    p_entry_id: entryId,
    p_submission: submission,
  })
  if (saveError) return { error: iscError(undefined) }
  const savedResult = saved as { ok: boolean; error?: string }
  if (!savedResult?.ok) return { error: iscError(savedResult?.error) }

  if (intent !== 'submit') {
    revalidatePath(`/isc/${track.slug}`)
    revalidatePath('/isc')
    return { ok: 'Draft saved.' }
  }

  const { data, error } = await supabase.rpc('isc_submit_entry', {
    p_entry_id: entryId,
    p_consent: true,
  })
  if (error) return { error: iscError(undefined) }

  const result = data as { ok: boolean; error?: string }
  if (!result?.ok) return { error: iscError(result?.error) }

  revalidatePath(`/isc/${track.slug}`)
  revalidatePath('/isc')
  return { ok: 'Entry submitted. You can still edit it until the deadline.' }
}

export async function getTrackDeadline(track: IscTrackId): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('isc_config')
    .select('screening_deadline')
    .eq('track', track)
    .single()
  return data?.screening_deadline ?? null
}

export type TeamState = { error?: string; ok?: string } | undefined

const TEAM_ERR: Record<string, string> = {
  bad_email: 'That does not look like an email address.',
  team_full: 'A team can have at most three people, you included.',
  self_add: 'You are already on this team.',
  wrong_school: 'Teammates must be students at your school.',
  already_in_track: 'They are already in another entry for this track.',
  already_invited: 'You have already invited that email.',
}

export async function addMemberAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const entryId = (formData.get('entry_id') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const email = ((formData.get('email') as string) ?? '').trim()
  if (!entryId || !email) return { error: 'Enter an email address.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_add_member', {
    p_entry_id: entryId,
    p_email: email,
  })
  if (error) return { error: iscError(undefined) }

  const r = data as { ok: boolean; error?: string; state?: string; name?: string }
  if (!r?.ok) return { error: TEAM_ERR[r?.error ?? ''] ?? iscError(r?.error) }

  revalidatePath(`/isc/${slug}`)
  return {
    ok:
      r.state === 'linked'
        ? `${r.name ?? 'Your classmate'} has been added to the team.`
        : 'No account yet — share the invite link below so they can join.',
  }
}

export async function removeMemberAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const entryId = (formData.get('entry_id') as string)?.trim()
  const memberId = (formData.get('member_id') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  if (!entryId || !memberId) return { error: 'Missing team member.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_remove_member', {
    p_entry_id: entryId,
    p_member_id: memberId,
  })
  if (error) return { error: iscError(undefined) }

  const r = data as { ok: boolean; error?: string }
  if (!r?.ok) return { error: TEAM_ERR[r?.error ?? ''] ?? iscError(r?.error) }

  revalidatePath(`/isc/${slug}`)
  return { ok: 'Removed.' }
}
