"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  School,
  GraduationCap,
  BarChart3,
  Award,
  BookOpen,
  Users,
  CheckCircle,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Spring transition preset                                           */
/* ------------------------------------------------------------------ */
const spring = { type: "spring" as const, stiffness: 80, damping: 18 };

/* ------------------------------------------------------------------ */
/*  Decorative school-themed SVG doodles                              */
/* ------------------------------------------------------------------ */

function BookDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 4H7a2 2 0 00-2 2v14a2 2 0 002 2h14v-2H7V8h14V4zm-7 7H8v-2h6v2zm4 4H8v-2h10v2z" />
    </svg>
  );
}

function GradCapDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18V17l7 4 7-4v-3.82l-7 3.82-7-3.82z" />
    </svg>
  );
}

function PencilDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function RulerDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.71 3.29l-1-1a1 1 0 00-1.41 0L4 17.59V20h2.41l15.3-15.29a1 1 0 000-1.42zM6 18H5v-1l8-8 1 1-8 8zm9.41-10L14 6.59 15.59 5 17 6.41 15.41 8z" />
    </svg>
  );
}

function AppleDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.08.05c-.22.16-2.15 1.26-2.13 3.75.03 2.99 2.63 3.99 2.66 4l-.09.38zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
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

const benefits = [
  {
    icon: GraduationCap,
    title: "NEP 2020 Alignment",
    description:
      "Nurture 21st-century competencies mandated by India's National Education Policy — creativity, critical problem-solving, and emotional intelligence — seamlessly integrated with your curriculum.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Intuitive school dashboards let administrators and teachers monitor every student's journey across non-academic activities — from IQ development to EQ milestones and fitness benchmarks.",
    color: "text-accent-teal",
    bg: "bg-accent-teal/10",
  },
  {
    icon: Award,
    title: "Institutional Reputation",
    description:
      "Differentiate your school with cutting-edge non-academic programs. Parents, educators, and communities will recognise your commitment to holistic, future-ready student development.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
];

const programs = [
  {
    icon: BookOpen,
    title: "Exposure Trips",
    description:
      "Curated real-world visits to museums, technology companies, science parks, and cultural heritage sites that bring classroom concepts to life.",
    tag: "Experiential Learning",
    tagColor: "bg-primary/10 text-primary",
    image: "/images/kids-classroom.jpg",
  },
  {
    icon: Users,
    title: "Workshops & Events",
    description:
      "Hands-on learning sessions in robotics, creative arts, coding, public speaking, and entrepreneurship — facilitated by industry experts.",
    tag: "Skill Building",
    tagColor: "bg-accent-teal/10 text-accent-teal",
    image: "/images/kids-learning.jpg",
  },
  {
    icon: Award,
    title: "Competitions & Scholarships",
    description:
      "Access to regional, national, and international opportunities that help students showcase talent, build confidence, and earn recognition.",
    tag: "Achievement",
    tagColor: "bg-accent-purple/10 text-accent-purple",
    image: "/images/kids-uniform.jpg",
  },
];

const steps = [
  {
    number: "01",
    title: "Signup",
    description: "Register your school and create detailed student profiles in minutes.",
    color: "text-primary",
    border: "border-primary/20",
    bg: "bg-primary/5",
  },
  {
    number: "02",
    title: "Plan Activities",
    description:
      "Use our AI recommendation engine to discover the perfect trips and workshops for your students.",
    color: "text-accent-teal",
    border: "border-accent-teal/20",
    bg: "bg-accent-teal/5",
  },
  {
    number: "03",
    title: "Track Growth",
    description:
      "Monitor IQ, EQ, creativity, and fitness development in real time on your school dashboard.",
    color: "text-accent-purple",
    border: "border-accent-purple/20",
    bg: "bg-accent-purple/5",
  },
  {
    number: "04",
    title: "Beyond Classroom",
    description:
      "Deliver genuinely holistic education — give every student rich non-academic exposure that shapes their future.",
    color: "text-accent-pink",
    border: "border-accent-pink/20",
    bg: "bg-accent-pink/5",
  },
];

const highlights = [
  "Aligned with NEP 2020 framework",
  "Dedicated school admin dashboard",
  "AI-powered activity recommendations",
  "Real-time student progress reports",
  "Access to 500+ verified activity providers",
  "Scholarship & competition database",
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function SchoolsPartnerPage() {
  return (
    <SubpageLayout>
      {/* Banner */}
      <PageBanner
        title="For"
        highlight="Schools"
        subtitle="Partner with SkillFleet to bring real-world learning to your students"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Partners" },
          { label: "Schools" },
        ]}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 1. Intro Section                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 left-[6%] hidden md:block opacity-10"
        >
          <BookDoodle className="w-14 h-14 text-primary" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-10 left-[20%] hidden md:block opacity-10"
        >
          <PencilDoodle className="w-10 h-10 text-accent-teal" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-16 right-[8%] hidden md:block opacity-10"
        >
          <GradCapDoodle className="w-16 h-16 text-accent-purple" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-16 right-[15%] hidden lg:block opacity-10"
        >
          <RulerDoodle className="w-10 h-10 text-primary" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute top-28 left-[45%] hidden lg:block opacity-10"
        >
          <AppleDoodle className="w-8 h-8 text-accent-pink" />
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <School className="w-4 h-4" />
                India's NEP 2020 Ready
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight">
                Bridging Academic and{" "}
                <span className="text-primary">Non-Academic Learning</span>
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-6">
                SkillFleet is a complete platform purpose-built for India's evolving education landscape.
                We bridge the gap between classroom learning and real-world experiences — delivering a
                holistic, NEP 2020-aligned environment where every student can discover their unique
                strengths and passions.
              </p>
              <p className="text-muted text-lg leading-relaxed mb-8">
                By partnering with SkillFleet, your school gains access to a curated ecosystem of
                exposure trips, skill workshops, competitions, and a powerful progress-tracking suite
                — all in one seamless platform built for educators.
              </p>

              {/* Highlights list */}
              <ul className="grid sm:grid-cols-2 gap-3">
                {highlights.map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...spring, delay: 0.2 + i * 0.07 }}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <CheckCircle className="w-4 h-4 text-accent-teal mt-0.5 shrink-0" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden clay-card">
                <Image
                  src="/images/kids-classroom.jpg"
                  alt="Students engaged in a classroom activity"
                  width={600}
                  height={440}
                  className="w-full h-[360px] sm:h-[440px] object-cover"
                />
                {/* Overlay badge */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-4 clay-card border-0 shadow-lg">
                    <p className="text-sm font-semibold text-foreground">
                      500+ schools across India
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      already transforming education with SkillFleet
                    </p>
                  </div>
                </div>
              </div>

              {/* Decorative blob */}
              <div className="absolute -z-10 -bottom-6 -right-6 w-64 h-64 rounded-full bg-primary/8 blur-2xl" />
              <div className="absolute -z-10 -top-6 -left-6 w-48 h-48 rounded-full bg-accent-teal/8 blur-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Key Benefits                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative py-20 sm:py-24 bg-gradient-to-br from-slate-50 to-purple-50/40">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute top-10 right-[6%] hidden md:block opacity-8"
        >
          <StarDoodle className="w-10 h-10 text-accent-yellow" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-12 left-[5%] hidden md:block opacity-8"
        >
          <AppleDoodle className="w-12 h-12 text-accent-pink" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why Schools Choose <span className="text-primary">SkillFleet</span>
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              A purpose-built partner for schools that believe education goes beyond the textbook.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: i * 0.12 }}
                className="clay-card p-8 flex flex-col"
              >
                <div className={`w-14 h-14 rounded-2xl ${benefit.bg} flex items-center justify-center mb-6`}>
                  <benefit.icon className={`w-7 h-7 ${benefit.color}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {benefit.title}
                </h3>
                <p className="text-muted leading-relaxed flex-1">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Programs for Schools                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -16, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-20 left-[4%] hidden md:block opacity-10"
        >
          <GradCapDoodle className="w-12 h-12 text-accent-purple" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          className="absolute bottom-10 right-[5%] hidden md:block opacity-10"
        >
          <BookDoodle className="w-14 h-14 text-primary" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Programs for <span className="text-accent-teal">Schools</span>
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Three pillars of real-world learning that complement every school's curriculum.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {programs.map((program, i) => (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: i * 0.12 }}
                className="clay-card overflow-hidden flex flex-col"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={program.image}
                    alt={program.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span
                    className={`absolute top-4 left-4 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm bg-white/90 ${program.tagColor}`}
                  >
                    {program.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <program.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {program.title}
                    </h3>
                  </div>
                  <p className="text-muted leading-relaxed flex-1">{program.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. How It Works                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative py-20 sm:py-24 bg-gradient-to-br from-purple-50/50 to-teal-50/30">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-14 right-[10%] hidden md:block opacity-10"
        >
          <PencilDoodle className="w-10 h-10 text-accent-teal" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-10 left-[8%] hidden md:block opacity-10"
        >
          <RulerDoodle className="w-12 h-12 text-primary" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It <span className="text-primary">Works</span>
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Getting started is simple. Your school can be live on SkillFleet in just four steps.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: i * 0.1 }}
                className={`clay-card p-7 ${step.bg} border ${step.border} relative`}
              >
                {/* Connector line for desktop */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 -right-3 w-6 h-0.5 bg-gradient-to-r from-slate-200 to-slate-100 z-10" />
                )}
                <span
                  className={`font-display text-4xl font-black ${step.color} opacity-20 block mb-3 leading-none`}
                >
                  {step.number}
                </span>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Testimonial                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[5%] hidden md:block opacity-10"
        >
          <StarDoodle className="w-10 h-10 text-accent-yellow" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-12 right-[6%] hidden md:block opacity-10"
        >
          <AppleDoodle className="w-12 h-12 text-accent-pink" />
        </motion.div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.1 }}
              className="relative"
            >
              <div className="clay-card rounded-3xl overflow-hidden">
                <Image
                  src="/images/kids-uniform.jpg"
                  alt="School students in uniform"
                  width={560}
                  height={420}
                  className="w-full h-[320px] sm:h-[400px] object-cover"
                />
              </div>
              <div className="absolute -z-10 -bottom-6 -left-6 w-56 h-56 rounded-full bg-accent-purple/8 blur-2xl" />
            </motion.div>

            {/* Quote */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
            >
              <div className="clay-card p-8 sm:p-10 relative">
                {/* Decorative quote mark */}
                <span
                  className="absolute -top-5 left-8 text-7xl text-primary/15 font-display font-black leading-none select-none"
                  aria-hidden="true"
                >
                  "
                </span>

                <p className="text-foreground text-lg sm:text-xl leading-relaxed font-medium mb-8 pt-4">
                  With SkillFleet, our students are more engaged and excited about learning. The
                  platform has revolutionized our approach to education — giving every child a chance
                  to shine beyond academics.
                </p>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground">School Principal</p>
                    <p className="text-sm text-muted">Delhi Public School</p>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex gap-1 mt-6">
                  {[...Array(5)].map((_, idx) => (
                    <StarDoodle key={idx} className="w-5 h-5 text-accent-yellow" />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 6. CTA Section                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #7447E1 0%, #8B5CF6 40%, #14B8A6 100%)",
          }}
        />
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/[0.05] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl" />

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 left-[8%] hidden md:block"
        >
          <BookDoodle className="w-12 h-12 text-white/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-12 right-[8%] hidden md:block"
        >
          <GradCapDoodle className="w-14 h-14 text-white/12" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-20 right-[20%] hidden lg:block"
        >
          <StarDoodle className="w-8 h-8 text-accent-yellow/30" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-16 left-[22%] hidden lg:block"
        >
          <PencilDoodle className="w-8 h-8 text-white/12" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring }}
          >
            <span className="inline-flex items-center gap-2 bg-white/15 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6">
              <School className="w-4 h-4" />
              Ready to Transform Your School?
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Let's Build the Future of{" "}
              <span className="text-accent-yellow">Education Together</span>
            </h2>
            <p className="text-white/75 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Join hundreds of forward-thinking schools across India already using SkillFleet to
              deliver holistic, NEP 2020-aligned education that prepares students for the real world.
            </p>
            <WhatsAppCTA
              label="Partner Your School"
              message="Hi, i'm interested in partnering our school with SkillFleet!"
            />
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
