"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Trophy,
  Medal,
  Award,
  Star,
  Zap,
  Target,
  Crown,
  Shield,
  CheckCircle,
  Users,
  ChevronRight,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Spring transition helper                                           */
/* ------------------------------------------------------------------ */

const spring = (delay = 0) => ({
  type: "spring" as const,
  stiffness: 80,
  damping: 18,
  delay,
});

/* ------------------------------------------------------------------ */
/*  Decorative floating SVG doodles                                    */
/* ------------------------------------------------------------------ */

function TrophyDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 5h-1V3H6v2H5C3.35 5 2 6.35 2 8c0 2.76 2.13 5.02 4.84 5.45.65 1.56 1.97 2.77 3.61 3.27V19H8v2h8v-2h-2.45v-2.28c1.64-.5 2.96-1.71 3.61-3.27C19.87 13.02 22 10.76 22 8c0-1.65-1.35-3-3-3zM4 8c0-.55.45-1 1-1h1v4.55C4.84 11.18 4 9.7 4 8zm16 0c0 1.7-.84 3.18-2 4.55V7h1c.55 0 1 .45 1 1z" />
    </svg>
  );
}

function MedalDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  );
}

function CrownDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3h10v-2H7v2z" />
    </svg>
  );
}

function StarDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function LightningDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Competition types data                                             */
/* ------------------------------------------------------------------ */

const competitionTypes = [
  {
    icon: Zap,
    title: "Robotics & AI Challenges",
    description:
      "Build and program robots from scratch. Solve complex AI challenges that push the boundaries of technology and creative engineering.",
    tags: ["Robot Building", "AI Programming", "Team Engineering"],
    color: "bg-primary/10 text-primary",
    borderColor: "border-primary/20",
    accentGradient: "from-primary/20 to-primary-light/10",
    image: "/images/kids-group.jpg",
  },
  {
    icon: Award,
    title: "Creative Arts Competitions",
    description:
      "Showcase your artistic talent across multiple mediums — painting, sculpture, digital art, music, and performing arts at the national stage.",
    tags: ["Visual Arts", "Music", "Performing Arts"],
    color: "bg-accent-pink/10 text-accent-pink",
    borderColor: "border-accent-pink/20",
    accentGradient: "from-accent-pink/20 to-accent-yellow/10",
    image: "/images/kid-raising-hand.jpg",
  },
  {
    icon: Target,
    title: "STEM Competitions",
    description:
      "Participate in science olympiads, engineering design challenges, and mathematics competitions that test analytical and problem-solving skills.",
    tags: ["Science Olympiad", "Math Olympiad", "Engineering Design"],
    color: "bg-accent-teal/10 text-accent-teal",
    borderColor: "border-accent-teal/20",
    accentGradient: "from-accent-teal/20 to-accent-teal/5",
    image: "/images/kids-uniform.jpg",
  },
  {
    icon: Zap,
    title: "Coding Hackathons",
    description:
      "Race against the clock to build innovative solutions. Teams collaborate under pressure to create functional apps and games that solve real problems.",
    tags: ["App Building", "Game Dev", "Problem Solving"],
    color: "bg-accent-yellow/10 text-amber-600",
    borderColor: "border-amber-200",
    accentGradient: "from-accent-yellow/20 to-accent-pink/10",
    image: "/images/kids-group.jpg",
  },
  {
    icon: Shield,
    title: "Sports & Fitness Challenges",
    description:
      "Demonstrate physical prowess and team coordination in structured sports events, fitness challenges, and inter-school athletic competitions.",
    tags: ["Team Sports", "Athletics", "Fitness Challenges"],
    color: "bg-accent-purple/10 text-accent-purple",
    borderColor: "border-accent-purple/20",
    accentGradient: "from-accent-purple/20 to-accent-pink/10",
    image: "/images/kids-uniform.jpg",
  },
];

/* ------------------------------------------------------------------ */
/*  Winner benefits data                                               */
/* ------------------------------------------------------------------ */

