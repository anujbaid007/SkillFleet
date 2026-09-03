import { getIscDeadlines } from '@/app/actions/isc'
import { buildIscFaq } from '@/lib/isc/faq'
import { IscFaq } from '@/components/isc/faq'

/** The student FAQ for ISC 2026. Deadlines are read live so they never go stale. */
export default async function FaqPage() {
  const deadlines = await getIscDeadlines()
  return (
    <IscFaq
      groups={buildIscFaq({ audience: 'student', deadlines })}
      subtitle="Who can enter, how teams work, what each championship needs, and when entries close. Search, or open a question."
    />
  )
}
