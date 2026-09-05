'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  TRACK_FIELDS,
  trackById,
  trackBySlug,
  type IscTrackId,
} from '@/lib/isc/tracks'
import { readSubmission } from '@/lib/isc/submission'
import { PUZZLE_MASTER_ID } from '@/lib/isc/tracks'
import { firstInvalidField } from '@/lib/isc/validate'
import { checkLink } from '@/lib/isc/link-check'

const ERR: Record<string, string> = {
  not_student: 'Only student accounts can enter ISC.',
  not_eligible: 'ISC 2026 is open to Classes 5 to 12.',
  no_school: 'Add your school to your profile before entering.',
  track_closed: 'Entries for this track have closed.',
  not_found: 'That entry could not be found.',
  not_leader: 'Only the team leader can change this entry.',
  empty_submission: 'Fill in your entry before submitting.',
  // Raised by the database when a required field is missing or a link is not
  // http(s). The app checks the same things first, so a student only sees this
  // if the two ever disagree — and then it says which field.
  incomplete_submission: 'Something is missing from your entry. Check every field and try again.',
  wrong_school: 'Everyone on the team must be at your school.',
  wrong_group: 'A teammate is in a different group. Remove them before this can be submitted.',
  entry_submitted: 'This entry has already been submitted, so it can no longer be changed.',
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
  /** False while a sent invite is still awaiting this student's response. */
  isAccepted: boolean
}

export async function getMyIscEntries(): Promise<MyEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('isc_get_my_entries')
  const rows = (data ?? []) as {
    entry_id: string
    track: string
    status: string
    is_leader: boolean
    is_accepted: boolean
  }[]
  return rows.map((r) => ({
    entryId: r.entry_id,
    track: r.track,
    status: r.status,
    isLeader: r.is_leader,
    isAccepted: r.is_accepted,
  }))
}

export interface PendingInvite {
  memberId: string
  entryId: string
  track: IscTrackId
  leaderName: string | null
}

/** Invites this student has not yet responded to — what the /isc banner renders. */
export async function getMyPendingInvites(): Promise<PendingInvite[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('isc_get_my_invites')
  const rows = (data ?? []) as {
    member_id: string
    entry_id: string
    track: string
    leader_name: string | null
  }[]
  return rows.map((r) => ({
    memberId: r.member_id,
    entryId: r.entry_id,
    track: r.track as IscTrackId,
    leaderName: r.leader_name,
  }))
}

/**
 * The entry id for this student's draft on a track, creating it if they have
 * none yet.
 *
 * Entries are created lazily — merely opening a track's form must not write
 * anything, or a student who clicks through to read the questions is left
 * with a permanent empty draft that blocks anyone from inviting them to a
 * team for that track. The first real action (saving, or adding a teammate)
 * is what brings the entry into existence, via this helper.
 *
 * NOT exported: a 'use server' module may only export async functions that
 * are safe to call from a client, and this is an internal step of the two
 * actions below. isc_start_entry is idempotent, so calling it twice is safe.
 */
async function resolveEntryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trackId: IscTrackId,
  existing: string | undefined
): Promise<{ entryId: string } | { error: string }> {
  if (existing) return { entryId: existing }

  const { data, error } = await supabase.rpc('isc_start_entry', { p_track: trackId })
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
  /** Null while userId is set but the invitee has not yet responded. */
  acceptedAt: string | null
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
      accepted_at: string | null
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
      acceptedAt: m.accepted_at,
    })),
  }
}

export type EntryFormState =
  | {
      error?: string
      ok?: string
      /** Which field the error is about, so the form can focus it. */
      field?: string
      /**
       * A link that saved fine but nobody else can open. Shown on a draft
       * save, where blocking would cost the student their typed work; the
       * same finding becomes a hard error on submit.
       */
      warning?: string
    }
  | undefined

/**
 * One action for both buttons, dispatched on `intent`. Two separate
 * useActionState hooks cannot express "whichever ran most recently", so a
 * failed submit would permanently mask a later successful save.
 */