const winnerBenefits = [
  {
    icon: Trophy,
    title: "Scholarships & Financial Awards",
    description:
      "Merit-based scholarships and cash prizes for top performers, helping families invest in their child's future education.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: Star,
    title: "National Recognition & Exposure",
    description:
      "Winners are featured in national media, SkillFleet newsletters, and earn a permanent place on our Hall of Champions.",
    color: "text-primary",
    bg: "bg-primary/5",
  },
  {
    icon: Crown,
    title: "Exclusive SkillFleet Passport Stamps",
    description:
      "Competition wins unlock rare passport stamps that unlock elite program tiers, advanced workshops, and mentorship access.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/5",
  },
  {
    icon: Users,
    title: "Community Access & Mentorship",
    description:
      "Join an elite alumni network with direct access to industry mentors, internship opportunities, and future leadership programs.",
    color: "text-accent-teal",
    bg: "bg-accent-teal/5",
  },
];

/* ------------------------------------------------------------------ */
/*  How to participate steps                                           */
/* ------------------------------------------------------------------ */

const steps = [
  {
    step: "01",
    title: "Register",
    description: "Sign up your school or child via WhatsApp or our registration portal.",
  },
  {
    step: "02",
    title: "Choose Competition",
    description: "Browse active competitions suited to age group, interest, and skill level.",
  },
  {
    step: "03",
    title: "Compete",
    description: "Participate online or in-person with guidance from SkillFleet mentors.",
  },
  {
    step: "04",
    title: "Win & Earn",
    description: "Collect awards, stamps, and recognition on the SkillFleet platform.",
  },
];

/* ------------------------------------------------------------------ */
/*  Safety features                                                    */
/* ------------------------------------------------------------------ */

const safetyFeatures = [
  "Trained supervisors at every in-person event",
  "Emergency protocols and medical staff on standby",
  "Certified officials monitoring all competitions",
  "End-to-end encrypted secure platforms for virtual events",
  "Safe online environments with moderated interactions",
  "Parent transparency reports after each event",
];

