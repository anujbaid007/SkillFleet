"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Cpu, Puzzle, Rocket, Trophy, Video, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
  The ISC 2026 lead hero.

  The wordmark is set in HTML rather than dropped in as the supplied banner
  PNG. The banner bakes its type at one size on one background: it would go
  soft on a retina screen, reflow badly on a phone, and read as nothing at all
  to a screen reader. Rebuilding it keeps the artwork's exact colour order —
  navy, purple, teal, yellow — while staying sharp, selectable and responsive.

  The photography is the four per-track student cutouts, which arrive on real
  transparency, so each sits straight on its own tinted podium.
*/

interface HeroTrack {
  verb: string;
  name: string;
  art: string;
  icon: LucideIcon;
  /** Podium wash behind the cutout. */
  wash: string;
  /** Accent for the verb label. */
  accent: string;
  /** Alternate cells ride higher, so the row reads as a group not a grid. */
  lift: string;
  /*
    Evens up how big each figure reads. The cutouts range from 1.20 landscape
    to 0.57 tall, and `object-contain` fits each by whichever edge binds — so
    without this the wide ones fill their tile and the tall ones float in the
    middle at half the size.
  */
  fit: string;
  alt: string;
}

const TRACKS: HeroTrack[] = [
  {
    verb: "Build",
    name: "AI for Impact",
    art: "/isc/2026/hero-build.webp",
    icon: Cpu,
    wash: "from-primary/25 to-primary/[0.04]",
    accent: "text-primary",
    lift: "lg:-translate-y-6",
    fit: "scale-100",
    alt: "A student building an app on a laptop",
  },
  {
    verb: "Solve",
    name: "Puzzle Master",
    art: "/isc/2026/hero-solve.webp",
    icon: Puzzle,
    wash: "from-accent-yellow/30 to-accent-pink/[0.05]",
    accent: "text-[#B45309]",
    lift: "lg:translate-y-4",
    fit: "scale-105",
    alt: "A student solving a puzzle cube",
  },
  {
    verb: "Create",
    name: "Content Creator",
    art: "/isc/2026/hero-create.webp",
    icon: Video,
    wash: "from-accent-pink/25 to-accent-purple/[0.05]",
    accent: "text-accent-pink",
    lift: "lg:-translate-y-2",
    fit: "scale-110",
    alt: "A student recording a piece to camera",
  },
  {
    verb: "Lead",
    name: "Young Entrepreneurship",
    art: "/isc/2026/hero-lead.webp",
    icon: Rocket,
    wash: "from-accent-teal/25 to-primary/[0.05]",
    accent: "text-accent-teal",
    lift: "lg:translate-y-8",
    fit: "scale-100",
    alt: "A student presenting a business idea at a whiteboard",
  },
];

/** The wordmark's four lines, in the artwork's colour order. */
const WORDMARK = [
  { text: "International", className: "text-foreground text-[clamp(1.5rem,4.2vw,2.9rem)]" },
  { text: "Skill", className: "text-primary-light text-[clamp(2.6rem,7.6vw,5.4rem)]" },
  { text: "Championship", className: "text-accent-teal text-[clamp(2rem,5.9vw,4.2rem)]" },
  { text: "2026", className: "text-accent-yellow text-[clamp(2.6rem,7.6vw,5.4rem)]" },
];

/** "Build. Solve. Create. Lead." — each stop takes its track's colour. */
const PROMISE = [
  { word: "Build", dot: "text-accent-teal" },
  { word: "Solve", dot: "text-primary-light" },
  { word: "Create", dot: "text-accent-pink" },
  { word: "Lead", dot: "text-accent-yellow" },
];

export default function Isc2026Hero() {
  return (
    <section
      id="isc-2026"
      aria-labelledby="isc-2026-heading"
      className="relative isolate overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24"
    >
      {/* Ground: the artwork's pale lilac, warmed toward white at the foot so
          the section hands off to the page below without a hard seam. */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,#F4F1FF_0%,#FAF8FF_45%,#F8FAFC_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_100%_at_75%_0%,rgba(116,71,225,0.16),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[320px] bg-[radial-gradient(50%_100%_at_20%_100%,rgba(20,184,166,0.12),transparent_70%)]" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />


      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-8">
        {/* ---------------------------------------------------------- copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3.5 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur">
            <Trophy className="h-3.5 w-3.5" />
            Now open · Classes 5 to 12
          </span>

          <h1 id="isc-2026-heading" className="mt-5 font-display font-extrabold leading-[0.92] tracking-tight">
            {WORDMARK.map((line) => (
              <span key={line.text} className={`block ${line.className}`}>
                {line.text}
              </span>
            ))}
          </h1>

          {/* The banner's four-colour rule, under the type exactly as there. */}
          <span className="mt-5 block h-1.5 w-56 max-w-full rounded-full bg-[linear-gradient(90deg,#7447E1_0%,#14B8A6_38%,#EC4899_70%,#FBBF24_100%)]" />

          <p className="mt-4 font-display text-lg font-bold text-foreground sm:text-xl">
            {PROMISE.map(({ word, dot }) => (
              <span key={word} className="mr-1.5 inline-block">
                {word}
                <span className={dot}>.</span>
              </span>
            ))}
          </p>

          <p className="mt-4 max-w-lg text-base text-muted sm:text-lg">
            Four national championships, one season. Build an app that helps people, pitch a
            business, tell a story in sixty seconds, or go head to head on logic and nerve — on
            your own or with a team of three.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/isc">
              <Button size="lg" className="group">
                Enter ISC 2026
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/isc-2026">
              <Button variant="outline" size="lg">
                How it works
              </Button>
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap gap-2">
            {TRACKS.map(({ verb, name, icon: Icon, accent }) => (
              <li
                key={verb}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted shadow-sm backdrop-blur"
              >
                <Icon className={`h-3.5 w-3.5 ${accent}`} />
                {name}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* ------------------------------------------------------- the four */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {TRACKS.map((track, i) => (
            <motion.div
              key={track.verb}
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 85, damping: 18, delay: 0.1 + i * 0.09 }}
              className={track.lift}
            >
              {/*
                A podium per track, echoing the discs the students stand on in
                the campaign art. The cutout is anchored to the bottom and
                allowed to overflow the top, so each figure breaks its frame
                rather than sitting boxed inside it.
              */}
              <div
                className={`group relative aspect-[4/5] overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-b ${track.wash} shadow-[0_18px_40px_-24px_rgba(30,41,59,0.45)]`}
              >
                <Image
                  src={track.art}
                  alt={track.alt}
                  fill
                  sizes="(min-width: 1024px) 240px, 44vw"
                  className={`${track.fit} object-contain object-bottom transition-transform duration-500 ease-out group-hover:scale-[1.06]`}
                  priority={i < 2}
                />
                <span
                  className={`absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 font-display text-[11px] font-extrabold shadow-sm backdrop-blur ${track.accent}`}
                >
                  {track.verb}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
