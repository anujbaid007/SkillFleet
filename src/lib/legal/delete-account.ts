import { adminClient } from '@/lib/supabase/admin'

/**
 * Erases an account and everything attached to it.
 *
 * Deleting the auth user alone is not enough. Tested against a real throwaway
 * account: `user_profiles` cascades away with it, but the `families` row does
 * not, which would leave a parent's name, email and phone number behind after
 * a person had been told their data was deleted. Everything else is removed
 * explicitly here rather than relying on cascade rules that vary per table and
 * would fail silently the day one changes.
 *
 * Order matters. Rows are cleared before the auth user is removed, because a
 * table that does not cascade would otherwise block the delete outright.
 */

/** Tables keyed directly by the student's own id. */
const STUDENT_SCOPED = [
  'assessment_results',
  'bookings',
  'cart_items',
  'certificate_uploads',
  'curriculum_plans',
  'isc_consent',
  'packages',
  'questionnaire_responses',
  'recommendation_runs',
  'score_contributions',
  'student_parameter_scores',
  'student_shortlist',
  'wallet_transactions',
] as const

export interface DeleteAccountResult {
  ok: boolean
  /** Populated on failure, safe to show a person. */
  error?: string
}

/**
 * `family_id` is shared between siblings, so the family row only goes when
 * nobody is left in it. Deleting it while a brother or sister still points at
 * it would break their account instead of this one.
 */
async function deleteFamilyIfEmpty(familyId: string, deletingUserId: string): Promise<void> {
  const { data: remaining } = await adminClient
    .from('user_profiles')
    .select('id')
    .eq('family_id', familyId)
    .neq('id', deletingUserId)

  if ((remaining ?? []).length > 0) return

  // Nothing else references this family, so its own rows go too.
  await adminClient.from('cart_items').delete().eq('family_id', familyId)
  await adminClient.from('wallet_transactions').delete().eq('family_id', familyId)
  await adminClient.from('wallets').delete().eq('family_id', familyId)
  await adminClient.from('orders').delete().eq('family_id', familyId)
  await adminClient.from('families').delete().eq('id', familyId)
}

/**
 * Championship entries the person created.
 *
 * Members and revisions are removed first: both point at the entry, and an
 * entry cannot go while they still reference it. Teammates lose the entry too,
 * which is why the confirmation screen says so in as many words before anyone
 * gets this far.
 */
async function deleteIscEntries(userId: string): Promise<void> {
  const { data: entries } = await adminClient
    .from('isc_entries')
    .select('id')
    .eq('created_by', userId)

  const ids = (entries ?? []).map((e) => e.id)
  if (ids.length > 0) {
    await adminClient.from('isc_entry_revisions').delete().in('entry_id', ids)
    await adminClient.from('isc_entry_members').delete().in('entry_id', ids)
    await adminClient.from('isc_entries').delete().in('id', ids)
  }

  // Entries somebody else leads, that this person was a member of.
  await adminClient.from('isc_entry_members').delete().eq('user_id', userId)
  await adminClient.from('isc_entry_revisions').delete().eq('edited_by', userId)
}

export async function deleteAccountCompletely(userId: string): Promise<DeleteAccountResult> {
  try {
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('family_id')
      .eq('id', userId)
      .maybeSingle()

    await deleteIscEntries(userId)

    for (const table of STUDENT_SCOPED) {
      await adminClient.from(table).delete().eq('student_id', userId)
    }

    await adminClient.from('offering_interest').delete().eq('user_id', userId)
    await adminClient.from('offering_request_supporters').delete().eq('user_id', userId)
    await adminClient.from('support_messages').delete().eq('sender_id', userId)
    await adminClient.from('support_conversations').delete().eq('coordinator_id', userId)

    if (profile?.family_id) await deleteFamilyIfEmpty(profile.family_id, userId)

    // Last: removing the auth user takes user_profiles with it.
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) return { ok: false, error: error.message }

    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Something went wrong deleting the account.',
    }
  }
}