/* ------------------------------------------------------------------ */
/*  Card variants                                                      */
/* ------------------------------------------------------------------ */

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 18,
      delay: i * 0.1,
    },
  }),
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CompetitionsPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="National"
        highlight="Competitions"
        subtitle="Test your abilities, win scholarships, and gain recognition at regional and national levels"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Programs" },
          { label: "Competitions" },
        ]}
      />

      {/* ── INTRO ── */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        {/* Floating decorative doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 right-[6%] hidden sm:block pointer-events-none"
        >
          <TrophyDoodle className="w-16 h-16 text-amber-300/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-20 left-[4%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-10 h-10 text-primary/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-16 left-[8%] hidden lg:block pointer-events-none"
        >
          <CrownDoodle className="w-12 h-12 text-accent-purple/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], x: [0, 5, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-10 right-[12%] hidden sm:block pointer-events-none"
        >
          <LightningDoodle className="w-8 h-8 text-accent-yellow/20" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={spring(0.1)}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/5 text-primary text-sm font-semibold mb-5">
                National Competitions
              </span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
                Where Young Champions{" "}
                <span className="text-primary">Are Born</span>
              </h2>
              <p className="text-lg text-muted leading-relaxed mb-6">
                SkillFleet competitions give students a genuine stage to test their abilities
                across diverse fields — from robotics to creative arts. Competing regionally
                and nationally helps children build resilience, confidence, and teamwork
                while earning real scholarships and recognition that opens doors.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Ages 3–17", "Regional & National", "Scholarship Awards", "100+ Schools"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="px-4 py-1.5 rounded-full bg-primary/8 text-primary text-sm font-medium border border-primary/15"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </motion.div>

            {/* Image collage */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={spring(0.2)}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] clay-card p-1">
                <Image
                  src="/images/kid-raising-hand.jpg"
                  alt="Student raising hand at competition"
                  fill
                  className="object-cover rounded-2xl"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {/* Overlay badge */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="clay-card px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">500+ Awards Given</p>
                      <p className="text-xs text-muted">Across regional & national competitions</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating accent */}
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-5 -right-5 w-16 h-16 rounded-2xl bg-accent-yellow/90 shadow-lg flex items-center justify-center"
                style={{ boxShadow: "4px 4px 14px rgba(251,191,36,0.35)" }}
              >
                <Crown className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── COMPETITION TYPES ── */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-[#F8FAFC] to-white relative overflow-hidden">
        {/* background stars pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, #7447E1 2px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Extra floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 360] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-14 right-[5%] hidden lg:block pointer-events-none"
        >
          <MedalDoodle className="w-14 h-14 text-amber-300/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-20 left-[5%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-8 h-8 text-accent-yellow/20" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring()}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent-yellow/10 text-amber-600 text-sm font-semibold mb-4">
              Competition Categories
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Find Your{" "}
              <span className="text-primary">Winning Arena</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              From robotics labs to art studios, every child has a domain where they can shine.
              Explore competitions across five exciting categories.
            </p>
          </motion.div>

          {/* Cards — top row: 2 cards, middle: 2 cards, bottom: 1 centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {competitionTypes.slice(0, 4).map((comp, index) => (
              <motion.div
                key={comp.title}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={cardVariants}
                whileHover={{ y: -6, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }}
                className="clay-card overflow-hidden group cursor-pointer"
              >
                {/* Image strip */}
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={comp.image}
                    alt={comp.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                  {/* Icon badge */}
                  <div
                    className={`absolute bottom-4 left-5 w-11 h-11 rounded-2xl ${comp.color} flex items-center justify-center`}
                    style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.8)" }}
                  >
                    <comp.icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-6 pt-4">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">{comp.title}</h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">{comp.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {comp.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${comp.color} border border-current/10`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Last card centered */}
          {(() => {
            const lastComp = competitionTypes[4];
            const LastIcon = lastComp.icon;
            return (
              <div className="flex justify-center">
                <motion.div
                  custom={4}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={cardVariants}
                  whileHover={{ y: -6, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }}
                  className="clay-card overflow-hidden group cursor-pointer w-full md:w-[calc(50%-12px)] lg:w-[calc(50%-16px)]"
                >
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={lastComp.image}
                      alt={lastComp.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                    <div
                      className={`absolute bottom-4 left-5 w-11 h-11 rounded-2xl ${lastComp.color} flex items-center justify-center`}
                      style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.8)" }}
                    >
                      <LastIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="p-6 pt-4">
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">{lastComp.title}</h3>
                    <p className="text-sm text-muted leading-relaxed mb-4">{lastComp.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {lastComp.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${lastComp.color} border border-current/10`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── WHAT WINNERS GET ── */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        {/* Floating decorations */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[7%] hidden sm:block pointer-events-none"
        >
          <TrophyDoodle className="w-14 h-14 text-amber-300/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-20 right-[5%] hidden lg:block pointer-events-none"
        >
          <StarDoodle className="w-10 h-10 text-primary/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-28 right-[9%] hidden md:block pointer-events-none"
        >
          <LightningDoodle className="w-8 h-8 text-accent-yellow/18" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring()}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/5 text-primary text-sm font-semibold mb-4">
              Rewards & Recognition
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              What{" "}
              <span className="text-accent-yellow drop-shadow-sm">Winners</span>{" "}
              Receive
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Winning at SkillFleet competitions opens real doors — with tangible rewards that
              follow students throughout their educational journey.
            </p>
          </motion.div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {winnerBenefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={cardVariants}
                className="clay-card p-6 text-center group"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${benefit.bg} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <benefit.icon className={`w-7 h-7 ${benefit.color}`} />
                </div>
                <h3 className="font-display text-base font-bold text-foreground mb-2 leading-snug">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO PARTICIPATE ── */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        {/* Section background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, #7447E1 0%, #8B5CF6 40%, #9333EA 70%, #7C3AED 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Floating doodles on purple bg */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 right-[8%] hidden sm:block pointer-events-none"
        >
          <TrophyDoodle className="w-16 h-16 text-white/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-10 left-[6%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-10 h-10 text-accent-yellow/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute top-1/2 left-[3%] hidden lg:block pointer-events-none"
        >
          <CrownDoodle className="w-12 h-12 text-white/10" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring()}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/15 text-white text-sm font-semibold mb-4 backdrop-blur-sm">
              Simple Steps
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              How to{" "}
              <span className="text-accent-yellow">Participate</span>
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Getting started is easy. Follow these four steps and your child will be
              competing on a national stage in no time.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={cardVariants}
                className="relative"
              >
                {/* Connector line (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%-12px)] w-6 h-0.5 bg-white/20 z-10" />
                )}

                <div className="clay-card p-6 text-center h-full">
                  {/* Step number */}
                  <div
                    className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
                      boxShadow: "0 4px 14px rgba(251,191,36,0.35)",
                    }}
                  >
                    <span className="font-display text-lg font-bold text-white">{step.step}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAFETY ── */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        {/* floating doodles */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 right-[6%] hidden sm:block pointer-events-none"
        >
          <CrownDoodle className="w-12 h-12 text-accent-purple/12" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="absolute bottom-16 left-[6%] hidden md:block pointer-events-none"
        >
          <LightningDoodle className="w-10 h-10 text-primary/12" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image side */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={spring(0.1)}
              className="relative order-2 lg:order-1"
            >
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] clay-card p-1">
                <Image
                  src="/images/kids-group.jpg"
                  alt="Students safely competing together"
                  fill
                  className="object-cover rounded-2xl"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
              </div>
              {/* Safety badge */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-5 -right-5 clay-card px-5 py-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">100% Safe</p>
                  <p className="text-xs text-muted">Certified & Monitored</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Text side */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={spring(0.2)}
              className="order-1 lg:order-2"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/5 text-primary text-sm font-semibold mb-5">
                Child Safety
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Safety is Our{" "}
                <span className="text-primary">First Priority</span>
              </h2>
              <p className="text-lg text-muted leading-relaxed mb-8">
                Every SkillFleet competition — whether in-person or virtual — is designed
                with comprehensive safety standards to ensure every child competes in a
                secure, supported environment.
              </p>
              <ul className="space-y-4">
                {safetyFeatures.map((feature, index) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={spring(0.1 + index * 0.07)}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted text-sm leading-relaxed">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring()}
            className="clay-card overflow-hidden"
          >
            <div
              className="relative p-10 sm:p-14 text-center"
              style={{
                background:
                  "linear-gradient(135deg, #7447E1 0%, #8B5CF6 40%, #9333EA 70%, #7C3AED 100%)",
              }}
            >
              {/* Dot overlay */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "28px 28px",
                }}
              />

              {/* Floating doodles inside CTA */}
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-6 left-[8%] hidden sm:block pointer-events-none"
              >
                <TrophyDoodle className="w-14 h-14 text-white/10" />
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-6 right-[10%] hidden sm:block pointer-events-none"
              >
                <StarDoodle className="w-10 h-10 text-accent-yellow/25" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-1/2 right-[5%] hidden lg:block pointer-events-none"
              >
                <CrownDoodle className="w-12 h-12 text-white/10" />
              </motion.div>

              <div className="relative z-10">
                {/* Trophy icon */}
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 rounded-2xl bg-accent-yellow flex items-center justify-center mx-auto mb-6"
                  style={{ boxShadow: "0 6px 20px rgba(251,191,36,0.45)" }}
                >
                  <Trophy className="w-8 h-8 text-white" />
                </motion.div>

                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                  Ready to Compete?
                </h2>
                <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
                  Register your child today and let them take their first step toward
                  national recognition, scholarships, and lifelong memories on the champion&apos;s stage.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <WhatsAppCTA
                    label="Register for Competitions"
                    message="Hi, i'm interested in SkillFleet competitions!"
                  />
                </div>

                {/* Trust indicators */}
                <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/50 text-sm">
                  {["500+ Awards Given", "100+ Schools Enrolled", "Regional & National Levels"].map(
                    (item) => (
                      <div key={item} className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4" />
                        <span>{item}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