/**
 * The first link in a submission that a stranger could not open.
 *
 * Every URL field is checked at once rather than one after another: an entry
 * has at most three, and a student waiting on a submit should not pay for them
 * serially. A link we cannot judge — a deployed app, a personal site — is left
 * alone, since fetching it would prove nothing about whether the work is
 * visible.
 */
async function firstUnopenableLink(
  track: IscTrackId,
  submission: Record<string, unknown>
): Promise<{ key: string; message: string } | null> {
  const urlFields = TRACK_FIELDS[track].filter((spec) => spec.kind === 'url')

  const verdicts = await Promise.all(
    urlFields.map(async (spec) => {
      const value = submission?.[spec.key]
      if (typeof value !== 'string' || !value.trim()) return null
      const verdict = await checkLink(value)
      return verdict.status === 'blocked' ? { key: spec.key, message: verdict.message } : null
    })
  )

  return verdicts.find(Boolean) ?? null
}

export async function entryFormAction(
  _prev: EntryFormState,
  formData: FormData
): Promise<EntryFormState> {
  const postedEntryId = (formData.get('entry_id') as string)?.trim()
  const trackId = (formData.get('track') as string)?.trim()
  const intent = (formData.get('intent') as string)?.trim()
  const track = trackById(trackId)
  if (!track) return { error: 'Missing entry.' }

  const submission = readSubmission(track.id, formData)
  const supabase = await createClient()

  // First save on a track the student has not entered yet is what creates the
  // entry — opening the form did not.
  const resolved = await resolveEntryId(supabase, track.id, postedEntryId)
  if ('error' in resolved) return { error: resolved.error }
  const entryId = resolved.entryId

  // Save FIRST, even for a submit that may fail validation. The form fields are
  // uncontrolled and re-bind to the stored submission on re-render, so
  // validating before saving would wipe everything the student typed the moment
  // they missed one field — six paragraphs lost for a forgotten language.
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
    // Warn, never block. A draft is where a student parks work in progress,
    // and a link they have not shared yet is a normal thing to have here.
    const problem = await firstUnopenableLink(track.id, submission)
    return problem ? { ok: 'Draft saved.', warning: problem.message } : { ok: 'Draft saved.' }
  }

  // Field rules live in TypeScript; the RPC owns authorisation and consent.
  const invalid = firstInvalidField(track.id, submission)
  if (invalid) {
    // Revalidate so the re-render shows the work we just saved.
    revalidatePath(`/isc/${track.slug}`)
    return { error: invalid.message, field: invalid.key }
  }

  /*
    Last gate before it counts: is the work actually openable?

    A private video or a restricted Drive file opens perfectly for the student
    who made it and not at all for a judge, so this is the failure they are
    least likely to catch themselves. Checked only on submit — the network
    calls have no business slowing down a draft save.
  */
  const unopenable = await firstUnopenableLink(track.id, submission)
  if (unopenable) {
    revalidatePath(`/isc/${track.slug}`)
    return { error: unopenable.message, field: unopenable.key }
  }

  const { data, error } = await supabase.rpc('isc_submit_entry', {
    p_entry_id: entryId,
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

/**
 * Every track's deadline in one round trip. getTrackDeadline answers for one
 * track; the coordinator dashboard shows all of them side by side and should
 * not make three queries to do it.
 */
export async function getIscDeadlines(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('isc_config').select('track, screening_deadline')
  const out: Record<string, string> = {}
  for (const row of (data ?? []) as { track: string; screening_deadline: string }[]) {
    out[row.track] = row.screening_deadline
  }
  return out
}

export type TeamState = { error?: string; ok?: string } | undefined

const TEAM_ERR: Record<string, string> = {
  bad_email: 'That does not look like an email address.',
  team_full: 'A team can have at most three people, you included.',
  self_add: 'You are already on this team.',
  wrong_school: 'Teammates must be students at your school.',
  wrong_group:
    'That student is in a different group. Teammates must be from the same group as you — Classes 5–8 or 9–12.',
  already_in_track: 'They are already on another team for this championship.',
  // Distinct from already_in_track on purpose: this one the student can undo
  // themselves, so the message has to say how.
  has_own_entry:
    'They have already started their own entry for this championship. They need to open it and press Leave this championship before they can join your team.',
  already_invited: 'You have already invited that email.',
  entry_submitted: 'This entry has been submitted, so the team can no longer be changed.',
}

export async function addMemberAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const postedEntryId = (formData.get('entry_id') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const email = ((formData.get('email') as string) ?? '').trim()
  if (!email) return { error: 'Enter an email address.' }

  const track = trackBySlug(slug)
  if (!track) return { error: 'Missing entry.' }

  const supabase = await createClient()

  // Adding the first teammate also counts as starting the entry.
  const resolved = await resolveEntryId(supabase, track.id, postedEntryId)
  if ('error' in resolved) return { error: resolved.error }
  const entryId = resolved.entryId
  const justCreated = !postedEntryId

  const { data, error } = await supabase.rpc('isc_add_member', {
    p_entry_id: entryId,
    p_email: email,
  })

  /**
   * If this call is what brought the entry into being and the add then failed
   * — a typo'd address, a classmate in the other group — undo the creation.
   * Otherwise a mistyped email would leave behind exactly the empty entry this
   * whole change exists to stop: one that silently blocks anyone from
   * inviting this student to a team for the track.
   */
  const undoIfJustCreated = async () => {
    if (justCreated) await supabase.rpc('isc_leave_entry', { p_entry_id: entryId })
  }

  if (error) {
    await undoIfJustCreated()
    return { error: iscError(undefined) }
  }

  const r = data as { ok: boolean; error?: string; state?: string; name?: string }
  if (!r?.ok) {
    await undoIfJustCreated()
    return { error: TEAM_ERR[r?.error ?? ''] ?? iscError(r?.error) }
  }

  revalidatePath(`/isc/${slug}`)

  if (r.state === 'awaiting_accept') {
    return {
      ok: `${r.name ?? 'Your classmate'} has been invited — waiting for them to accept.`,
    }
  }

  // Not a failure, but it must not read like a success either: nobody is on
  // the team until that person actually registers. Say so plainly, and name
  // the address so a typo is obvious.
  return {
    ok: `${email} is not registered on SkillFleet yet — they need to create an account first. Send them the invite link below and they'll join your team automatically once they sign up.`,
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

export type RespondState = { error?: string; ok?: string } | undefined

const RESPOND_ERR: Record<string, string> = {
  already_resolved: 'This invite has already been responded to.',
  entry_submitted:
    'That team has already submitted their entry, so you can no longer join it. You can decline the invite to clear it.',
  wrong_school: "You're no longer eligible for this team — you must be at the same school.",
  wrong_group:
    "You're no longer eligible for this team — you must be in the same group as the rest of the team (Classes 5–8 or 9–12).",
}

export async function respondToInviteAction(
  _prev: RespondState,
  formData: FormData
): Promise<RespondState> {
  const memberId = (formData.get('member_id') as string)?.trim()
  const accept = (formData.get('intent') as string)?.trim() === 'accept'
  if (!memberId) return { error: 'Missing invite.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_respond_to_invite', {
    p_member_id: memberId,
    p_accept: accept,
  })
  if (error) return { error: iscError(undefined) }

  const r = data as { ok: boolean; error?: string; action?: string; track?: string }
  if (!r?.ok) return { error: RESPOND_ERR[r?.error ?? ''] ?? iscError(r?.error) }

  revalidatePath('/isc')
  const track = r.track ? trackById(r.track) : null
  if (track) revalidatePath(`/isc/${track.slug}`)

  return { ok: r.action === 'accepted' ? 'You joined the team.' : 'Invite declined.' }
}

export type LeaveState = { error?: string } | undefined

const LEAVE_ERR: Record<string, string> = {
  not_leader: 'Only the person who started this entry can leave it.',
  already_submitted: 'This entry has been submitted, so it can no longer be withdrawn.',
  has_teammates: 'Remove your teammates first — an entry with a team cannot be deleted.',
}

/**
 * Abandon a solo draft you started and never used.
 *
 * The escape hatch for the trap this replaces: starting an entry used to be
 * irreversible, and because a student's own entry blocks anyone from adding
 * them to a team for that track, one curious click locked them out of teaming
 * up for the season.
 */
export async function leaveEntryAction(
  _prev: LeaveState,
  formData: FormData
): Promise<LeaveState> {
  const entryId = (formData.get('entry_id') as string)?.trim()
  const slug = ((formData.get('slug') as string) ?? '').trim()
  if (!entryId) return { error: 'Missing entry.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_leave_entry', { p_entry_id: entryId })
  if (error) return { error: iscError(undefined) }

  const r = data as { ok: boolean; error?: string }
  if (!r?.ok) return { error: LEAVE_ERR[r?.error ?? ''] ?? iscError(r?.error) }

  revalidatePath('/isc')
  if (slug) revalidatePath(`/isc/${slug}`)
  redirect('/isc')
}

const LEAVE_TEAM_ERR: Record<string, string> = {
  is_leader: 'You lead this entry. Use "Leave this championship" below instead.',
  not_found: 'You are not on this team.',
  entry_submitted: 'This entry has been submitted, so the team can no longer change.',
  track_closed: 'Entries for this track have closed.',
}

/**
 * A teammate leaves an entry they accepted.
 *
 * The leader's route is leaveEntryAction, which deletes the whole entry. This
 * one removes only the caller's own membership, and the RPC is what decides
 * whose that is — the entry id from the form only says which entry.
 */
export async function leaveTeamAction(
  _prev: LeaveState,
  formData: FormData
): Promise<LeaveState> {
  const entryId = (formData.get('entry_id') as string)?.trim()
  const slug = ((formData.get('slug') as string) ?? '').trim()
  if (!entryId) return { error: 'Missing entry.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isc_leave_team', { p_entry_id: entryId })
  if (error) return { error: iscError(undefined) }

  const r = data as { ok: boolean; error?: string }
  if (!r?.ok) return { error: LEAVE_TEAM_ERR[r?.error ?? ''] ?? iscError(r?.error) }

  revalidatePath('/isc')
  if (slug) revalidatePath(`/isc/${slug}`)
  redirect('/isc')
}


export type PuzzleRegisterState = { error?: string; ok?: boolean } | undefined

/**
 * Puzzle Master has nothing to upload: registering is the entry. Start the
 * entry, then submit it straight away; the database accepts an empty
 * submission for this one track (docs/isc-puzzle-master-registration.sql).
 */
export async function registerForPuzzleMasterAction(): Promise<PuzzleRegisterState> {
  const supabase = await createClient()
  const started = await supabase.rpc('isc_start_entry', { p_track: PUZZLE_MASTER_ID })
  if (started.error) {
    // Before the registration patch is applied the track is refused outright.
    return { error: 'Registration for Puzzle Master is not open yet. Please try again soon.' }
  }
  const start = started.data as { ok: boolean; entry_id?: string; error?: string } | null
  if (!start?.ok || !start.entry_id) return { error: iscError(start?.error) }
  const submitted = await supabase.rpc('isc_submit_entry', { p_entry_id: start.entry_id })
  const sub = submitted.data as { ok: boolean; error?: string } | null
  if (submitted.error || !sub?.ok) {
    // Already registered on a previous try counts as registered.
    if (sub?.error === 'entry_submitted') { revalidatePath('/isc'); return { ok: true } }
    return { error: iscError(sub?.error) }
  }
  revalidatePath('/isc')
  revalidatePath('/isc/puzzle-master')
  return { ok: true }
}
