"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  BrainCircuit,
  Sparkles,
  Users,
  Lightbulb,
  Target,
  Building2,
  Layers,
  Globe,
  CheckCircle2,
  Zap,
  Award,
  GraduationCap,
  Star,
  ShieldCheck,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Decorative SVG doodles                                             */
/* ------------------------------------------------------------------ */

function CircuitDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
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

function LightbulbDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
    </svg>
  );
}

function RocketDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
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

function ChartDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const workshopTypes = [
  {
    icon: Target,
    title: "AI Strategy Workshops",
    description: "Executive-level sessions on integrating AI into business strategy, decision-making, and competitive positioning",
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
  },
  {
    icon: Sparkles,
    title: "Generative AI Bootcamp",
    description: "Intensive hands-on training with ChatGPT, Copilot, Midjourney, and other generative AI tools for real workflows",
    color: "text-accent-pink",
    bg: "bg-accent-pink/8",
    border: "border-accent-pink/20",
  },
  {
    icon: Users,
    title: "Team Upskilling Programs",
    description: "Structured learning paths that bring entire departments up to speed on AI tools, prompting, and automation",
    color: "text-accent-purple",
    bg: "bg-accent-purple/8",
    border: "border-accent-purple/20",
  },
  {
    icon: Lightbulb,
    title: "Innovation Sprints",
    description: "Rapid prototyping sessions where teams ideate, build, and test AI-powered solutions to real business challenges",
    color: "text-accent-teal",
    bg: "bg-accent-teal/8",
    border: "border-accent-teal/20",
  },
  {
    icon: Layers,
    title: "Custom AI Curriculum",
    description: "Bespoke programs tailored to your industry, tech stack, and organizational maturity level",
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
  },
  {
    icon: BrainCircuit,
    title: "AI Ethics & Governance",
    description: "Workshops on responsible AI use, bias mitigation, data privacy, and building trustworthy AI systems",
    color: "text-accent-pink",
    bg: "bg-accent-pink/8",
    border: "border-accent-pink/20",
  },
  {
    icon: Globe,
    title: "Remote & Hybrid Delivery",
    description: "Flexible delivery options including on-site, virtual, and blended formats to suit distributed teams",
    color: "text-accent-teal",
    bg: "bg-accent-teal/8",
    border: "border-accent-teal/20",
  },
  {
    icon: TrendingUp,
    title: "ROI Measurement",
    description: "Post-workshop impact assessments with skill benchmarking and productivity metrics tracking",
    color: "text-accent-purple",
    bg: "bg-accent-purple/8",
    border: "border-accent-purple/20",
  },
];

