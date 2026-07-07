"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Rocket,
  Lightbulb,
  Users,
  Award,
  Globe,
  BookOpen,
  Heart,
  Target,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Inline decorative SVG doodles                                      */
/* ------------------------------------------------------------------ */

function StarDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function AtomDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function RocketDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C12 2 7 7 7 13c0 2 1 4 2 5l1-3h4l1 3c1-1 2-3 2-5 0-6-5-11-5-11zm0 11a2 2 0 110-4 2 2 0 010 4zM5 18s-1 2 0 3 3 0 3 0L7 19l-2-1zm14 0s1 2 0 3-3 0-3 0l1-2 2-1z" />
    </svg>
  );
}

function LightbulbDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 18,
      delay,
    },
  }),
};

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 70,
      damping: 18,
    },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 70,
      damping: 18,
    },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 18,
      delay: i * 0.1,
    },
  }),
};

/* ------------------------------------------------------------------ */
/*  Why SkillFleet data                                                 */
/* ------------------------------------------------------------------ */

const whyCards = [
  {
    icon: Globe,
    color: "bg-primary/10",
    iconColor: "text-primary",
    title: "India's First Industrial Exposure Platform",
    desc: "Giving students firsthand experience across future-defining sectors like AI, robotics, aerospace, and beyond — before they choose a career.",
  },
  {
    icon: BookOpen,
    color: "bg-accent-teal/10",
    iconColor: "text-accent-teal",
    title: "Phygital Learning Model",
    desc: "We blend immersive physical industry trips with powerful digital learning tools — creating an experience that sticks long after school ends.",
  },
  {
    icon: Award,
    color: "bg-accent-pink/10",
    iconColor: "text-accent-pink",
    title: "Beyond-Classroom Opportunities",
    desc: "From scholarships and industry certifications to competitions and a nationwide innovation community — we open doors most classrooms never see.",
  },
  {
    icon: Rocket,
    color: "bg-accent-yellow/10",
    iconColor: "text-accent-yellow",
    title: "Early Industry Exposure",
    desc: "Students explore future-focused fields spanning technology, creative arts, sustainability, and entrepreneurship — years before college applications.",
  },
];

/* ------------------------------------------------------------------ */
/*  Our Story timeline steps                                            */
/* ------------------------------------------------------------------ */

