import { createClient } from '@/lib/supabase/server'
import { Compass } from 'lucide-react'
import { BOOKINGS_COMING_SOON } from '@/lib/launch'
import { PageHeader } from '@/components/ui/page-header'
import { CatalogExplorer, type ExplorerOffering } from '@/components/catalog/catalog-explorer'
import { calculateAge, isAgeEligible } from '@/lib/utils/age'
import { requestNowMs } from '@/lib/utils/request-time'

type RawOffering = Omit<ExplorerOffering, 'bookable'>

interface RawCategory {
  id: string
  name: string
}

/*
  Loads the catalogue and decides, per offering, whether anyone in this family
  could still book it. That judgement needs ages and paid bookings, which stay
  on the server; the browser only ever receives the yes/no. Filtering itself
  happens in CatalogExplorer so the chips respond instantly.
*/
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string; status?: string }>
}) {
  const { category, type, status } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: offerings }, { data: categories }] = (await Promise.all([
    supabase
      .from('offerings')
      .select('id, title, description, type, status, price_paise, min_age, max_age, scheduled_at, image_url, interest_count, topics(id, name, category_id, categories(id, name))')
      .in('status', ['planned', 'live', 'completed'])
      .order('scheduled_at', { ascending: true, nullsFirst: false }),
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
  ])) as [{ data: RawOffering[] | null }, { data: RawCategory[] | null }]

  // Who are we filtering "age-appropriate" and "already booked" against?
  // Age is judged against the whole family — one suitable sibling keeps it visible.
  let learners: { id: string; dob: string | null }[] = []
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, date_of_birth')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'student') {
      // Everyone in the family — an activity stays visible if any sibling can book it.
      const { data: family } = await supabase.rpc('get_family_students')
      const rows = (family ?? []) as { student_id: string; date_of_birth: string | null }[]
      learners = rows.length
        ? rows.map((k) => ({ id: k.student_id, dob: k.date_of_birth }))
        : [{ id: user.id, dob: profile.date_of_birth }]
    }
  }

  // Offerings already paid for, per learner.
  const bookedByLearner = new Map<string, Set<string>>()
  if (learners.length > 0) {
    const { data: booked } = await supabase
      .from('bookings')
      .select('student_id, offering_id')
      .in('student_id', learners.map((l) => l.id))
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
    for (const b of booked ?? []) {
      const set = bookedByLearner.get(b.student_id) ?? new Set<string>()
      set.add(b.offering_id)
      bookedByLearner.set(b.student_id, set)
    }
  }

  /** Is there at least one learner who could still book this? */
  function bookableBySomeone(o: RawOffering): boolean {
    if (learners.length === 0) return true // signed out / admin preview — don't over-filter
    return learners.some((l) => {
      if (bookedByLearner.get(l.id)?.has(o.id)) return false
      if (!l.dob) return true
      const age = calculateAge(l.dob)
      return isAgeEligible(age, o.min_age, o.max_age)
    })
  }

  const list: ExplorerOffering[] = (offerings ?? []).map((o) => ({ ...o, bookable: bookableBySomeone(o) }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Discover"
        icon={Compass}
        title="Explore"
        subtitle="Workshops, trips, events, competitions, and internships that grow real skills."
      />

      <CatalogExplorer
        offerings={list}
        categories={categories ?? []}
        initial={{ type, category, status }}
        nowMs={requestNowMs()}
        comingSoon={BOOKINGS_COMING_SOON}
      />
    </div>
  )
}
