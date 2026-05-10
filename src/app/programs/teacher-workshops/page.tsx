"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  BrainCircuit,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Zap,
  Award,
  Star,
  Users,
  ShieldCheck,
  School,
  Lightbulb,
  Settings,
  Laptop,
  Microscope,
  BadgeCheck,
  Handshake,
  Layers,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Decorative SVG doodles                                             */
/* ------------------------------------------------------------------ */

function BookDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
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

function CodeBracketDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
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

function ChalkboardDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const programOfferings = [
  {
    icon: BrainCircuit,
    title: "NEP 2020 AI Curriculum Training",
    description: "Comprehensive training for teachers on integrating AI and computational thinking into the NEP 2020 framework",
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
  },
  {
    icon: Laptop,
    title: "AI Lab Setup & Integration",
    description: "End-to-end support to establish fully functional AI and STEM labs in your school with training for faculty",
    color: "text-accent-pink",
    bg: "bg-accent-pink/8",
    border: "border-accent-pink/20",
  },
  {
    icon: Settings,
    title: "Teacher Upskilling in STEM & Robotics",
    description: "Intensive workshops on coding, robotics, IoT, and STEM pedagogy to equip educators with modern teaching skills",
    color: "text-accent-purple",
    bg: "bg-accent-purple/8",
    border: "border-accent-purple/20",
  },
  {
    icon: Handshake,
    title: "School Partnership Programs",
    description: "Long-term partnerships with schools for ongoing curriculum support, guest lectures, and co-branded events",
    color: "text-accent-teal",
    bg: "bg-accent-teal/8",
    border: "border-accent-teal/20",
  },
  {
    icon: Layers,
    title: "Train-the-Trainer Model",
    description: "Empower your teachers to become certified trainers who can independently deliver STEM and AI workshops",
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
  },
  {
    icon: BadgeCheck,
    title: "Teacher Certification Programs",
    description: "Industry-recognized certifications in AI, coding, and robotics pedagogy to boost teachers' professional profiles",
    color: "text-accent-pink",
    bg: "bg-accent-pink/8",
    border: "border-accent-pink/20",
  },
  {
    icon: Microscope,
    title: "STEM Curriculum Design",
    description: "Custom curriculum development aligned to CBSE, ICSE, and state board standards with hands-on project kits",
    color: "text-accent-purple",
    bg: "bg-accent-purple/8",
    border: "border-accent-purple/20",
  },
  {
    icon: BookOpen,
    title: "Digital Literacy Workshops",
    description: "Equip teachers with digital tools, online teaching platforms, and blended learning strategies for modern classrooms",
    color: "text-accent-teal",
    bg: "bg-accent-teal/8",
    border: "border-accent-teal/20",
  },
];

