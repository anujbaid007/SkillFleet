import Image from 'next/image'
import { Users } from 'lucide-react'

/**
 * The masthead for /isc, built from the ISC 2026 key art: the stacked
 * SKILL / CHAMPIONSHIP / 2026 wordmark in purple, teal and yellow, the
 * four-colour rule, the "Build. Solve. Create. Lead." line, and the students
 * standing on the lavender studio podium.
 *
 * The wordmark is set in live text rather than lifted from the banner PNG so
 * it stays sharp at every width and so the personalised lines underneath —
 * which group the student is in, whether they can enter — sit inside the
 * artwork instead of being stranded below it.
 */
export function IscHero({ groupLabel }: { groupLabel: string | null }) {
  return (
    <div className="isc-stage relative overflow-hidden rounded-[18px] sm:rounded-[26px] border-2 border-white shadow-[8px_8px_24px_rgba(80,50,160,0.10),-4px_-4px_14px_rgba(255,255,255,0.9)] sm:border-[3px] md:min-h-[380px] lg:min-h-[430px]">
      {/* The podium rings and floating props from the key art. Purely
          decorative, so they are hidden from assistive tech and never take a
          click away from the content above them. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="isc-ring absolute -bottom-[16rem] right-[-6rem] h-[30rem] w-[38rem]" />
        <span className="isc-ring absolute -bottom-[12rem] right-[-2rem] h-[22rem] w-[28rem]" />
        <span className="isc-ring absolute -bottom-[8rem] right-[2rem] h-[14rem] w-[18rem]" />
        <span className="absolute right-[18%] top-6 h-16 w-16 rounded-full bg-accent-teal/20 blur-2xl" />
        <span className="absolute left-[42%] bottom-8 h-20 w-20 rounded-full bg-accent-pink/15 blur-2xl" />
        <span className="absolute right-8 top-1/3 h-14 w-14 rounded-full bg-accent-yellow/20 blur-2xl" />
      </div>

      <div className="relative">
        {/* From md up the students sit in the right half of the card, so the
            column reserves that space rather than running text under them. */}
        <div className="p-5 sm:p-7 lg:p-9 md:pr-[44%] lg:pr-[46%]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-teal opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-teal" />
            </span>
            School screening is open
          </span>

          {/*
            The key art's lockup in three lines at every width:
            INTERNATIONAL / SKILL CHAMPIONSHIP / 2026. Nothing forces the
            break between SKILL and CHAMPIONSHIP, so on a column too narrow to
            hold them they simply wrap onto their own lines — the banner's
            four-line stack — rather than overflowing.

            Sizes are in `em` so the whole thing scales from the one clamp on
            the heading.
          */}
          <h1 className="font-display mt-3 text-[clamp(1.4rem,5.8vw,3.05rem)] font-bold uppercase leading-[0.94] tracking-tight">
            <span className="block text-[0.6em] leading-[1.1] tracking-[0.05em] text-foreground">
              International
            </span>
            <span className="text-primary">Skill</span>{' '}
            <span className="text-accent-teal">Championship</span>
            <span className="block text-accent-yellow">2026</span>
          </h1>

          <div className="isc-rule mt-4 h-[5px] w-40 sm:w-52" />

          <p className="font-display mt-3 text-base font-bold text-foreground sm:text-xl">
            Build<span className="text-accent-teal">.</span> Solve
            <span className="text-primary">.</span> Create<span className="text-accent-pink">.</span>{' '}
            Lead<span className="text-accent-yellow">.</span>
          </p>

          <p className="mt-3 max-w-md text-sm text-foreground/70">
            Four championships, open to Classes 5 to 12. Enter as many as you like — school
            screening is free.
          </p>

          {groupLabel && (
            <p className="mt-4 max-w-md text-sm text-foreground/70">
              <span className="mr-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 align-middle text-xs font-bold text-foreground shadow-sm">
                <Users className="h-3.5 w-3.5 text-primary" />
                {groupLabel}
              </span>
              Team up with classmates from those classes at your school.
            </p>
          )}
        </div>

        {/* One element for both layouts: in normal flow under the text on a
            phone, pinned to the bottom-right of the card from md up. */}
        <div className="relative -mt-2 px-5 md:absolute md:right-0 md:bottom-0 md:mt-0 md:flex md:w-[46%] md:justify-end md:px-0 lg:w-[48%]">
          <Image
            src="/isc/2026/students.webp"
            alt="Students competing across the four ISC championships"
            width={1400}
            height={932}
            priority
            sizes="(max-width: 768px) 100vw, 48vw"
            className="h-auto w-full md:h-[330px] md:w-auto md:max-w-full lg:h-[380px]"
          />
        </div>
      </div>
    </div>
  )
}
