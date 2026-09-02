import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isEligibleClass } from '@/lib/isc/validate'
import { hasIscConsent } from '@/app/actions/isc'
import { ConsentForm } from '@/components/isc/consent-form'

export default async function IscConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const target = next && next.startsWith('/isc') ? next : '/isc'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('school_class, full_name')
    .eq('id', user.id)
    .single()
  if (!isEligibleClass(profile?.school_class)) redirect('/isc')

  // Already agreed this season — nothing to ask.
  if (await hasIscConsent()) redirect(target)

  return (
    <div className="max-w-xl mx-auto">
      <ConsentForm studentName={profile?.full_name ?? ''} next={target} />
    </div>
  )
}