const keyBenefits = [
  {
    icon: Zap,
    title: "Practical, Hands-on Training",
    description: "Teachers don't just learn theory — they build projects, code programs, and work with real hardware during every session.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: GraduationCap,
    title: "NEP 2020 Aligned",
    description: "All programs are designed to align with the National Education Policy 2020, ensuring curriculum relevance and compliance.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Award,
    title: "Industry Certification",
    description: "Teachers receive recognized certifications that add value to their professional development and career growth.",
    color: "text-accent-pink",
    bg: "bg-accent-pink/10",
  },
  {
    icon: Star,
    title: "Ongoing Support",
    description: "Post-workshop access to resources, lesson plans, and a dedicated support channel for continuous learning.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
  {
    icon: Users,
    title: "Educator Community",
    description: "Join a growing network of forward-thinking educators exchanging ideas, resources, and best practices.",
    color: "text-accent-teal",
    bg: "bg-accent-teal/10",
  },
];

const partnershipHighlights = [
  "Customized programs tailored to your school's specific needs and board requirements",
  "Flexible scheduling — workshops during school hours, weekends, or vacations",
  "Dedicated program coordinator assigned to each partner school",
  "Quarterly progress reports and impact assessments",
  "Access to SkillFleet's resource library and digital teaching tools",
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

export default function TeacherWorkshopsPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="School &"
        highlight="Teacher Workshops"
        subtitle="Empowering educators with future-ready skills in AI, STEM, and modern pedagogy"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Programs" },
          { label: "Teacher Workshops" },
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
          <BookDoodle className="w-10 h-10 text-accent-pink/12" />
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
          <LightbulbDoodle className="w-8 h-8 text-accent-yellow/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-12 right-[15%] hidden lg:block pointer-events-none"
        >
          <ChalkboardDoodle className="w-7 h-7 text-accent-purple/12" />
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
                <School className="w-4 h-4" />
                Educator Empowerment
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Building the{" "}
                <span className="text-accent-pink">Future-Ready Educator</span>
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-6">
                SkillFleet partners with schools to upskill teachers in AI, STEM, robotics, and
                coding — preparing them to deliver 21st-century education with confidence. Our
                programs are aligned to NEP 2020 and designed for immediate classroom application.
              </p>
              <p className="text-muted leading-relaxed">
                Whether your school needs an AI lab setup, teacher certification, or a complete
                curriculum overhaul — SkillFleet provides end-to-end support with a proven
                train-the-trainer model that creates lasting impact.
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
                      alt="Teacher training workshop session"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="clay-card overflow-hidden h-36 relative">
                    <Image
                      src="/images/kids-classroom.jpg"
                      alt="Classroom learning environment"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="clay-card overflow-hidden h-36 relative">
                    <Image
                      src="/images/corporate-ai.webp"
                      alt="AI training for educators"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="clay-card overflow-hidden h-52 relative bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
                    <div className="text-center text-white p-6">
                      <div className="font-display text-5xl font-bold mb-1">50+</div>
                      <div className="text-white/80 text-sm font-medium">Schools Partnered</div>
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
                  <GraduationCap className="w-5 h-5 text-accent-yellow" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">NEP 2020</div>
                  <div className="text-xs text-muted">Curriculum aligned</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Program Offerings ────────────────────────────────────────── */}
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
          <BookDoodle className="w-8 h-8 text-accent-pink/12" />
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
              <Lightbulb className="w-4 h-4" />
              Our Programs
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Comprehensive{" "}
              <span className="text-accent-purple">Training Programs</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              From AI curriculum design to hands-on robotics training — we cover the full spectrum of modern education needs for schools and teachers.
            </p>
          </motion.div>

          {/* Programs grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {programOfferings.map((program) => (
              <motion.div
                key={program.title}
                variants={cardVariants}
                className="clay-card p-6 group cursor-default"
              >
                <div className={`w-12 h-12 rounded-2xl ${program.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <program.icon className={`w-6 h-6 ${program.color}`} />
                </div>
                <h3 className="font-display font-bold text-foreground text-base mb-2 leading-snug">
                  {program.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {program.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Key Benefits ─────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* Doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 right-[6%] hidden lg:block pointer-events-none"
        >
          <LightbulbDoodle className="w-10 h-10 text-accent-yellow/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-16 left-[6%] hidden lg:block pointer-events-none"
        >
          <ChalkboardDoodle className="w-8 h-8 text-accent-purple/10" />
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
                  alt="Teachers in a professional development session"
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
                  <div className="text-xs text-muted">Industry-recognized</div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 clay-card px-4 py-3 flex items-center gap-2.5 z-10"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <School className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Train-the-Trainer</div>
                  <div className="text-xs text-muted">Scalable impact</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Benefits list */}
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
                  Why Partner With Us
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Built for{" "}
                  <span className="text-primary">Lasting Impact</span>
                </h2>
                <p className="text-muted leading-relaxed">
                  Our teacher training programs go beyond one-off sessions — we create sustainable
                  skill development pathways that transform how your school delivers education.
                </p>
              </motion.div>

              <div className="space-y-5">
                {keyBenefits.map((benefit, i) => (
                  <motion.div
                    key={benefit.title}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={featureRowVariants}
                    className="flex items-start gap-4"
                  >
                    <div className={`w-11 h-11 rounded-2xl ${benefit.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                      <p className="text-muted text-sm leading-relaxed">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Partnership Highlights Section ───────────────────────────── */}
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
          <BookDoodle className="w-9 h-9 text-accent-pink/10" />
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
              <Handshake className="w-4 h-4" />
              School Partnerships
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              What Our Partnership{" "}
              <span className="text-accent-teal">Looks Like</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              We work closely with school leadership to design programs that fit your institution's
              vision, board requirements, and teacher development goals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {partnershipHighlights.map((point, i) => (
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
              custom={partnershipHighlights.length}
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
                All SkillFleet trainers are industry-certified professionals with classroom teaching experience and child-safety clearance
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
          <BookDoodle className="w-8 h-8 text-accent-pink/15" />
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
          <ChalkboardDoodle className="w-7 h-7 text-accent-purple/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute bottom-10 right-[12%] hidden lg:block pointer-events-none"
        >
          <LightbulbDoodle className="w-8 h-8 text-accent-yellow/10" />
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
                  <School className="w-8 h-8 text-white" />
                </div>

                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Ready to transform your{" "}
                  <span className="text-primary">school&apos;s teaching?</span>
                </h2>

                <p className="text-muted text-lg leading-relaxed mb-8 max-w-xl mx-auto">
                  Partner with SkillFleet to bring future-ready training to your teachers.
                  Let&apos;s discuss a program tailored to your school&apos;s needs.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <WhatsAppCTA
                    label="Partner With Us"
                    message="Hi, I'm interested in SkillFleet's teacher workshop programs for our school!"
                  />
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap justify-center gap-4 mt-8 pt-8 border-t border-foreground/5">
                  {[
                    { icon: ShieldCheck, label: "Certified Trainers" },
                    { icon: Award, label: "NEP 2020 Aligned" },
                    { icon: Users, label: "50+ School Partners" },
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
