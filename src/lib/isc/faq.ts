import { ISC_TRACKS, LANGUAGE_OPTIONS, PUZZLE_MASTER } from '@/lib/isc/tracks'
import { ISC_GROUPS } from '@/lib/isc/groups'

/*
  The ISC FAQ, built from the same track, group and deadline data the ISC
  pages use, so a prize or a team size changed there changes here too.
  Students and coordinators share most of it; the coordinator group is only
  added for coordinators.
*/
export type FaqAudience = 'student' | 'coordinator'
export type FaqAccent = 'primary' | 'teal' | 'pink' | 'yellow'

export interface FaqItem {
  id: string
  q: string
  /** Paragraphs. Kept as plain text so the record of what we told people stays greppable. */
  a: string[]
}

export interface FaqGroup {
  id: string
  title: string
  accent: FaqAccent
  items: FaqItem[]
}

function dateLabel(iso: string | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

const group1 = ISC_GROUPS.group1
const group2 = ISC_GROUPS.group2
const classesOf = (g: { classes: string[] }) =>
  `Classes ${g.classes[0].replace('Class ', '')} to ${g.classes[g.classes.length - 1].replace('Class ', '')}`

export function buildIscFaq({
  audience,
  deadlines,
}: {
  audience: FaqAudience
  deadlines: Record<string, string>
}): FaqGroup[] {
  const deadlineLines = ISC_TRACKS.map((t) => {
    const d = dateLabel(deadlines[t.id])
    return d ? `${t.name}: entries close ${d}.` : `${t.name}: the closing date will appear on its page.`
  })

  const groups: FaqGroup[] = [
    {
      id: 'championship',
      title: 'The championship',
      accent: 'primary',
      items: [
        {
          id: 'what-is-isc',
          q: 'What is the International Skill Championship 2026?',
          a: [
            'Four national championships in one season: build an app that helps people, pitch a business, tell a story in sixty seconds, or go head to head on logic and nerve in Puzzle Master.',
            'You enter online from your SkillFleet account, on your own or with classmates, and the best entries go through a school round, a state round and the national finals.',
          ],
        },
        {
          id: 'cost',
          q: 'Does it cost anything to enter?',
          a: ['No. The school level is free, and you can enter as many of the four championships as you like.'],
        },
        {
          id: 'languages',
          q: 'Which languages can I enter in?',
          a: [`${LANGUAGE_OPTIONS.join(' or ')}. You choose the language of your entry on the form.`],
        },
        {
          id: 'certificate',
          q: 'Does everyone get something?',
          a: ['Everyone who enters receives a digital participation certificate. Winners get the prizes listed under each championship below.'],
        },
      ],
    },
    {
      id: 'eligibility',
      title: 'Who can enter',
      accent: 'teal',
      items: [
        {
          id: 'classes',
          q: 'Which classes can take part?',
          a: [
            `ISC 2026 is open to Classes 5 to 12. Students compete in two groups: ${group1.label} is ${classesOf(group1)} and ${group2.label} is ${classesOf(group2)}.`,
            'Your group comes from the class on your profile, so make sure it is right before you enter.',
          ],
        },
        {
          id: 'not-eligible',
          q: 'My class is below Class 5. Can I still do anything?',
          a: ['Not this cycle. You can still read what each championship involves and try the Puzzle Master practice games, and you will be eligible from Class 5.'],
        },
        {
          id: 'school-needed',
          q: 'Do I need my school on my profile?',
          a: ['Yes. Entries are ranked by school in the first round and teammates must be from the same school, so add your school under your profile details before entering.'],
        },
      ],
    },
    {
      id: 'tracks',
      title: 'The four championships',
      accent: 'pink',
      items: [
        ...ISC_TRACKS.map((t) => ({
          id: `track-${t.slug}`,
          q: `What is ${t.name} about?`,
          a: [
            t.brief,
            `Enter on your own or in a team of up to ${t.maxTeamSize}.`,
            `You will need: ${t.prepare.map((p) => p.charAt(0).toLowerCase() + p.slice(1)).join('; ')}.`,
            `Prize: ${t.prize}`,
          ],
        })),
        {
          id: 'track-puzzle-master',
          q: `What is ${PUZZLE_MASTER.name} about?`,
          a: [
            PUZZLE_MASTER.brief,
            `${PUZZLE_MASTER.divisions}. Individual only.`,
            `On the day you will need: ${PUZZLE_MASTER.prepare.map((p) => p.charAt(0).toLowerCase() + p.slice(1)).join('; ')}.`,
            `Prize: ${PUZZLE_MASTER.prize}`,
          ],
        },
      ],
    },
    {
      id: 'teams',
      title: 'Teams',
      accent: 'yellow',
      items: [
        {
          id: 'team-size',
          q: 'Can I enter with friends?',
          a: [
            `Yes, for AI for Impact, the Young Entrepreneurship Challenge and the Content Creator Championship: a team of up to three, all from the same school and the same group. Puzzle Master is individual only.`,
          ],
        },
        {
          id: 'add-teammate',
          q: 'How do I add a teammate?',
          a: [
            'Open the championship, start your entry and add their registered SkillFleet email in the team panel. They get an invite on their ISC page and join once they accept.',
          ],
        },
        {
          id: 'who-edits',
          q: 'Who can edit and submit the entry?',
          a: ['The team leader, the student who started the entry. Teammates can see it, and anyone can leave the team from the team panel.'],
        },
        {
          id: 'one-entry',
          q: 'Can I be in two teams for the same championship?',
          a: ['No. One entry per championship per student, whether you started it or joined it. You can enter every championship, though.'],
        },
      ],
    },
    {
      id: 'rounds',
      title: 'Rounds and dates',
      accent: 'primary',
      items: [
        {
          id: 'how-rounds-work',
          q: 'How do the rounds work?',
          a: [
            'School level: enter online, free. Skill Fleet judges every entry centrally.',
            'State championship: the top three in each championship from your school go through to the state round.',
            'National finals: the top three in each championship from every state meet in person in April 2027.',
          ],
        },
        {
          id: 'deadlines',
          q: 'When do entries close?',
          a: deadlineLines,
        },
      ],
    },
    {
      id: 'submitting',
      title: 'Entering and submitting',
      accent: 'teal',
      items: [
        {
          id: 'drafts',
          q: 'Do I have to finish in one go?',
          a: ['No. Save a draft as often as you like; nothing is judged until you press Submit entry. Opening the form does not enter you either.'],
        },
        {
          id: 'edit-after-submit',
          q: 'Can I change my entry after submitting?',
          a: ['No, a submitted entry is locked. Before the deadline you can edit a draft freely, and your edit history is kept.'],
        },
        {
          id: 'links',
          q: 'What kind of links work?',
          a: [
            'Links to work you host elsewhere: YouTube or Google Drive for videos, and any public address for an app or prototype. They must open for anyone, so check each one in a private browser window before you submit.',
          ],
        },
        {
          id: 'video-length',
          q: 'How long can a video be?',
          a: ['One minute or less, for every championship that asks for one.'],
        },
        {
          id: 'missing-field',
          q: 'What if something is missing when I submit?',
          a: ['Submit refuses and tells you which field needs attention. Fill it in and submit again.'],
        },
      ],
    },
    {
      id: 'puzzle-master',
      title: 'Puzzle Master',
      accent: 'pink',
      items: [
        {
          id: 'pm-different',
          q: 'How is Puzzle Master different from the others?',
          a: [
            'There is nothing to build or upload. Rounds are timed logic and reflex puzzles played live, hosted by Brainweave, a separate company that runs the championship with us.',
          ],
        },
        {
          id: 'pm-practice',
          q: 'How do I practise?',
          a: ['The Puzzle Master page has three free practice games. They are not scored and your progress stays on your own device.'],
        },
        {
          id: 'pm-day',
          q: 'What do I need on the day?',
          a: [PUZZLE_MASTER.prepare.join('. ') + '.'],
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy',
      accent: 'yellow',
      items: [
        {
          id: 'what-stored',
          q: 'What do you keep about my entry?',
          a: [
            'Your name, class and school; what you write and the links you give; your teammates if you enter as a team; and when you submitted, with your edit history up to the deadline.',
          ],
        },
        {
          id: 'who-sees',
          q: 'Who can see it?',
          a: [
            'Skill Fleet staff and the championship judges, your school coordinator if your school has an approved one, and Brainweave only for Puzzle Master.',
          ],
        },
        {
          id: 'ownership',
          q: 'Who owns my work?',
          a: ['You do. Entering does not give Skill Fleet ownership of anything you make.'],
        },
        {
          id: 'change-mind',
          q: 'Can I withdraw?',
          a: ['Yes. Write to hello@skillfleet.org and we will remove your entry from the championship.'],
        },
      ],
    },
  ]

  if (audience === 'coordinator') {
    groups.push({
      id: 'coordinators',
      title: 'For coordinators',
      accent: 'primary',
      items: [
        {
          id: 'co-approval',
          q: 'How does my school get set up?',
          a: [
            'Sign up as a coordinator and pick your school. Skill Fleet reviews the claim; until it is approved your dashboard shows it as pending, and the roster and analytics stay closed.',
          ],
        },
        {
          id: 'co-invite',
          q: 'How do students join under my school?',
          a: [
            'Share the link from Invite Students. Anyone who signs up through it has your school selected already. The link works before your approval comes through, so you can start straight away.',
          ],
        },
        {
          id: 'co-roster',
          q: 'What can I see once approved?',
          a: ['Your roster: which students have entered which championship, drafts and submissions, and analytics across the school.'],
        },
        {
          id: 'co-enter-for',
          q: 'Can I enter on behalf of a student?',
          a: ['No. Students enter from their own accounts, on their own or with classmates. You follow progress from your dashboard.'],
        },
        {
          id: 'co-help',
          q: 'How do I reach Skill Fleet?',
          a: ['Contact Admin in your menu opens a thread with the Skill Fleet team, or write to hello@skillfleet.org.'],
        },
      ],
    })
  }

  return groups
}
