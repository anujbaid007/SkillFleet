import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Everything we hold about the signed-in person, as one JSON file.
 *
 * DPDP s.11 gives a person the right to a summary of their personal data and
 * of who it has been shared with, so the file carries both: the rows
 * themselves, and a plain-English note of who can see them.
 *
 * Every read goes through the user's own session rather than the service-role
 * client. RLS then guarantees the export can only ever contain rows that
 * person is entitled to — an export endpoint that bypassed RLS would be one
 * missing filter away from handing somebody another family's data.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  // Written out rather than looped over a list of table names: the client is
  // typed per table, and a string-keyed helper throws that away.
  const [profile, family, bookings, orders, iscEntries, iscConsent, assessments, certificates] =
    await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.rpc('get_my_family'),
      supabase.from('bookings').select('*').eq('student_id', user.id),
      supabase.from('orders').select('*'),
      supabase.from('isc_entries').select('*').eq('created_by', user.id),
      supabase.from('isc_consent').select('*').eq('student_id', user.id),
      supabase.from('questionnaire_responses').select('*').eq('student_id', user.id),
      supabase.from('certificate_uploads').select('*').eq('student_id', user.id),
    ])

  const payload = {
    exported_at: new Date().toISOString(),
    about:
      'Everything SkillFleet holds about this account. Empty sections mean we hold nothing of that kind.',
    who_can_see_this_data: [
      'SkillFleet staff',
      'Your school’s coordinator, if your school has an approved one',
      'Providers running a workshop or trip you booked',
      'Championship judges, for entries you submitted',
      'Brainweave, only if you agreed to it',
    ],
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data ?? null,
    family: family.data ?? [],
    bookings: bookings.data ?? [],
    orders: orders.data ?? [],
    isc_entries: iscEntries.data ?? [],
    isc_consent: iscConsent.data ?? [],
    assessment_answers: assessments.data ?? [],
    certificates: certificates.data ?? [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="skillfleet-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      // Never let a shared or proxied cache keep somebody's personal data.
      'cache-control': 'no-store, private',
    },
  })
}
