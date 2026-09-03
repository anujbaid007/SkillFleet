"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Cpu,
  Palette,
  PenTool,
  Music,
  FlaskConical,
  BookOpen,
  Dumbbell,
  BrainCircuit,
  CheckCircle2,
  Zap,
  Award,
  GraduationCap,
  Star,
  Users,
  ShieldCheck,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Decorative SVG doodles                                             */
/* ------------------------------------------------------------------ */

function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function GearDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function PaintbrushDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a1 1 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 000-1.41z" />
    </svg>
  );
}

function CodeBracketDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function MusicNoteDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
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

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const workshopTopics = [
  {
    icon: Cpu,
    title: "Robotics & Coding",
    description: "Build and program real robots while mastering coding fundamentals",
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
  },
  {
    icon: Palette,
    title: "Creative Arts",
    description: "Explore painting, sculpting, and mixed media with professional artists",
    color: "text-accent-pink",
    bg: "bg-accent-pink/8",
    border: "border-accent-pink/20",
  },
  {
    icon: PenTool,
    title: "Graphic Design & Animation",
    description: "Design logos, animate characters, and craft digital stories",
    color: "text-accent-purple",
    bg: "bg-accent-purple/8",
    border: "border-accent-purple/20",
  },
  {
    icon: Music,
    title: "Music Production",
    description: "Compose beats, record tracks, and learn music theory hands-on",
    color: "text-accent-teal",
    bg: "bg-accent-teal/8",
    border: "border-accent-teal/20",
  },
  {
    icon: FlaskConical,
    title: "STEM Projects",
    description: "Conduct experiments, build models, and discover scientific principles",
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
  },
  {
    icon: BookOpen,
    title: "Digital Storytelling",
    description: "Craft compelling narratives using digital tools and visual media",
    color: "text-accent-pink",
    bg: "bg-accent-pink/8",
    border: "border-accent-pink/20",
  },
  {
    icon: Dumbbell,
    title: "Sports & Fitness",
    description: "Build physical literacy, teamwork, and healthy lifestyle habits",
    color: "text-accent-teal",
    bg: "bg-accent-teal/8",
    border: "border-accent-teal/20",
  },
  {
    icon: BrainCircuit,
    title: "AI & Machine Learning",
    description: "Explore artificial intelligence concepts and build simple AI projects",
    color: "text-accent-purple",
    bg: "bg-accent-purple/8",
    border: "border-accent-purple/20",
  },
];

const keyFeatures = [
  {
    icon: Zap,
    title: "Interactive Learning",
    description: "Students get hands-on with real tools, technologies, and materials — not just watching, but doing.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: GraduationCap,
    title: "Expert Instruction",
    description: "Each workshop is led by industry professionals and certified subject matter experts.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Award,
    title: "Certification",
    description: "Participants receive completion certificates they can showcase in their academic portfolios.",
    color: "text-accent-pink",
    bg: "bg-accent-pink/10",
  },
  {
    icon: Star,
    title: "Scholarship Access",
    description: "Outstanding participants may qualify for SkillFleet scholarships and sponsored programs.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
  {
    icon: Users,
    title: "Community",
    description: "Join SkillFleet's broader learning community, pathways, and inter-school competitions.",
    color: "text-accent-teal",
    bg: "bg-accent-teal/10",
  },
];

const safetyPoints = [
  "Trained & verified instructors for every session",
  "Controlled environments with supervised access",
  "Emergency preparedness and first-aid staff on-site",
  "Secure monitoring for all virtual/online sessions",
  "Age-appropriate grouping and activity selection",
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 90,
      damping: 18,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 20,
    },
  },
};

const featureRowVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 18,
      delay: i * 0.07,
    },
  }),
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function WorkshopsPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="Hands-on"
        highlight="Workshops"
        subtitle="Immersive learning experiences led by industry professionals"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Programs" },
          { label: "Workshops" },
        ]}
      />

      {/* ── Intro Section ─────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-accent-pink/[0.03] pointer-events-none" />

        {/* Floating background doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 left-[5%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-10 h-10 text-accent-pink/12" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, 360] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-8 right-[8%] hidden md:block pointer-events-none"
        >
          <GearDoodle className="w-14 h-14 text-primary/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-16 left-[12%] hidden lg:block pointer-events-none"
        >
          <PaintbrushDoodle className="w-8 h-8 text-accent-pink/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-12 right-[15%] hidden lg:block pointer-events-none"
        >
          <MusicNoteDoodle className="w-7 h-7 text-accent-purple/12" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -6, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-24 right-[28%] hidden xl:block pointer-events-none"
        >
          <StarDoodle className="w-6 h-6 text-accent-yellow/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-32 left-[30%] hidden xl:block pointer-events-none"
        >
          <CodeBracketDoodle className="w-8 h-8 text-primary/10" />
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUpVariants}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-pink/10 text-accent-pink text-sm font-semibold mb-5">
                <Zap className="w-4 h-4" />
                Immersive Learning
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Where Curiosity Meets{" "}
                <span className="text-accent-pink">Hands-on Discovery</span>
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-6">
                SkillFleet Workshops are immersive learning sessions where students get to explore
                new skills, hobbies, and passions in a safe, inspiring environment. Expert-led and
                thoughtfully designed, each workshop seamlessly blends creativity with structured
                learning across a wide range of diverse topics.
              </p>
              <p className="text-muted leading-relaxed">
                Whether your child is drawn to coding, painting, music, or science — there is a
                workshop crafted just for them. Every session is an opportunity to discover
                something new and build lasting confidence.
              </p>
            </motion.div>

            {/* Images collage */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring" as const, stiffness: 60, damping: 18, delay: 0.1 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="clay-card overflow-hidden h-52 relative">
                    <Image
                      src="/images/kids-classroom.jpg"
                      alt="Students in workshop"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="clay-card overflow-hidden h-36 relative">
                    <Image
                      src="/images/kid-raising-hand.jpg"
                      alt="Engaged student"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="clay-card overflow-hidden h-36 relative">
                    <Image
                      src="/images/corporate-workshop.webp"
                      alt="Corporate AI workshop training"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  {/*
                    The gradient goes on a layer inside the card, not on the
                    card itself: .clay-card sets `background` as a shorthand,
                    which resets background-image and silently drops any
                    bg-gradient-* applied alongside it — leaving white text on
                    a white card. An inline style wins against the class, the
                    way PageBanner sets its own gradient.
                  */}
                  <div
                    className="clay-card overflow-hidden h-52 relative flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(to bottom right, var(--color-primary), var(--color-accent-purple))",
                    }}
                  >
                    <div className="text-center text-white p-6">
                      <div className="font-display text-5xl font-bold mb-1">20+</div>
                      <div className="text-white/80 text-sm font-medium">Workshop Topics</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 clay-card px-4 py-3 flex items-center gap-2.5 z-10"
              >
                <div className="w-9 h-9 rounded-xl bg-accent-yellow/15 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 text-accent-yellow" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Expert-Led</div>
                  <div className="text-xs text-muted">Industry professionals</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Workshop Topics ───────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-b from-transparent to-primary/[0.03] overflow-hidden">
        {/* Extra doodles */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-10 right-[5%] hidden md:block pointer-events-none"
        >
          <GearDoodle className="w-12 h-12 text-accent-purple/8" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-20 left-[4%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-8 h-8 text-accent-pink/12" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-purple/10 text-accent-purple text-sm font-semibold mb-4">
              <Palette className="w-4 h-4" />
              Explore Topics
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Something for{" "}
              <span className="text-accent-purple">Every Passion</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              From robotics to music, our workshops span the full spectrum of interests — helping every student find their spark.
            </p>
          </motion.div>

          {/* Topics grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {workshopTopics.map((topic) => (
              <motion.div
                key={topic.title}
                variants={cardVariants}
                className="clay-card p-6 group cursor-default"
              >
                <div className={`w-12 h-12 rounded-2xl ${topic.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <topic.icon className={`w-6 h-6 ${topic.color}`} />
                </div>
                <h3 className="font-display font-bold text-foreground text-base mb-2 leading-snug">
                  {topic.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {topic.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Key Features ─────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* Doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 right-[6%] hidden lg:block pointer-events-none"
        >
          <PaintbrushDoodle className="w-10 h-10 text-accent-pink/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-16 left-[6%] hidden lg:block pointer-events-none"
        >
          <MusicNoteDoodle className="w-8 h-8 text-accent-purple/10" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-32 left-[20%] hidden xl:block pointer-events-none"
        >
          <StarDoodle className="w-5 h-5 text-accent-yellow" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          className="absolute bottom-24 right-[22%] hidden xl:block pointer-events-none"
        >
          <StarDoodle className="w-4 h-4 text-accent-yellow" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring" as const, stiffness: 60, damping: 18 }}
              className="relative order-2 lg:order-1"
            >
              <div className="clay-card overflow-hidden relative h-80 sm:h-96">
                <Image
                  src="/images/kids-learning.jpg"
                  alt="Students engaged in hands-on workshop"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
              </div>

              {/* Stat badges */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 clay-card px-4 py-3 flex items-center gap-2.5 z-10"
              >
                <div className="w-9 h-9 rounded-xl bg-accent-pink/10 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-accent-pink" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Certified</div>
                  <div className="text-xs text-muted">Completion certificates</div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 clay-card px-4 py-3 flex items-center gap-2.5 z-10"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Community</div>
                  <div className="text-xs text-muted">Join SkillFleet pathways</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Features list */}
            <div className="order-1 lg:order-2">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUpVariants}
                className="mb-10"
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                  <CheckCircle2 className="w-4 h-4" />
                  What Makes Us Different
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Designed for{" "}
                  <span className="text-primary">Real Impact</span>
                </h2>
                <p className="text-muted leading-relaxed">
                  Every element of our workshops is intentionally crafted to maximize learning,
                  engagement, and long-term benefit for each student.
                </p>
              </motion.div>

              <div className="space-y-5">
                {keyFeatures.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={featureRowVariants}
                    className="flex items-start gap-4"
                  >
                    <div className={`w-11 h-11 rounded-2xl ${feature.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                      <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Safety Section ───────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-accent-purple/[0.03] to-accent-pink/[0.04] pointer-events-none" />

        {/* Doodles */}
        <motion.div
          animate={{ rotate: [0, -360] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute top-12 left-[4%] hidden md:block pointer-events-none"
        >
          <GearDoodle className="w-16 h-16 text-primary/8" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-10 right-[5%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-9 h-9 text-accent-pink/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-20 right-[18%] hidden lg:block pointer-events-none"
        >
          <CodeBracketDoodle className="w-8 h-8 text-primary/8" />
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-teal/10 text-accent-teal text-sm font-semibold mb-4">
              <ShieldCheck className="w-4 h-4" />
              Your Child is Safe With Us
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Safety is Our{" "}
              <span className="text-accent-teal">Top Priority</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Every SkillFleet workshop is built on a foundation of rigorous safety standards so
              parents can rest easy and students can focus on learning.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {safetyPoints.map((point, i) => (
              <motion.div
                key={point}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={featureRowVariants}
                className="clay-card p-5 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-accent-teal" />
                </div>
                <p className="text-foreground font-medium text-sm leading-relaxed">{point}</p>
              </motion.div>
            ))}

            {/* Final card spanning */}
            <motion.div
              custom={safetyPoints.length}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={featureRowVariants}
              className="clay-card p-5 flex items-center gap-4 md:col-span-2"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-yellow/15 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-accent-yellow" />
              </div>
              <p className="text-foreground font-medium text-sm leading-relaxed">
                All instructors undergo background verification and child-safety certification before joining the SkillFleet team
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* Doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[8%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-8 h-8 text-accent-pink/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, 360] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-8 right-[10%] hidden md:block pointer-events-none"
        >
          <GearDoodle className="w-12 h-12 text-primary/8" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-12 left-[20%] hidden lg:block pointer-events-none"
        >
          <MusicNoteDoodle className="w-7 h-7 text-accent-purple/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute bottom-10 right-[12%] hidden lg:block pointer-events-none"
        >
          <PaintbrushDoodle className="w-8 h-8 text-accent-pink/10" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-24 left-[40%] hidden xl:block pointer-events-none"
        >
          <StarDoodle className="w-5 h-5 text-accent-yellow/15" />
        </motion.div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
          >
            <div className="clay-card p-10 sm:p-14 relative overflow-hidden">
              {/* Card inner decoration */}
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-gradient-to-br from-primary/5 to-accent-pink/5 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-gradient-to-br from-accent-purple/5 to-accent-teal/5 blur-2xl" />

              <div className="relative z-10">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>

                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Ready to spark your child&apos;s{" "}
                  <span className="text-primary">next passion?</span>
                </h2>

                <p className="text-muted text-lg leading-relaxed mb-8 max-w-xl mx-auto">
                  Book a workshop today and give your child an experience they&apos;ll remember.
                  Spots fill up fast — reach out now to secure their place.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <WhatsAppCTA
                    label="Book a Workshop"
                    message="Hi, i'm interested to book a workshop!"
                  />
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap justify-center gap-4 mt-8 pt-8 border-t border-foreground/5">
                  {[
                    { icon: ShieldCheck, label: "Safe & Certified" },
                    { icon: Award, label: "Completion Certificate" },
                    { icon: Users, label: "Expert Instructors" },
                  ].map((badge) => (
                    <div key={badge.label} className="flex items-center gap-2 text-sm text-muted">
                      <badge.icon className="w-4 h-4 text-primary/60" />
                      <span>{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
