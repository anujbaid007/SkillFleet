import type { Metadata } from 'next'
import Link from 'next/link'
import SubpageLayout from '@/components/subpage-layout'
import PageBanner from '@/components/ui/page-banner'
import { LegalDoc, LegalList } from '@/components/legal/legal-doc'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How SkillFleet collects, uses and protects personal data — including the data of children — under the Digital Personal Data Protection Act, 2023.',
  alternates: { canonical: '/privacy' },
}

const UPDATED = '2 September 2026'

const mail = (address: string) => (
  <a href={`mailto:${address}`} className="font-semibold text-primary hover:underline">
    {address}
  </a>
)

export default function PrivacyPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="Privacy"
        highlight="Policy"
        subtitle="What we collect, why we collect it, and the choices you have. Written to be read by students and parents, not only by lawyers."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]}
        accentColor="accent-teal"
      />

      <LegalDoc
        updated={UPDATED}
        intro={
          <>
            <p>
              SkillFleet is a learning platform for school students. Most of the people whose data we
              hold are children, so we have written this policy to be understood rather than merely
              complied with.
            </p>
            <p>
              This policy explains what we collect through <strong>skillfleet.org</strong>, the
              SkillFleet platform, and the International Skill Championship (ISC). It applies to
              students, parents, school coordinators and teachers.
            </p>
          </>
        }
        sections={[
          {
            id: 'who-we-are',
            title: 'Who we are',
            body: (
              <>
                <p>
                  SkillFleet operates this platform and decides how the personal data described here
                  is used. In the language of the Digital Personal Data Protection Act, 2023, we are
                  the <em>Data Fiduciary</em>.
                </p>
                <LegalList
                  items={[
                    <>Address: HQ27 The Headquarters, Gurugram, Haryana 122009, India</>,
                    <>Email: {mail('contact@skillfleet.org')}</>,
                    <>Phone: +91 8076314479 (Mon–Sat, 9am–7pm IST)</>,
                  ]}
                />
              </>
            ),
          },
          {
            id: 'children',
            title: 'Students under 18, and their parents',
            body: (
              <>
                <p>
                  Nearly every student on SkillFleet is a child. Indian law treats children&apos;s
                  data as deserving extra care, and we agree.
                </p>
                <LegalList
                  items={[
                    <>
                      <strong>A parent&apos;s details are required at signup.</strong> When a student
                      creates an account we ask for a parent or guardian&apos;s name, email and
                      WhatsApp number, so a responsible adult is identifiable and reachable.
                    </>,
                    <>
                      <strong>We do not show advertising to students</strong>, and we do not build
                      advertising or behavioural profiles of them.
                    </>,
                    <>
                      <strong>We do not track students across other websites.</strong> There are no
                      third-party advertising or analytics trackers on this platform.
                    </>,
                    <>
                      <strong>Parents can ask us anything about their child&apos;s data</strong> —
                      what we hold, why, and to correct or delete it. Write to{' '}
                      {mail('contact@skillfleet.org')} from the parent email on the account.
                    </>,
                  ]}
                />
                <p>
                  If you believe a child&apos;s account was created without a parent&apos;s
                  knowledge, tell us and we will suspend it while we check.
                </p>
              </>
            ),
          },
          {
            id: 'what-we-collect',
            title: 'What we collect',
            body: (
              <>
                <p>We collect only what the platform needs in order to work.</p>
                <p className="font-semibold text-foreground">Account and profile</p>
                <LegalList
                  items={[
                    'Name, email address and password. Passwords are stored only as a cryptographic hash — we never see or store the password itself.',
                    'Date of birth, used to check age eligibility for programmes.',
                    'Mobile or WhatsApp number.',
                    'School name, class, board, branch, city, district and state.',
                    'If you sign in with Google: your name, email address and profile picture, as supplied by Google. Nothing else — we never gain access to your Gmail, Drive, contacts or any other Google data.',
                  ]}
                />
                <p className="font-semibold text-foreground">Parent and family</p>
                <LegalList
                  items={[
                    "Parent or guardian's name, email address and phone number.",
                    'Which students belong to the same family, so siblings can be managed together.',
                  ]}
                />
                <p className="font-semibold text-foreground">Activity on the platform</p>
                <LegalList
                  items={[
                    'Workshops, trips, events, competitions and internships you book, and your orders and wallet balance.',
                    'Answers to assessments and questionnaires, and the skill scores and recommendations calculated from them.',
                    'Certificates you upload.',
                    'Messages you send us through support.',
                  ]}
                />
                <p className="font-semibold text-foreground">
                  International Skill Championship entries
                </p>
                <LegalList
                  items={[
                    'Your entry: written answers, and links to work you host elsewhere such as a YouTube video, an app or a Google Drive file.',
                    'Your teammates, if you enter as a team.',
                    'A record that you (and your parent, where required) consented to take part.',
                    'The edit history of your entry, so a dispute about what was submitted before a deadline can be settled.',
                  ]}
                />
                <p className="font-semibold text-foreground">Coordinators</p>
                <LegalList
                  items={[
                    'Your name, email, WhatsApp number, and the school you are applying to represent, including its board and approximate size.',
                  ]}
                />
                <p className="font-semibold text-foreground">Technical</p>
                <LegalList
                  items={[
                    'A session cookie that keeps you signed in. It is strictly necessary — without it the site cannot know who you are.',
                    'Ordinary server logs kept by our hosting providers, which include IP addresses, for security and diagnostics.',
                  ]}
                />
              </>
            ),
          },
          {
            id: 'how-we-use-it',
            title: 'How we use it',
            body: (
              <LegalList
                items={[
                  'To create and secure your account and keep you signed in.',
                  'To run bookings, orders and your wallet.',
                  'To run the International Skill Championship: accepting entries, judging them, ranking schools and states, and awarding prizes.',
                  'To suggest programmes that fit a student, based on their own assessment answers.',
                  'To let an approved school coordinator see how their own students are progressing.',
                  'To reply when you contact support.',
                  'To send messages about something you signed up for — a booking, an entry, a deadline, a password reset.',
                  'To keep the platform safe, and to comply with the law.',
                ]}
              />
            ),
          },
          {
            id: 'legal-basis',
            title: 'The basis on which we process data',
            body: (
              <>
                <p>
                  For most of what we do, the basis is your consent — given when you create an
                  account, book something, or enter the Championship. Where we act to fulfil a
                  booking you have made, we process what is necessary to deliver it.
                </p>
                <p>
                  You may withdraw consent at any time by writing to {mail('contact@skillfleet.org')}
                  . Withdrawing consent does not undo processing that already happened, and it may
                  mean we can no longer provide part of the service — for example, we cannot keep a
                  Championship entry in judging if you withdraw consent to it being judged.
                </p>
              </>
            ),
          },
          {
            id: 'sharing',
            title: 'Who else sees your data',
            body: (
              <>
                <p>
                  <strong>We do not sell personal data. We never have.</strong> We share it only in
                  these situations:
                </p>
                <LegalList
                  items={[
                    <>
                      <strong>Your school.</strong> If a coordinator at your school has been approved
                      by us, they can see the students from their school on SkillFleet and how those
                      students are progressing in the Championship. They cannot see your password, or
                      anything from another school.
                    </>,
                    <>
                      <strong>Service providers who run the platform for us.</strong> Supabase
                      (database, sign-in and file storage) and Vercel (website hosting). They process
                      data on our instructions only.
                    </>,
                    <>
                      <strong>Google</strong>, if you choose to sign in with Google. Google tells us
                      your name, email and profile picture. Your use of Google&apos;s own service is
                      governed by Google&apos;s privacy policy.
                    </>,
                    <>
                      <strong>Championship judges and partners</strong>, who see submitted entries in
                      order to judge them. Winners&apos; names, schools and winning entries may be
                      published or featured as part of the Championship — this is explained again at
                      the point you enter.
                    </>,
                    <>
                      <strong>Delivery partners</strong> for something you booked, such as the host of
                      a workshop or an industrial visit, limited to what they need to admit you.
                    </>,
                    <>
                      <strong>Authorities</strong>, where the law requires it.
                    </>,
                  ]}
                />
              </>
            ),
          },
          {
            id: 'links',
            title: 'Work you host somewhere else',
            body: (
              <p>
                Championship entries are submitted as links to work hosted on other services — a
                YouTube video, a Google Drive file, a live app. Those services have their own privacy
                policies, and whatever you make public there is public. We check that a link is
                actually viewable so that a judge is not shown a locked file, but we do not control
                the service hosting it.
              </p>
            ),
          },
          {
            id: 'retention',
            title: 'How long we keep it',
            body: (
              <LegalList
                items={[
                  'Your account and profile: for as long as your account is open.',
                  'Championship entries and results: for the duration of the season and afterwards as part of the permanent record of who took part and who won.',
                  'Bookings, orders and wallet transactions: as long as required for financial and tax records.',
                  'Support conversations: while they are useful for helping you, and then deleted.',
                  'If you close your account, we delete or anonymise your personal data unless we are required to keep something specific, in which case we keep only that.',
                ]}
              />
            ),
          },
          {
            id: 'your-rights',
            title: 'Your rights',
            body: (
              <>
                <p>Under the Digital Personal Data Protection Act, 2023, you may:</p>
                <LegalList
                  items={[
                    'Ask what personal data we hold about you and how it has been shared.',
                    'Ask us to correct anything inaccurate, or complete anything missing.',
                    'Ask us to erase your personal data where we no longer need it.',
                    'Withdraw consent you previously gave.',
                    'Nominate another person to exercise these rights on your behalf if you are unable to.',
                    'Complain to us, and then to the Data Protection Board of India if we do not resolve it.',
                  ]}
                />
                <p>
                  A parent or guardian may exercise these rights for their child. Write to{' '}
                  {mail('contact@skillfleet.org')} and we will respond as quickly as we can.
                </p>
              </>
            ),
          },
          {
            id: 'security',
            title: 'How we protect it',
            body: (
              <LegalList
                items={[
                  'Traffic to and from the site is encrypted in transit.',
                  'Passwords are stored only as hashes, never in a readable form.',
                  'Access to data is restricted at the database level, so one family cannot read another family, and one school cannot read another school.',
                  'Only staff who need access to run the platform have it.',
                  'If a breach occurs that puts your data at risk, we will notify you and the Data Protection Board as the law requires.',
                ]}
              />
            ),
          },
          {
            id: 'grievance',
            title: 'Complaints and our grievance officer',
            body: (
              <>
                <p>
                  If you are unhappy with how we have handled your personal data, contact our
                  Grievance Officer:
                </p>
                <LegalList
                  items={[
                    <>Email: {mail('contact@skillfleet.org')}</>,
                    <>Post: Grievance Officer, SkillFleet, HQ27 The Headquarters, Gurugram, Haryana 122009</>,
                  ]}
                />
                <p>
                  We aim to acknowledge every complaint within 7 working days. If you remain
                  dissatisfied, you may escalate to the Data Protection Board of India.
                </p>
              </>
            ),
          },
          {
            id: 'changes',
            title: 'Changes to this policy',
            body: (
              <p>
                If we change this policy we will update the date at the top of this page. If a change
                materially affects how we use your data, we will tell you directly rather than
                relying on you to notice. Continuing to use SkillFleet after a change means you
                accept the updated policy. See also our{' '}
                <Link href="/terms" className="font-semibold text-primary hover:underline">
                  Terms of Service
                </Link>
                .
              </p>
            ),
          },
        ]}
      />
    </SubpageLayout>
  )
}