const storySteps = [
  {
    icon: Heart,
    label: "Born from a belief",
    text: "SkillFleet was founded on the conviction that every child deserves a peek behind the curtain — real industries, real professionals, real possibilities.",
  },
  {
    icon: Users,
    label: "Bridging the gap",
    text: "We bridge academics with real-world application through industry visits, hands-on workshops, and student competitions that reward curiosity.",
  },
  {
    icon: Target,
    label: "Fostering innovators",
    text: "Our programs deliberately nurture creativity and critical thinking — the skills no textbook can teach but every future employer seeks.",
  },
  {
    icon: Lightbulb,
    label: "Growing every day",
    text: "From a handful of pilot schools to a growing national network, SkillFleet continues expanding its reach — one inspired student at a time.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="About"
        highlight="SkillFleet"
        subtitle="Where Learning Transforms into Lifelong Impact"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About Us" }]}
      />

      {/* ============================================================ */}
      {/* 1. Opening — One Experience at a Time                        */}
      {/* ============================================================ */}
      <section className="py-20 sm:py-28 relative overflow-hidden bg-background">
        {/* Background doodles */}
        <StarDoodle className="absolute top-12 left-[6%] w-8 h-8 text-primary/8 hidden md:block" />
        <AtomDoodle className="absolute top-24 right-[8%] w-14 h-14 text-accent-purple/8 hidden lg:block" />
        <HeartDoodle className="absolute bottom-16 left-[20%] w-6 h-6 text-accent-pink/10 hidden md:block" />
        <RocketDoodle className="absolute bottom-12 right-[15%] w-8 h-8 text-primary/8 rotate-12 hidden lg:block" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            {/* Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeLeft}
            >
              <motion.span
                custom={0}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5 tracking-wide"
              >
                Our Philosophy
              </motion.span>
              <motion.h2
                custom={0.05}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight"
              >
                One Experience{" "}
                <span className="text-primary">at a Time</span>
              </motion.h2>
              <motion.p
                custom={0.12}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-muted text-lg leading-relaxed mb-5"
              >
                Students who participate in hands-on learning experiences don't
                just absorb information — they transform. They become
                <strong className="text-foreground"> innovators</strong>,{" "}
                <strong className="text-foreground">creators</strong>, and{" "}
                <strong className="text-foreground">leaders</strong> who carry
                those lessons into every corner of their lives.
              </motion.p>
              <motion.p
                custom={0.18}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-muted text-lg leading-relaxed"
              >
                That's why SkillFleet exists: to give India's next generation
                real exposure to the industries and opportunities that are
                actively shaping the future — and to make sure every child has
                the resources needed to thrive in the 21st century.
              </motion.p>
            </motion.div>

            {/* Image collage */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeRight}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden clay-card">
                  <Image
                    src="/images/kids-group.jpg"
                    alt="Students collaborating together"
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden clay-card mt-8">
                  <Image
                    src="/images/kids-classroom.jpg"
                    alt="Students in a classroom setting"
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              </div>
              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 clay-card px-5 py-3 flex items-center gap-2 whitespace-nowrap z-10"
              >
                <span className="text-2xl">🚀</span>
                <span className="font-display font-bold text-sm text-foreground">
                  10,000+ Students Inspired
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. Mission & Vision                                          */}
      {/* ============================================================ */}
      <section className="py-20 sm:py-28 relative overflow-hidden" style={{
        background: "linear-gradient(160deg, #F8FAFC 0%, #EDE9FE 50%, #F8FAFC 100%)",
      }}>
        {/* Background doodles */}
        <LightbulbDoodle className="absolute top-16 right-[10%] w-10 h-10 text-accent-yellow/15 hidden md:block" />
        <StarDoodle className="absolute bottom-20 left-[8%] w-7 h-7 text-primary/10 hidden md:block" />
        <AtomDoodle className="absolute bottom-10 right-[25%] w-12 h-12 text-accent-purple/8 hidden lg:block" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5 tracking-wide">
              What Drives Us
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
              Mission &{" "}
              <span className="text-primary">Vision</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mission */}
            <motion.div
              custom={0}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariant}
              className="clay-card p-8 relative overflow-hidden"
            >
              {/* Accent blob */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-4">
                Our Mission
              </h3>
              <p className="text-muted text-base leading-relaxed mb-4">
                To provide early, meaningful exposure to industries and
                opportunities that shape the future — ensuring every child,
                regardless of background, receives the resources, experiences,
                and support needed to truly thrive in the 21st century.
              </p>
              <ul className="space-y-2">
                {[
                  "Hands-on industry visits and workshops",
                  "Equitable access for all students",
                  "Future-skills at an early age",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary block" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Vision */}
            <motion.div
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariant}
              className="clay-card p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent-teal/5 blur-2xl" />
              <div className="w-14 h-14 rounded-2xl bg-accent-teal/10 flex items-center justify-center mb-5">
                <Rocket className="w-7 h-7 text-accent-teal" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                Our Vision
              </h3>
              <p className="text-sm font-semibold text-accent-teal mb-3 tracking-wide uppercase">
                Tomorrow's Innovators Today
              </p>
              <p className="text-muted text-base leading-relaxed mb-4">
                A world where every child — in every city, every town, every
                village — has the tools, the experiences, and the support to
                unlock their full potential and step confidently into the future
                they deserve.
              </p>
              <ul className="space-y-2">
                {[
                  "Nationwide reach across schools",
                  "Industry partnerships across 15+ sectors",
                  "Building India's innovation generation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-accent-teal/15 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-teal block" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. Why SkillFleet — 4 cards                                  */}
      {/* ============================================================ */}
      <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
        {/* Background doodles */}
        <RocketDoodle className="absolute top-14 left-[5%] w-9 h-9 text-primary/8 -rotate-12 hidden md:block" />
        <HeartDoodle className="absolute top-10 right-[6%] w-7 h-7 text-accent-pink/10 hidden md:block" />
        <StarDoodle className="absolute bottom-14 right-[10%] w-8 h-8 text-accent-yellow/12 hidden lg:block" />
        <LightbulbDoodle className="absolute bottom-20 left-[12%] w-8 h-8 text-primary/8 hidden md:block" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5 tracking-wide">
              The SkillFleet Difference
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Why{" "}
              <span className="text-primary">SkillFleet?</span>
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              We're not just another enrichment program. We're India's first
              industrial exposure platform, built from the ground up for the
              generation that will shape tomorrow.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {whyCards.map((card, i) => (
              <motion.div
                key={card.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={cardVariant}
                className="clay-card p-7 flex flex-col gap-4 group"
              >
                <div className={`w-13 h-13 rounded-2xl ${card.color} flex items-center justify-center self-start`}
                  style={{ width: 52, height: 52 }}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground leading-snug">
                  {card.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed flex-1">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. Our Story — with image                                     */}
      {/* ============================================================ */}
      <section className="py-20 sm:py-28 relative overflow-hidden" style={{
        background: "linear-gradient(160deg, #EDE9FE 0%, #F8FAFC 40%, #CCFBF1 100%)",
      }}>
        {/* Background doodles */}
        <AtomDoodle className="absolute top-20 left-[5%] w-14 h-14 text-primary/8 hidden lg:block" />
        <StarDoodle className="absolute top-16 right-[8%] w-7 h-7 text-accent-yellow/15 hidden md:block" />
        <HeartDoodle className="absolute bottom-16 right-[5%] w-8 h-8 text-accent-pink/10 hidden lg:block" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Image stack */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeLeft}
              className="relative order-2 lg:order-1"
            >
              <div className="relative aspect-square max-w-md mx-auto lg:mx-0">
                {/* Main image */}
                <div className="relative w-full h-full rounded-3xl overflow-hidden clay-card">
                  <Image
                    src="/images/kids-learning.jpg"
                    alt="Students engaged in hands-on learning"
                    fill
                    sizes="(max-width: 1024px) 80vw, 40vw"
                    className="object-cover"
                  />
                </div>
                {/* Secondary image inset */}
                <div className="absolute -bottom-6 -right-6 w-2/5 aspect-[3/4] rounded-2xl overflow-hidden clay-card border-4 border-background">
                  <Image
                    src="/images/kids-uniform.jpg"
                    alt="SkillFleet students ready to learn"
                    fill
                    sizes="20vw"
                    className="object-cover"
                  />
                </div>
                {/* Floating accent */}
                <motion.div
                  animate={{ rotate: [0, 6, -6, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-5 -left-5 w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg"
                >
                  <Heart className="w-7 h-7 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Story content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeRight}
              className="order-1 lg:order-2"
            >
              <motion.span
                custom={0}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5 tracking-wide"
              >
                Our Journey
              </motion.span>
              <motion.h2
                custom={0.05}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-8 leading-tight"
              >
                The Story Behind{" "}
                <span className="text-primary">SkillFleet</span>
              </motion.h2>

              <div className="space-y-6">
                {storySteps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    custom={i * 0.1}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="flex gap-4"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-foreground mb-1">
                        {step.label}
                      </p>
                      <p className="text-muted text-sm leading-relaxed">
                        {step.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. CTA                                                        */}
      {/* ============================================================ */}
      <section
        className="py-20 sm:py-28 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #7447E1 0%, #8B5CF6 35%, #9333EA 65%, #7C3AED 100%)",
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/[0.03] blur-3xl" />

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[8%] hidden sm:block"
        >
          <StarDoodle className="w-8 h-8 text-white/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-12 right-[10%] hidden md:block"
        >
          <HeartDoodle className="w-7 h-7 text-white/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 360, 720] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-12 right-[15%] hidden lg:block"
        >
          <AtomDoodle className="w-12 h-12 text-white/8" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -14, 0], x: [0, 6, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-16 left-[12%] hidden md:block"
        >
          <RocketDoodle className="w-8 h-8 text-white/10 rotate-45" />
        </motion.div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-3"
          >
            <span className="inline-block text-sm font-semibold text-white/60 bg-white/10 px-4 py-1.5 rounded-full tracking-wide">
              Ready to Begin?
            </span>
          </motion.div>
          <motion.h2
            custom={0.08}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight"
          >
            Your Child's Future{" "}
            <span className="text-accent-yellow">Starts Here</span>
          </motion.h2>
          <motion.p
            custom={0.15}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-white/70 text-lg mb-10 leading-relaxed"
          >
            Join thousands of students who are already exploring real industries,
            building real skills, and unlocking possibilities they never knew
            existed. The journey starts with a single conversation.
          </motion.p>
          <motion.div
            custom={0.22}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <WhatsAppCTA label="Start Learning Now" />
            <a
              href="/"
              className="text-white/70 hover:text-white transition-colors text-sm font-medium underline underline-offset-4"
            >
              Explore our programs
            </a>
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
