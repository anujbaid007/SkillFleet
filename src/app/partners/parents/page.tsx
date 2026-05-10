"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Heart,
  Star,
  Users,
  Shield,
  MapPin,
  Wrench,
  Trophy,
  BarChart3,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Decorative SVG Doodles — whimsical & warm                         */
/* ------------------------------------------------------------------ */

function TeddyDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">
      {/* ears */}
      <circle cx="10" cy="10" r="6" />
      <circle cx="30" cy="10" r="6" />
      {/* head */}
      <circle cx="20" cy="20" r="12" />
      {/* eyes */}
      <circle cx="16" cy="17" r="2" fill="white" />
      <circle cx="24" cy="17" r="2" fill="white" />
      <circle cx="16.8" cy="17.8" r="1" fill="#333" />
      <circle cx="24.8" cy="17.8" r="1" fill="#333" />
      {/* nose */}
      <ellipse cx="20" cy="22" rx="3" ry="2" fill="#c97b5e" />
      {/* smile */}
      <path d="M16 25 Q20 28 24 25" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SmileyDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="9" cy="10" r="1.5" fill="white" />
      <circle cx="15" cy="10" r="1.5" fill="white" />
      <path d="M8 14 Q12 18 16 14" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CrayonDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 36" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="12" height="22" rx="3" />
      <polygon points="6,26 18,26 12,36" />
      <rect x="6" y="4" width="12" height="6" rx="3" opacity="0.4" />
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

function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Spring animation helpers                                           */
/* ------------------------------------------------------------------ */

const spring = { type: "spring" as const, stiffness: 80, damping: 18 };
const springFast = { type: "spring" as const, stiffness: 120, damping: 20 };

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { ...spring, delay },
  };
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const programCategories = [
  {
    icon: MapPin,
    title: "Exposure Trips",
    description:
      "Off-campus adventures spanning tech facilities, science parks, cultural landmarks, and outdoor environments where learning leaps beyond classroom walls.",
    color: "bg-primary/10 text-primary",
    highlights: ["Tech Facilities", "Outdoor Environments", "Cultural Sites"],
    image: "/images/kids-playing.jpg",
  },
  {
    icon: Wrench,
    title: "Workshops",
    description:
      "Short-term, expert-led skill-building sessions in robotics, cooking, creative arts, coding, and more — sparking curiosity through hands-on practice.",
    color: "bg-accent-pink/10 text-accent-pink",
    highlights: ["Robotics", "Cooking", "Creative Arts"],
    image: "/images/kids-group.jpg",
  },
  {
    icon: Trophy,
    title: "Competitions",
    description:
      "Regional, national, and international contests where young talents compete, win scholarships, and earn recognition on the biggest stages.",
    color: "bg-accent-yellow/10 text-amber-600",
    highlights: ["Scholarships", "National Stage", "Global Contests"],
    image: "/images/kid-raising-hand.jpg",
  },
  {
    icon: Users,
    title: "Events",
    description:
      "Collaborative learning experiences and showcases — science fairs, innovation meets, and creative exhibitions celebrating every child's unique talent.",
    color: "bg-accent-teal/10 text-accent-teal",
    highlights: ["Science Fairs", "Showcases", "Team Challenges"],
    image: "/images/kids-learning.jpg",
  },
];

const benefits = [
  {
    icon: BarChart3,
    title: "Comprehensive Exploration",
    description:
      "A wide array of workshops and activities covering science, arts, sports, and technology — designed to match every child's unique interests.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Shield,
    title: "Personalized Tracking",
    description:
      "Real-time progress monitoring across physical fitness, creativity, and intellectual development so you always know how your child is growing.",
    color: "bg-accent-pink/10 text-accent-pink",
  },
  {
    icon: Star,
    title: "Achievement Recognition",
    description:
      "The SkillFleet Passport system rewards every milestone with badges, stickers, and certificates — celebrating progress that motivates children to aim higher.",
    color: "bg-accent-yellow/10 text-amber-600",
  },
  {
    icon: Heart,
    title: "Holistic Development",
    description:
      "Balanced physical and digital learning experiences that nurture the whole child — body, mind, and creative spirit.",
    color: "bg-accent-teal/10 text-accent-teal",
  },
];

const steps = [
  {
    number: "01",
    icon: Heart,
    title: "Discover Potential",
    description:
      "Create your child's profile and complete a fun assessment that maps their strengths, interests, and areas ready to bloom.",
    color: "text-accent-pink",
    bg: "bg-accent-pink/10",
    border: "border-accent-pink/20",
  },
  {
    number: "02",
    icon: Star,
    title: "Customize the Journey",
    description:
      "Select from workshops, trips, events, and competitions — then design an annual exposure plan tailored to your child's passions.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    number: "03",
    icon: Trophy,
    title: "Celebrate Achievements",
    description:
      "Track progress in real time and watch your child earn SkillFleet Passport recognition — badges, stickers, and proud moments.",
    color: "text-amber-500",
    bg: "bg-accent-yellow/10",
    border: "border-accent-yellow/30",
  },
];

