import type { Metadata } from 'next'
import Link from 'next/link'
import SubpageLayout from '@/components/subpage-layout'
import PageBanner from '@/components/ui/page-banner'
import { LegalDoc, LegalList } from '@/components/legal/legal-doc'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms on which students, parents and school coordinators use SkillFleet and take part in the International Skill Championship.',
  alternates: { canonical: '/terms' },
}

const UPDATED = '2 September 2026'

const mail = (address: string) => (
  <a href={`mailto:${address}`} className="font-semibold text-primary hover:underline">
    {address}
  </a>
)

export default function TermsPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="Terms of"
        highlight="Service"
        subtitle="The rules for using SkillFleet and for entering the International Skill Championship. Plain English, because students have to be able to read them."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Terms of Service' }]}
        accentColor="accent-purple"
      />

      <LegalDoc
        updated={UPDATED}
        intro={
          <>
            <p>
              These terms are an agreement between you and SkillFleet. They cover the SkillFleet
              website and platform at <strong>skillfleet.org</strong>, and the International Skill
              Championship (&ldquo;ISC&rdquo;).
            </p>
            <p>
              By creating an account or entering the Championship, you accept these terms. If you are
              under 18, your parent or guardian accepts them on your behalf, which is why we ask for
              their details when you sign up.
            </p>
          </>
        }
        sections={[
          {
            id: 'who-can-use',
            title: 'Who can use SkillFleet',
            body: (
              <LegalList
                items={[
                  'Student accounts are for school students. A parent or guardian must provide their name, email and contact number, and is responsible for the account.',
                  'One account per student. Please do not share an account between siblings — each student needs their own record for bookings, assessments and Championship entries.',
                  'Coordinator accounts are for teachers and school staff. A coordinator may only apply to represent a school they genuinely work at, and the application is reviewed by us before the console opens.',
                  'The International Skill Championship 2026 is open to students in Classes 5 to 12.',
                ]}
              />
            ),
          },
          {
            id: 'your-account',
            title: 'Your account',
            body: (
              <LegalList
                items={[
                  'Give us accurate details, and keep them up to date. School, class and date of birth decide what you are eligible for, so wrong details can invalidate a booking or an entry.',
                  'Keep your password to yourself. You are responsible for what happens under your account.',
                  'Tell us straight away at hello@skillfleet.org if you think somebody else has got into your account.',
                  'You can ask us to close your account at any time.',
                ]}
              />
            ),
          },
          {
            id: 'bookings',
            title: 'Bookings, fees and cancellations',
            body: (
              <>
                <LegalList
                  items={[
                    'The price, date and what is included are shown before you confirm a booking.',
                    'A booking is confirmed only once payment has gone through and you can see it in your account.',
                    'Programmes run by partner providers are delivered by that provider. We will tell you who they are before you book.',
                    'If we cancel a programme, you get a full refund of what you paid for it.',
                  ]}
                />
                <p className="rounded-xl bg-accent-yellow/10 px-4 py-3 text-sm">
                  <strong>Cancellation and refund terms are still to be finalised.</strong> Until
                  they are published here, if you need to cancel a booking, contact us at{' '}
                  {mail('hello@skillfleet.org')} and we will deal with it case by case.
                </p>
              </>
            ),
          },
          {
            id: 'isc-entries',
            title: 'International Skill Championship: entering',
            body: (
              <LegalList
                items={[
                  'Your entry must be your own work, made by you or by your team. Passing off somebody else’s work as your own means disqualification.',
                  'You may use AI tools where a track allows it, but the idea, the judgement and the effort must be yours, and you should be able to explain how you built what you submitted.',
                  'Where a track has a team limit, teams may not exceed it, and every member must be a student at your school within the eligible class group.',
                  'Entries are submitted as links. It is your responsibility to make sure a link stays viewable by anyone who has it, up to and including judging. An entry a judge cannot open cannot be judged.',
                  'Deadlines are firm and are shown on each track. An entry that is not submitted before its deadline does not go through, whatever is saved as a draft.',
                  'You may edit your entry until its deadline.',
                  'Nothing you submit may be unlawful, hateful, or invade somebody else’s privacy. Anything containing another identifiable person needs their permission.',
                ]}
              />
            ),
          },
          {
            id: 'isc-judging',
            title: 'Championship: judging, results and prizes',
            body: (
              <>
                <LegalList
                  items={[
                    'School-level entries are judged centrally by SkillFleet. Judging decisions are final.',
                    'Progression from the school level to the state round, and from state to the national finals, is on the basis published for each track.',
                    'We may disqualify an entry that breaks these terms, is plagiarised, or was submitted by somebody not eligible.',
                    'Prizes are as described for each track. Where a prize is provided by a partner, it is subject to that partner’s own terms.',
                    'Prizes cannot be exchanged for cash unless the prize is itself a cash award or scholarship.',
                    'We may change the format, dates or prizes of the Championship if we have to. If we do, we will say so on the platform.',
                  ]}
                />
                <p className="rounded-xl bg-accent-yellow/10 px-4 py-3 text-sm">
                  <strong>Detailed prize terms are still being finalised</strong> with Championship
                  partners and will be published here before the state round opens.
                </p>
              </>
            ),
          },
          {
            id: 'your-content',
            title: 'Work you submit stays yours',
            body: (
              <>
                <p>
                  <strong>You keep ownership of everything you create.</strong> Entering the
                  Championship does not transfer your idea, your app, your video or your business
                  plan to us.
                </p>
                <p>
                  So that we can actually run the Championship, you give us permission to store your
                  entry, show it to judges, and — if you are among the winners — publish or feature
                  your name, school and winning entry in connection with the Championship. You can
                  ask us to stop featuring your work at any time by writing to{' '}
                  {mail('hello@skillfleet.org')}, though we cannot withdraw material already
                  printed or broadcast.
                </p>
              </>
            ),
          },
          {
            id: 'coordinators',
            title: 'School coordinators',
            body: (
              <LegalList
                items={[
                  'Applying to represent a school does not by itself give you access. We review every application, and the console opens once it is approved.',
                  'Once approved, you can see the students from your school on SkillFleet and how they are progressing. Use that information only to support your students.',
                  'Do not share your coordinator login with anyone else at the school. If somebody else needs access, they should apply for their own account.',
                  'We may withdraw coordinator access if an application turns out to be inaccurate or the access is misused.',
                ]}
              />
            ),
          },
          {
            id: 'acceptable-use',
            title: 'What you may not do',
            body: (
              <LegalList
                items={[
                  'Break into, disrupt or probe the platform, or try to reach data that is not yours.',
                  'Create accounts using somebody else’s identity, or a school you have no connection to.',
                  'Scrape, copy or resell content from the platform.',
                  'Upload anything containing malware, or anything unlawful.',
                  'Harass or abuse other students, coordinators or our staff.',
                ]}
              />
            ),
          },
          {
            id: 'availability',
            title: 'Availability and changes',
            body: (
              <p>
                We work to keep SkillFleet running, but we do not promise it will be available
                without interruption. We may add, change or withdraw features. If we make a change
                that materially affects something you have already paid for or entered, we will tell
                you.
              </p>
            ),
          },
          {
            id: 'liability',
            title: 'Our responsibility, and its limits',
            body: (
              <>
                <p>
                  Nothing in these terms limits our liability for death or personal injury caused by
                  our negligence, for fraud, or for anything else that cannot be limited under Indian
                  law.
                </p>
                <p>
                  Beyond that, we are not liable for indirect or consequential loss, and our total
                  liability to you in connection with the platform is limited to the amount you paid
                  us in the twelve months before the claim arose.
                </p>
                <p>
                  Programmes delivered by partner providers are delivered by them. We choose partners
                  carefully, but we are not responsible for their acts or omissions during delivery.
                </p>
              </>
            ),
          },
          {
            id: 'law',
            title: 'Governing law',
            body: (
              <p>
                These terms are governed by the laws of India. The courts at Gurugram, Haryana have
                exclusive jurisdiction over any dispute arising from them.
              </p>
            ),
          },
          {
            id: 'contact',
            title: 'Contact us',
            body: (
              <>
                <LegalList
                  items={[
                    <>Email: {mail('hello@skillfleet.org')}</>,
                    <>Phone: +91 8076314479 (Mon–Sat, 9am–7pm IST)</>,
                    <>Championship helpline: +91 9601443663</>,
                    <>Post: SkillFleet, HQ27 The Headquarters, Gurugram, Haryana 122009</>,
                  ]}
                />
                <p>
                  How we handle personal data is described in our{' '}
                  <Link href="/privacy" className="font-semibold text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </>
            ),
          },
        ]}
      />
    </SubpageLayout>
  )
}