const keyFeatures = [
  {
    icon: Zap,
    title: "Hands-on, Not Theoretical",
    description: "Every session is built around real-world exercises, live demos, and practical workflows your team can apply immediately.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: GraduationCap,
    title: "Industry Expert Trainers",
    description: "Workshops are facilitated by AI practitioners, data scientists, and certified professionals with real deployment experience.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Award,
    title: "Completion Certification",
    description: "Participants receive professional development certificates recognized for corporate L&D credits.",
    color: "text-accent-pink",
    bg: "bg-accent-pink/10",
  },
  {
    icon: Building2,
    title: "Industry-Specific Content",
    description: "Curriculum is customized to your sector — from healthcare and finance to retail, manufacturing, and education.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
  {
    icon: Briefcase,
    title: "For Every Team",
    description: "Designed for corporate teams, L&D departments, HR leaders, and innovation groups of all sizes.",
    color: "text-accent-teal",
    bg: "bg-accent-teal/10",
  },
];

const deliveryPoints = [
  "On-site workshops at your office or preferred venue",
  "Remote sessions via Zoom, Teams, or your platform of choice",
  "Hybrid programs combining in-person and virtual modules",
  "Multi-day boot camps with progressive skill-building tracks",
  "Post-workshop follow-up sessions and Q&A office hours",
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

export default function CorporateWorkshopsPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="Corporate &"
        highlight="AI Workshops"
        subtitle="Transform your workforce with hands-on AI training tailored to your industry and business goals"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Programs" },
          { label: "Corporate Workshops" },
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
          <LightbulbDoodle className="w-10 h-10 text-accent-yellow/12" />
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
          <CircuitDoodle className="w-8 h-8 text-primary/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-12 right-[15%] hidden lg:block pointer-events-none"
        >
          <RocketDoodle className="w-7 h-7 text-accent-purple/12" />
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
          <ChartDoodle className="w-8 h-8 text-primary/10" />
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
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5">
                <BrainCircuit className="w-4 h-4" />
                Corporate AI Training
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Empower Your Teams with{" "}
                <span className="text-primary">AI-Ready Skills</span>
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-6">
                SkillFleet&apos;s Corporate &amp; AI Workshops equip your organization with the
                practical AI knowledge and tools needed to stay competitive. From executive strategy
                sessions to hands-on team bootcamps, we design every workshop around your unique
                business context and goals.
              </p>
              <p className="text-muted leading-relaxed">
                Whether you need to upskill your engineering team on generative AI, train L&amp;D
                leaders on AI-powered learning, or run innovation sprints for product teams — we
                bring the expertise to your doorstep, on-site or remotely.
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
                      src="/images/corporate-workshop.webp"
                      alt="Corporate AI workshop training"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="clay-card overflow-hidden h-36 relative bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center">
                    <div className="text-center text-white p-6">
                      <div className="font-display text-5xl font-bold mb-1">50+</div>
                      <div className="text-white/80 text-sm font-medium">Teams Trained</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="clay-card overflow-hidden h-36 relative bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                    <div className="text-center text-white p-6">
                      <div className="font-display text-5xl font-bold mb-1">4.9</div>
                      <div className="text-white/80 text-sm font-medium">Avg. Rating</div>
                    </div>
                  </div>
                  <div className="clay-card overflow-hidden h-52 relative">
                    <Image
                      src="/images/corporate-ai.webp"
                      alt="AI training session for corporate teams"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
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
                  <div className="font-semibold text-foreground text-sm">Custom Curriculum</div>
                  <div className="text-xs text-muted">Tailored to your industry</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Workshop Types ───────────────────────────────────────────── */}
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
          <LightbulbDoodle className="w-8 h-8 text-accent-yellow/12" />
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
              <Sparkles className="w-4 h-4" />
              Workshop Formats
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Programs for{" "}
              <span className="text-accent-purple">Every Need</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              From executive strategy sessions to full-team bootcamps, our workshops cover the complete AI upskilling journey for your organization.
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
            {workshopTypes.map((topic) => (
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
          <CircuitDoodle className="w-10 h-10 text-primary/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-16 left-[6%] hidden lg:block pointer-events-none"
        >
          <RocketDoodle className="w-8 h-8 text-accent-purple/10" />
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
                  src="/images/corporate-ai.webp"
                  alt="Corporate AI training workshop in action"
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
                  <div className="text-xs text-muted">Professional credits</div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 clay-card px-4 py-3 flex items-center gap-2.5 z-10"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">On-site or Remote</div>
                  <div className="text-xs text-muted">Flexible delivery</div>
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
                  Why SkillFleet
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Built for{" "}
                  <span className="text-primary">Business Impact</span>
                </h2>
                <p className="text-muted leading-relaxed">
                  Our corporate workshops go beyond slides and theory. Every session is designed to
                  deliver measurable upskilling outcomes your team can apply from day one.
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

      {/* ── Delivery Options Section ─────────────────────────────────── */}
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
          <LightbulbDoodle className="w-9 h-9 text-accent-yellow/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-20 right-[18%] hidden lg:block pointer-events-none"
        >
          <ChartDoodle className="w-8 h-8 text-primary/8" />
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
              <Globe className="w-4 h-4" />
              Flexible Delivery
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              We Come to{" "}
              <span className="text-accent-teal">You</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Our workshops fit your schedule and setup. Choose the delivery format that works best
              for your team, whether they&apos;re in one office or spread across the globe.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {deliveryPoints.map((point, i) => (
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
                  <CheckCircle2 className="w-5 h-5 text-accent-teal" />
                </div>
                <p className="text-foreground font-medium text-sm leading-relaxed">{point}</p>
              </motion.div>
            ))}

            {/* Final card spanning */}
            <motion.div
              custom={deliveryPoints.length}
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
                All programs include pre-workshop assessments, custom materials, and post-session impact reports for your leadership team
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
          <LightbulbDoodle className="w-8 h-8 text-accent-yellow/15" />
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
          <RocketDoodle className="w-7 h-7 text-accent-purple/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute bottom-10 right-[12%] hidden lg:block pointer-events-none"
        >
          <CircuitDoodle className="w-8 h-8 text-primary/10" />
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
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <BrainCircuit className="w-8 h-8 text-white" />
                </div>

                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Ready to future-proof your{" "}
                  <span className="text-primary">team?</span>
                </h2>

                <p className="text-muted text-lg leading-relaxed mb-8 max-w-xl mx-auto">
                  Get in touch to discuss a custom AI workshop for your organization.
                  We&apos;ll design a program that fits your goals, timeline, and budget.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <WhatsAppCTA
                    label="Enquire Now"
                    message="Hi, I'm interested in SkillFleet's Corporate AI Workshops for my organization!"
                  />
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap justify-center gap-4 mt-8 pt-8 border-t border-foreground/5">
                  {[
                    { icon: ShieldCheck, label: "NDA & Confidential" },
                    { icon: Award, label: "Professional Certificate" },
                    { icon: Building2, label: "On-site or Remote" },
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
