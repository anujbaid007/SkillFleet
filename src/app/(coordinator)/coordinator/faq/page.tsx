import { getIscDeadlines } from '@/app/actions/isc'
import { buildIscFaq } from '@/lib/isc/faq'
import { IscFaq } from '@/components/isc/faq'

/** The coordinator FAQ: everything students see, plus how the school side works. */
export default async function CoordinatorFaqPage() {
  const deadlines = await getIscDeadlines()
  return (
    <IscFaq
      groups={buildIscFaq({ audience: 'coordinator', deadlines })}
      subtitle="What your students are entering, how the rounds run, and how your school's approval, invites and roster work."
    />
  )
}
