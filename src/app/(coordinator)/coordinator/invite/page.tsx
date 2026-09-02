import { redirect } from 'next/navigation'
import { Download, FileText, Share2 } from 'lucide-react'
import { getMyCoordinatorSchool } from '@/app/actions/coordinator'
import { PageHeader } from '@/components/ui/page-header'
import { ShareLinks } from '@/components/coordinator/share-links'
import { requestOrigin } from '@/lib/coordinator/origin'

/** The decks a coordinator hands out, and who each one is for. */
const DECKS = [
  {
    href: '/decks/ISC-Student-Deck.pdf',
    title: 'Student deck',
    blurb: 'What the championship is and how to enter — written for students. PDF, 7.5 MB.',
    gradient: 'from-accent-teal to-primary',
  },
  {
    href: '/decks/ISC-School-Deck.pdf',
    title: 'School deck',
    blurb: 'The full programme, for your principal and staff. PDF, 6.6 MB.',
    gradient: 'from-primary to-primary-light',
  },
]

/**
 * Everything a coordinator needs to get their school entering.
 *
 * Reachable while an application is still pending: none of it depends on the
 * claim having cleared, and the wait is exactly when a coordinator wants to be
 * telling students to enter.
 */
export default async function CoordinatorInvitePage() {
  const application = await getMyCoordinatorSchool()
  if (!application) redirect('/onboarding/coordinator')
  // A school we could not confirm should not be recruiting under our name.
  if (application.status === 'rejected') redirect('/coordinator')

  const origin = await requestOrigin()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={Share2}
        title="Invite students"
        subtitle={`Share this link with ${application.schoolName}. Anyone who signs up through it joins your school automatically.`}
      />

      <ShareLinks
        schoolId={application.schoolId}
        schoolName={application.schoolName}
        origin={origin}
      />

      <div className="clay-card p-5 sm:p-6">
        <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
          How to get a class entering
        </h2>
        <ol className="mt-4 space-y-3">
          {[
            'Send the link to your class WhatsApp groups. The WhatsApp button above writes the message for you.',
            'Share the student deck below in the same message, so students know what they are signing up for.',
            'Students create an account, and their school is already filled in.',
            'They pick any of the four championships — entering more than one is allowed, and the school level is free.',
          ].map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-sm text-muted">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DECKS.map((deck) => (
          <a
            key={deck.href}
            href={deck.href}
            target="_blank"
            rel="noopener noreferrer"
            className="clay-card dash-panel-link flex items-center gap-4 p-5"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${deck.gradient}`}
            >
              <FileText className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-foreground">{deck.title}</p>
              <p className="text-xs text-muted">{deck.blurb}</p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-muted" />
          </a>
        ))}
      </div>
    </div>
  )
}
