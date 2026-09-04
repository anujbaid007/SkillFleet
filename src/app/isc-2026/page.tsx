import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Trophy, Users } from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { HowItWorks } from "@/components/isc/how-it-works";
import { ISC_TRACKS, PUZZLE_MASTER, LANGUAGE_OPTIONS } from "@/lib/isc/tracks";

/*
  The public face of ISC 2026.

  Every /isc route lives under the (platform) group and redirects anonymous
  visitors to /login, so until now a student who saw the championship
  advertised had nowhere to read about it before creating an account. This is
  that page: the same track data and the same HowItWorks the signed-in
  dashboard uses, with no auth in front of it.

  A server component rather than "use client" like the neighbouring marketing
  pages, so it can carry real metadata — this is the page outreach and ads
  will point at, and it needs a title and description a crawler can read.
*/

export const metadata: Metadata = {
  title: "International Skill Championship 2026 | Skill Fleet",
  description:
    "Four national championships for Classes 5 to 12: build an AI app, pitch a business, tell a story in sixty seconds, or take on Puzzle Master. Free to enter, in English or Hindi.",
};

/** The four championships, in the order the campaign says them. */
const CHAMPIONSHIPS = [
  { ...ISC_TRACKS.find((t) => t.id === "ai_for_impact")!, hero: "/isc/2026/hero-build.webp" },
  { ...PUZZLE_MASTER, maxTeamSize: 1, hero: "/isc/2026/hero-solve.webp" },
  { ...ISC_TRACKS.find((t) => t.id === "content_creator")!, hero: "/isc/2026/hero-create.webp" },
  { ...ISC_TRACKS.find((t) => t.id === "entrepreneurship")!, hero: "/isc/2026/hero-lead.webp" },
];

const FACTS = [
  { label: "Who can enter", value: "Classes 5 to 12" },
  { label: "Divisions", value: "Classes 5–8 and 9–12" },
  { label: "Cost", value: "Free to enter" },
  { label: "Languages", value: LANGUAGE_OPTIONS.join(" or ") },
  { label: "Team size", value: "On your own, or up to 3" },
  { label: "How many", value: "Enter every championship" },
];

export default function Isc2026Page() {
  return (
    <SubpageLayout>
      {/*
        The campaign banner itself, rather than the purple PageBanner the other
        subpages use. It already carries the wordmark and the promise line, so
        repeating them in HTML on top would say everything twice.

        Two things the artwork cannot do are supplied around it: the crumb
        trail, and a real <h1>. The heading is visually hidden because the
        image states it — but a screen reader, and a crawler, still need the
        page to have one.
      */}
      <header
        className="relative overflow-hidden pt-24 pb-12 sm:pt-28 sm:pb-16"
        style={{
          background:
            "linear-gradient(135deg, #7447E1 0%, #8B5CF6 35%, #9333EA 65%, #7C3AED 100%)",
        }}
      >
        {/*
          The purple ground is kept deliberately, even though the artwork below
          carries its own. shouldUseLightNav turns the navbar white on any
          subpage at the top of the page, and a white logo needs something dark
          behind it — the banner art is pale lilac, so on its own it would make
          the logo disappear. See nav-appearance.ts.
        */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/70">
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white/90">ISC 2026</span>
          </nav>

          {/*
            The artwork already sets the wordmark and the promise line, so
            repeating them in HTML would say everything twice. What it cannot
            do is be a heading — hence the visually hidden h1, for screen
            readers and crawlers.
          */}
          <h1 className="sr-only">International Skill Championship 2026</h1>

          <div className="relative mt-5 aspect-[2/1] w-full overflow-hidden rounded-3xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
            <Image
              src="/isc/2026/banner.webp"
              alt="International Skill Championship 2026 — Build. Solve. Create. Lead."
              fill
              priority
              sizes="(min-width: 1152px) 1088px, 94vw"
              className="object-cover"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-10 pb-14 sm:px-6 sm:pt-12 sm:pb-16 lg:px-8">
        {/* ------------------------------------------------------- the facts */}
        <Reveal>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((f) => (
              <div key={f.label} className="clay-card p-4 sm:p-5">
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                  {f.label}
                </dt>
                <dd className="font-display mt-1 text-lg font-bold text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* --------------------------------------------- the four championships */}
        <Reveal delay={0.05}>
          <div className="mt-14 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              The four championships
            </h2>
            <span className="text-sm text-muted">Enter as many as you like</span>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {CHAMPIONSHIPS.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.slug} delay={0.08 + i * 0.05} className="h-full">
                <article className="clay-card flex h-full flex-col overflow-hidden p-0">
                  <span className={`block h-1.5 bg-gradient-to-r ${c.gradient}`} />

                  <div
                    className={`relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-b ${c.wash} to-transparent`}
                  >
                    <Image
                      src={c.hero}
                      alt=""
                      aria-hidden
                      fill
                      sizes="(min-width: 640px) 460px, 92vw"
                      className="object-contain object-bottom"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${c.gradient} px-2.5 py-1 text-[11px] font-bold text-white shadow-sm`}
                      >
                        <Icon className="h-3 w-3" />
                        {c.verb}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-bold text-muted">
                        <Users className="h-3 w-3" />
                        {c.maxTeamSize > 1
                          ? `On your own or a team of up to ${c.maxTeamSize}`
                          : "Individual only"}
                      </span>
                    </div>

                    <h3 className="font-display mt-3 text-xl font-bold text-foreground">
                      {c.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-foreground/70">{c.brief}</p>

                    <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">
                      What you&rsquo;ll need
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {c.prepare.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted">
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${c.accent}`} />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto flex items-start gap-2 pt-5">
                      <Trophy className={`mt-0.5 h-4 w-4 shrink-0 ${c.accent}`} />
                      <p className="text-sm text-muted">{c.prize}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* ------------------------------------------------------ how it works */}
        <Reveal delay={0.05}>
          <h2
            id="how-it-works"
            className="font-display mt-16 scroll-mt-28 text-2xl font-bold text-foreground sm:text-3xl"
          >
            How it works
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            Entering takes one form. Everything after that is judged for you.
          </p>
          <div className="mt-6">
            {/* The same component the signed-in dashboard and the coordinator
                console render, so the three rounds can never be described one
                way here and another way once a student is inside. */}
            <HowItWorks />
          </div>
        </Reveal>

        {/* --------------------------------------------------------------- CTA */}
        <Reveal delay={0.05}>
          <div className="clay-card mt-14 flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                Ready to enter?
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted sm:text-base">
                Create your Skill Fleet account, pick your championships, and save a draft. Nothing
                is submitted until you say so.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" className="group">
                  Create an account
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </SubpageLayout>
  );
}