const testimonials = [
  {
    quote:
      "Skills we never thought possible. The workshops are fun, engaging, and our son actually looks forward to every session!",
    name: "Anjali",
    role: "Parent",
    initials: "A",
    accent: "bg-accent-pink text-white",
  },
  {
    quote:
      "The Passport reward system keeps my daughter so motivated! She earns a new badge every week and proudly shows it to everyone.",
    name: "Priya",
    role: "Grade 4 Parent",
    initials: "P",
    accent: "bg-primary text-white",
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ParentsPage() {
  return (
    <SubpageLayout>
      {/* Banner */}
      <PageBanner
        title="For"
        highlight="Parents"
        subtitle="Unlock Your Child's Potential with SkillFleet"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Partners" },
          { label: "Parents" },
        ]}
      />

      {/* ── Intro ── */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-accent-pink/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[6%] hidden sm:block pointer-events-none"
        >
          <TeddyDoodle className="w-10 h-10 text-accent-pink/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-16 right-[8%] hidden sm:block pointer-events-none"
        >
          <HeartDoodle className="w-8 h-8 text-accent-pink/25" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-16 right-[12%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-7 h-7 text-accent-yellow/30" />
        </motion.div>
        <motion.div
          animate={{ rotate: [0, 20, -20, 0], y: [0, -6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-10 left-[14%] hidden md:block pointer-events-none"
        >
          <CrayonDoodle className="w-6 h-9 text-primary/20" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.span
              {...fadeUp(0)}
              className="inline-block px-4 py-1.5 rounded-full bg-accent-pink/10 text-accent-pink text-sm font-semibold mb-4"
            >
              Real-World Learning for Every Child
            </motion.span>
            <motion.h2
              {...fadeUp(0.08)}
              className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6"
            >
              Beyond{" "}
              <span className="text-primary">Traditional Academics</span>
            </motion.h2>
            <motion.p
              {...fadeUp(0.16)}
              className="text-lg sm:text-xl text-muted leading-relaxed"
            >
              Give your child real-world learning experiences that go far beyond
              textbooks and routine assignments. SkillFleet opens doors to
              hands-on exploration, discovery, and self-expression — nurturing
              confident, curious, and capable individuals ready for the world
              ahead.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ── Program Categories ── */}
      <section className="py-20 sm:py-28 relative bg-white/60">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 right-[5%] hidden lg:block pointer-events-none"
        >
          <SmileyDoodle className="w-9 h-9 text-accent-yellow/25" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-20 left-[4%] hidden lg:block pointer-events-none"
        >
          <HeartDoodle className="w-7 h-7 text-accent-pink/20" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/5 text-primary text-sm font-semibold mb-4">
              Program Categories
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Four Pillars of{" "}
              <span className="text-primary">Discovery</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Every child learns differently. Our four program categories ensure
              there's a perfect pathway for every young explorer.
            </p>
          </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {programCategories.map((prog, i) => (
              <motion.div
                key={prog.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ ...spring, delay: i * 0.1 }}
                whileHover={{ y: -6, transition: springFast }}
                className="clay-card relative overflow-hidden group cursor-pointer"
              >
                {/* Image strip */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={prog.image}
                    alt={prog.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                  {/* Icon badge */}
                  <div
                    className={`absolute bottom-4 left-6 w-12 h-12 rounded-2xl ${prog.color} flex items-center justify-center backdrop-blur-sm`}
                    style={{
                      boxShadow:
                        "4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.8)",
                    }}
                  >
                    <prog.icon className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-6 pt-4">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    {prog.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">
                    {prog.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {prog.highlights.map((tag) => (
                      <span
                        key={tag}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${prog.color} border border-current/10`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Benefits ── */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-pink/5 via-transparent to-primary/5 pointer-events-none" />

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute top-20 left-[3%] hidden sm:block pointer-events-none"
        >
          <StarDoodle className="w-8 h-8 text-accent-yellow/25" />
        </motion.div>
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-14 right-[6%] hidden md:block pointer-events-none"
        >
          <CrayonDoodle className="w-5 h-8 text-accent-pink/20" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-16 right-[4%] hidden sm:block pointer-events-none"
        >
          <TeddyDoodle className="w-10 h-10 text-primary/15" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent-pink/10 text-accent-pink text-sm font-semibold mb-4">
              Why Parents Choose SkillFleet
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Benefits That{" "}
              <span className="text-accent-pink">Make a Difference</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Everything we do is designed with one goal: helping your child
              flourish as a well-rounded, confident individual.
            </p>
          </motion.div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ ...spring, delay: i * 0.1 }}
                whileHover={{ y: -6, transition: springFast }}
                className="clay-card p-6 flex flex-col gap-4 group cursor-default"
              >
                <div
                  className={`w-12 h-12 rounded-2xl ${benefit.color} flex items-center justify-center shrink-0`}
                  style={{
                    boxShadow:
                      "4px 4px 10px rgba(0,0,0,0.06), -2px -2px 6px rgba(255,255,255,0.8)",
                  }}
                >
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 sm:py-28 relative bg-white/60 overflow-hidden">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-16 right-[7%] hidden sm:block pointer-events-none"
        >
          <SmileyDoodle className="w-8 h-8 text-accent-yellow/20" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.15, 1], y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-12 left-[5%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-9 h-9 text-accent-pink/20" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/5 text-primary text-sm font-semibold mb-4">
              How It Works
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Three Steps to Your Child's{" "}
              <span className="text-primary">Brightest Future</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Getting started is simple. We guide you every step of the way —
              from understanding your child's strengths to celebrating their wins.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-gradient-to-r from-accent-pink/30 via-primary/30 to-amber-400/30" />

            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ ...spring, delay: i * 0.15 }}
                className="clay-card p-8 flex flex-col items-center text-center relative"
              >
                {/* Step number badge */}
                <span
                  className={`absolute -top-3 -right-3 w-8 h-8 rounded-full ${step.bg} ${step.color} text-xs font-bold flex items-center justify-center border-2 ${step.border}`}
                >
                  {step.number}
                </span>

                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-3xl ${step.bg} flex items-center justify-center mb-5 relative z-10`}
                  style={{
                    boxShadow:
                      "6px 6px 14px rgba(0,0,0,0.06), -3px -3px 10px rgba(255,255,255,0.9)",
                  }}
                >
                  <step.icon className={`w-8 h-8 ${step.color}`} />
                </div>

                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent-pink/5 pointer-events-none" />

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-12 left-[5%] hidden sm:block pointer-events-none"
        >
          <StarDoodle className="w-7 h-7 text-accent-yellow/25" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-14 right-[6%] hidden sm:block pointer-events-none"
        >
          <HeartDoodle className="w-8 h-8 text-accent-pink/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-20 right-[15%] hidden lg:block pointer-events-none"
        >
          <TeddyDoodle className="w-9 h-9 text-primary/15" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent-yellow/20 text-amber-600 text-sm font-semibold mb-4">
              Parent Stories
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Heard from{" "}
              <span className="text-accent-pink">Happy Families</span>
            </h2>
          </motion.div>

          {/* Testimonial cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ ...spring, delay: i * 0.15 }}
                whileHover={{ y: -5, transition: springFast }}
                className="clay-card p-8 flex flex-col gap-6"
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, idx) => (
                    <StarDoodle key={idx} className="w-4 h-4 text-accent-yellow" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-foreground/80 leading-relaxed text-base">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 mt-auto">
                  <div
                    className={`w-10 h-10 rounded-full ${t.accent} flex items-center justify-center font-bold text-sm shrink-0`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        {/* Warm gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #7447E1 0%, #9333EA 45%, #EC4899 100%)",
          }}
        />
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/[0.03] blur-3xl" />

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[8%] hidden sm:block pointer-events-none"
        >
          <TeddyDoodle className="w-10 h-10 text-white/15" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-16 right-[10%] hidden sm:block pointer-events-none"
        >
          <HeartDoodle className="w-8 h-8 text-white/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-10 right-[8%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-7 h-7 text-accent-yellow/30" />
        </motion.div>
        <motion.div
          animate={{ rotate: [0, 20, -20, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-14 left-[12%] hidden md:block pointer-events-none"
        >
          <CrayonDoodle className="w-5 h-8 text-white/15" />
        </motion.div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring}
            className="flex justify-center mb-6"
          >
            <SmileyDoodle className="w-14 h-14 text-accent-yellow" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Ready to{" "}
            <span className="text-accent-yellow">Enroll Your Child?</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/80 mb-10 leading-relaxed"
          >
            Join thousands of families already unlocking their children's
            potential. One conversation is all it takes to get started.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.3 }}
          >
            <WhatsAppCTA
              label="Enroll Your Child"
              message="Hi, i'm interested to enroll my child in SkillFleet!"
            />
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
