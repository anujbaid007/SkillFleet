"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import Image from "next/image";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";
import {
  Heart,
  Globe,
  Users,
  Building2,
  Gift,
  TrendingUp,
  Sparkles,
  MapPin,
  Trophy,
  Laptop,
  Bus,
  BookOpen,
  Quote,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Floating SVG doodles — warm charitable feel                        */
/* ------------------------------------------------------------------ */

function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function HandDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 6.5a2.5 2.5 0 00-2.5-2.5c-.28 0-.54.05-.79.13A2.5 2.5 0 0015.5 2c-.63 0-1.21.23-1.65.62A2.5 2.5 0 0011.5 2C10.12 2 9 3.12 9 4.5V12l-2.15-2.15a2.5 2.5 0 00-3.54 3.54L7.5 17.5v.01A4.99 4.99 0 0012.5 22h4a5 5 0 005-5V9a2.5 2.5 0 00-2.5-2.5z" />
    </svg>
  );
}

function GlobeDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
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

function SeedlingDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-11 5 1-2 .5-3.5 0-5z" />
    </svg>
  );
}

function SparkDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1L9.5 8.5 2 11l7.5 2.5L12 21l2.5-7.5L22 11l-7.5-2.5L12 1z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated Counter                                                    */
/* ------------------------------------------------------------------ */

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [displayValue, setDisplayValue] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [rounded]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animate(count, target, { duration: 2.2, ease: "easeOut" });
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [count, target]);

  return (
    <span ref={ref}>
      {displayValue}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const impactStats = [
  { icon: Users, value: 5000, suffix: "+", label: "Children Reached", color: "#14B8A6" },
  { icon: BookOpen, value: 200, suffix: "+", label: "Sponsored Workshops", color: "#9333EA" },
  { icon: MapPin, value: 50, suffix: "+", label: "Communities Impacted", color: "#EC4899" },
  { icon: Building2, value: 25, suffix: "+", label: "Corporate Sponsors", color: "#FBBF24" },
];

const programs = [
  {
    icon: Bus,
    title: "Exposure Trips",
    description:
      "Guided visits to science museums, tech companies, and cultural landmarks — giving children a window into worlds they've never seen.",
    color: "#14B8A6",
    bg: "from-teal-50 to-cyan-50",
    border: "border-teal-100",
  },
  {
    icon: Sparkles,
    title: "Skills-Based Workshops",
    description:
      "Hands-on sessions in robotics, art, coding, and sports training — building real skills alongside curiosity and confidence.",
    color: "#9333EA",
    bg: "from-purple-50 to-violet-50",
    border: "border-purple-100",
  },
  {
    icon: Trophy,
    title: "Competitions & Scholarships",
    description:
      "A platform for children to showcase their abilities, compete with peers, and win scholarships that open new doors.",
    color: "#EC4899",
    bg: "from-pink-50 to-rose-50",
    border: "border-pink-100",
  },
  {
    icon: Laptop,
    title: "Digital Learning",
    description:
      "Access to the SkillFleet Passport — a digital progress tracker that records achievements and inspires continued growth.",
    color: "#7447E1",
    bg: "from-indigo-50 to-violet-50",
    border: "border-indigo-100",
  },
];

const partnershipModels = [
  {
    icon: Gift,
    title: "Sponsor a Program",
    description:
      "Fund specific initiatives — trips to science parks, workshops in robotics, or competitions that spark ambition. Choose what resonates with your brand values.",
    color: "#14B8A6",
    gradient: "from-teal-500 to-cyan-500",
    highlight: "teal",
  },
  {
    icon: Building2,
    title: "Corporate Partnerships",
    description:
      "Align your CSR objectives with SkillFleet's mission. Co-brand programs, engage employees as mentors, and demonstrate social impact at scale.",
    color: "#7447E1",
    gradient: "from-violet-500 to-purple-600",
    highlight: "purple",
  },
  {
    icon: TrendingUp,
    title: "Direct Donations",
    description:
      "Support materials, transportation, and platform access for underprivileged children. Every rupee goes directly to children in need.",
    color: "#EC4899",
    gradient: "from-pink-500 to-rose-500",
    highlight: "pink",
  },
];

const successStories = [
  {
    quote:
      "SkillFleet's robotics workshop sparked a newfound passion in my son — he now wants to be an engineer.",
    source: "Principal, Tier-3 city",
    image: "/images/kids-learning.jpg",
    accent: "#14B8A6",
  },
  {
    quote:
      "The art and science workshops were unforgettable. Our students had never experienced anything like this.",
    source: "School in Rajasthan",
    image: "/images/kids-classroom.jpg",
    accent: "#9333EA",
  },
];

/* ------------------------------------------------------------------ */
/*  Spring transition helpers                                           */
/* ------------------------------------------------------------------ */

const spring = { type: "spring" as const, stiffness: 80, damping: 18 };
const springFast = { type: "spring" as const, stiffness: 120, damping: 20 };

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-40px" },
    transition: { ...spring, delay },
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export default function CSRInitiativesPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="CSR"
        highlight="Initiatives"
        subtitle="Bridge the gap — bringing real-world learning to underprivileged children across India"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Partners" },
          { label: "CSR Initiatives" },
        ]}
      />

      {/* ── Section 1: Intro ─────────────────────────────────────── */}
      <section className="py-20 sm:py-28 relative overflow-hidden bg-white">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 left-[6%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-10 h-10 text-pink-200" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-24 right-[8%] hidden md:block pointer-events-none"
        >
          <GlobeDoodle className="w-12 h-12 text-teal-200" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-20 left-[18%] hidden lg:block pointer-events-none"
        >
          <StarDoodle className="w-7 h-7 text-yellow-200" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-12 right-[14%] hidden lg:block pointer-events-none"
        >
          <SeedlingDoodle className="w-9 h-9 text-teal-200" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Text */}
            <motion.div {...fadeUp(0)}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium mb-6">
                <Heart className="w-4 h-4" /> Empowering Every Child
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight">
                Creating Opportunities for{" "}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #14B8A6, #9333EA)" }}>
                  Every Child
                </span>
              </h2>
              <p className="text-lg text-muted leading-relaxed mb-6">
                SkillFleet partners with schools, NGOs, and corporations to deliver hands-on
                experiences in technology, art, sports, and science to underprivileged children
                across India.
              </p>
              <p className="text-base text-muted leading-relaxed">
                We believe every child deserves the chance to discover their spark — regardless of
                geography, income, or circumstance. Through structured programs and corporate CSR
                partnerships, we bring the extraordinary within reach of every young learner.
              </p>
            </motion.div>

            {/* Images collage */}
            <motion.div
              {...fadeUp(0.12)}
              className="relative grid grid-cols-2 gap-4"
            >
              <div className="clay-card overflow-hidden rounded-2xl aspect-[4/3]">
                <Image
                  src="/images/kids-uniform.jpg"
                  alt="Children in school uniforms"
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="clay-card overflow-hidden rounded-2xl aspect-[4/3] mt-8">
                <Image
                  src="/images/kids-group.jpg"
                  alt="Group of children learning together"
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="clay-card overflow-hidden rounded-2xl aspect-[4/3]">
                <Image
                  src="/images/kids-learning.jpg"
                  alt="Children learning with technology"
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="clay-card overflow-hidden rounded-2xl aspect-[4/3] mt-8">
                <Image
                  src="/images/kids-classroom.jpg"
                  alt="Children in a classroom"
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 clay-card px-4 py-3 flex items-center gap-2 z-10"
              >
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">5,000+</p>
                  <p className="text-[10px] text-muted">Children impacted</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Impact Stats ──────────────────────────────── */}
      <section
        className="py-20 sm:py-28 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 40%, #9333EA 80%, #7C3AED 100%)",
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 right-[10%] hidden sm:block pointer-events-none"
        >
          <SparkDoodle className="w-8 h-8 text-white/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-16 left-[10%] hidden sm:block pointer-events-none"
        >
          <HeartDoodle className="w-9 h-9 text-white/15" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            {...fadeUp(0)}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Our Impact at a Glance
            </h2>
            <p className="text-lg text-white/70 max-w-xl mx-auto">
              Every number represents a child who discovered something extraordinary about themselves.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {impactStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ ...spring, delay: i * 0.1 }}
                whileHover={{ y: -6, transition: springFast }}
                className="clay-card p-6 sm:p-8 text-center"
                style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(255,255,255,0.15)", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)" }}
                >
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <div className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm text-white/70 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Programs for Underprivileged ──────────────── */}
      <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-20 right-[5%] hidden md:block pointer-events-none"
        >
          <HandDoodle className="w-10 h-10 text-purple-100" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-24 left-[5%] hidden md:block pointer-events-none"
        >
          <SeedlingDoodle className="w-9 h-9 text-teal-100" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium mb-6">
              <Globe className="w-4 h-4" /> What We Offer
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Programs for{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #9333EA, #EC4899)" }}>
                Underprivileged
              </span>{" "}
              Children
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              A holistic set of experiences designed to broaden horizons, build skills, and ignite
              lifelong curiosity.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {programs.map((prog, i) => (
              <motion.div
                key={prog.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...spring, delay: i * 0.1 }}
                whileHover={{ y: -6, transition: springFast }}
                className={`clay-card p-6 bg-gradient-to-br ${prog.bg} border ${prog.border} flex flex-col`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 flex-shrink-0"
                  style={{ background: `${prog.color}22` }}
                >
                  <prog.icon className="w-6 h-6" style={{ color: prog.color }} />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-3">
                  {prog.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{prog.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Partnership Models ────────────────────────── */}
      <section
        className="py-20 sm:py-28 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #F8FAFC 0%, #F3F0FF 50%, #F0FDFA 100%)" }}
      >
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 360] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-16 left-[8%] hidden md:block pointer-events-none"
        >
          <GlobeDoodle className="w-14 h-14 text-teal-200/60" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-20 right-[8%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-9 h-9 text-yellow-300/40" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium mb-6">
              <Building2 className="w-4 h-4" /> Partner With Us
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              How You Can{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #14B8A6, #7447E1)" }}>
                Make a Difference
              </span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Choose a partnership model that works for your organisation — every form of support
              creates lasting impact.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8">
            {partnershipModels.map((model, i) => (
              <motion.div
                key={model.title}
                initial={{ opacity: 0, y: 32, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...spring, delay: i * 0.12 }}
                whileHover={{ y: -8, transition: springFast }}
                className="clay-card p-8 flex flex-col"
              >
                {/* Gradient icon badge */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundImage: `linear-gradient(135deg, ${model.gradient.replace("from-", "").replace("to-", "")})` }}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${model.gradient} flex items-center justify-center`}
                  >
                    <model.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {model.title}
                </h3>
                <p className="text-muted leading-relaxed text-sm flex-1">{model.description}</p>
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <WhatsAppCTA
                    label="Get Started"
                    message={`Hi, I'm interested in the SkillFleet CSR '${model.title}' partnership!`}
                    variant="outline"
                    size="sm"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Success Stories ───────────────────────────── */}
      <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 left-[5%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-10 h-10 text-pink-100" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-16 right-[6%] hidden md:block pointer-events-none"
        >
          <SparkDoodle className="w-8 h-8 text-yellow-200" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> Real Stories
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Stories That{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #EC4899, #9333EA)" }}>
                Inspire
              </span>
            </h2>
            <p className="text-lg text-muted max-w-xl mx-auto">
              Hear from the educators who witnessed the transformation first-hand.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {successStories.map((story, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...spring, delay: i * 0.14 }}
                whileHover={{ y: -4, transition: springFast }}
                className="clay-card overflow-hidden"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={story.image}
                    alt={story.source}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  {/* Quote icon overlay */}
                  <div
                    className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `${story.accent}CC` }}
                  >
                    <Quote className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div
                    className="w-10 h-1 rounded-full mb-4"
                    style={{ background: story.accent }}
                  />
                  <blockquote className="text-foreground font-medium text-base leading-relaxed mb-4 italic">
                    &ldquo;{story.quote}&rdquo;
                  </blockquote>
                  <p className="text-sm font-semibold" style={{ color: story.accent }}>
                    — {story.source}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Final CTA ─────────────────────────────────── */}
      <section
        className="py-20 sm:py-28 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 40%, #7447E1 80%, #9333EA 100%)",
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 12, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 left-[8%] hidden sm:block pointer-events-none"
        >
          <HeartDoodle className="w-10 h-10 text-white/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 right-[12%] hidden sm:block pointer-events-none"
        >
          <GlobeDoodle className="w-12 h-12 text-white/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-16 left-[20%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-8 h-8 text-white/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-20 right-[20%] hidden md:block pointer-events-none"
        >
          <SeedlingDoodle className="w-9 h-9 text-white/12" />
        </motion.div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mx-auto mb-8 border border-white/20"
            style={{ boxShadow: "8px 8px 20px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.2)" }}
          >
            <Heart className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h2
            {...fadeUp(0.1)}
            className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Ready to Make a{" "}
            <span className="text-accent-yellow drop-shadow-lg">Difference?</span>
          </motion.h2>

          <motion.p
            {...fadeUp(0.2)}
            className="text-lg sm:text-xl text-white/75 mb-10 leading-relaxed max-w-xl mx-auto"
          >
            Join a growing network of CSR partners helping underprivileged children across India
            discover their potential through hands-on learning.
          </motion.p>

          <motion.div
            {...fadeUp(0.3)}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <WhatsAppCTA
              label="Partner With Us"
              message="Hi, i'm interested in SkillFleet CSR partnership!"
            />
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            {...fadeUp(0.4)}
            className="flex flex-wrap justify-center gap-6 mt-12 text-white/60 text-sm"
          >
            {["5,000+ Children Reached", "25+ Corporate Sponsors", "50+ Communities"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow inline-block" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
