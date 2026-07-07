"use client";

import Image from "next/image";
import { motion } from "motion/react";
import {
  Calendar,
  Code2,
  Palette,
  Music,
  Lightbulb,
  Users,
  Award,
  Shield,
  Mic2,
  Trophy,
  Sparkles,
  Star,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Decorative floating SVG doodles                                    */
/* ------------------------------------------------------------------ */

function TrophyDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 2v2H5a1 1 0 00-1 1v3c0 2.21 1.79 4 4 4h.27A6.01 6.01 0 0011 14.93V17H9v2h6v-2h-2v-2.07A6.01 6.01 0 0015.73 12H16c2.21 0 4-1.79 4-4V5a1 1 0 00-1-1h-2V2H7zm9 2h2v3c0 1.1-.9 2-2 2h-.17A6.04 6.04 0 0016 8V4zm-9 0V8a6.04 6.04 0 00-.83 1H6a2 2 0 01-2-2V4h2z" />
    </svg>
  );
}

function MusicNoteDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
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

function SparklesDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1l1.5 4.5L18 7l-4.5 1.5L12 13l-1.5-4.5L6 7l4.5-1.5L12 1zm-6 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3zm9 0l.75 2.25L18 16l-2.25.75L15 19l-.75-2.25L12 16l2.25-.75L15 13z" />
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
/*  Shared spring config                                               */
/* ------------------------------------------------------------------ */

const spring = {
  type: "spring" as const,
  stiffness: 80,
  damping: 18,
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { ...spring, delay },
});

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const eventTypes = [
  {
    icon: Code2,
    title: "Tech & Coding Hackathons",
    description:
      "Build, code, and innovate. Students tackle real-world tech problems in time-bound challenges that sharpen problem-solving skills.",
    accent: "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
    iconBg: "bg-accent-teal/15",
    image: "/images/kids-classroom.jpg",
  },
  {
    icon: Palette,
    title: "Art & Design Showcases",
    description:
      "Express creativity through visual arts, digital design, and illustration. A stage for young artists to exhibit their finest work.",
    accent: "bg-accent-purple/10 text-accent-purple border-accent-purple/20",
    iconBg: "bg-accent-purple/15",
    image: "/images/kids-playing.jpg",
  },
  {
    icon: Music,
    title: "Music & Performing Arts",
    description:
      "Stage performances spanning music, dance, drama, and storytelling — building confidence and creative expression.",
    accent: "bg-accent-pink/10 text-accent-pink border-accent-pink/20",
    iconBg: "bg-accent-pink/15",
    image: "/images/kids-group.jpg",
  },
  {
    icon: Trophy,
    title: "Entrepreneurship Challenges",
    description:
      "Pitch ideas, plan businesses, and lead teams. Young entrepreneurs learn to think critically and present with impact.",
    accent: "bg-accent-yellow/10 text-amber-600 border-accent-yellow/30",
    iconBg: "bg-accent-yellow/20",
    image: "/images/kids-classroom.jpg",
  },
  {
    icon: Lightbulb,
    title: "Science & Innovation Exhibitions",
    description:
      "Experiment, discover, and present. Students showcase STEM projects and scientific thinking before judges and peers.",
    accent: "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
    iconBg: "bg-accent-teal/15",
    image: "/images/kids-playing.jpg",
  },
];

const coreFeatures = [
  {
    icon: Users,
    title: "Collaborative Learning",
    description:
      "Teams tackle real-world problems together, building communication, empathy, and shared ownership of outcomes.",
    color: "text-accent-teal",
    bg: "bg-accent-teal/10",
  },
  {
    icon: Mic2,
    title: "Expert Engagement",
    description:
      "Inspiring talks and Q&A sessions led by industry leaders who share journeys, insights, and career wisdom.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
  {
    icon: Award,
    title: "Competitive Opportunities",
    description:
      "Structured team challenges across coding, arts, and engineering with recognition and prizes for excellence.",
    color: "text-accent-pink",
    bg: "bg-accent-pink/10",
  },
  {
    icon: Calendar,
    title: "Community Access",
    description:
      "Members gain early access to future events, exclusive workshops, and a network of like-minded young learners.",
    color: "text-amber-500",
    bg: "bg-accent-yellow/10",
  },
];

const safetyPoints = [
  { icon: Shield, text: "Monitored and secure event venues" },
  { icon: Users, text: "Professional staff present throughout" },
  { icon: Calendar, text: "Dedicated event management teams" },
  { icon: Award, text: "On-site medical support at every event" },
];

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function EventsPage() {
  return (
    <SubpageLayout>
      {/* ---- Banner ---- */}
      <PageBanner
        title="Inspiring"
        highlight="Events"
        subtitle="Where students showcase talents, collaborate with peers, and engage in exciting learning"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Programs" },
          { label: "Events" },
        ]}
      />

      {/* ================================================================ */}
      {/*  Intro Section                                                   */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden py-20 sm:py-28 bg-background">
        {/* Decorative doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[5%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-9 h-9 text-accent-yellow/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="absolute top-16 right-[8%] hidden lg:block pointer-events-none"
        >
          <TrophyDoodle className="w-11 h-11 text-accent-teal/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-12 left-[20%] hidden lg:block pointer-events-none"
        >
          <MusicNoteDoodle className="w-8 h-8 text-accent-purple/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-8 right-[15%] hidden md:block pointer-events-none"
        >
          <SparklesDoodle className="w-10 h-10 text-accent-pink/12" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <motion.div {...fadeUp(0)}>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent-teal bg-accent-teal/10 px-4 py-1.5 rounded-full mb-5 border border-accent-teal/20">
                <Calendar className="w-3.5 h-3.5" />
                Nationwide Learning Gatherings
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Events That{" "}
                <span className="text-accent-teal">Spark Curiosity</span> and Build Community
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-6">
                SkillFleet hosts diverse learning events across the nation — vibrant gatherings
                where students connect with curious minds, share bold ideas, and get inspired by
                real-world challenges that matter.
              </p>
              <p className="text-muted leading-relaxed">
                From hackathons to performing arts showcases, every event is thoughtfully designed
                to celebrate student talent, spark collaboration, and open doors to new
                possibilities.
              </p>
            </motion.div>

            {/* Image collage */}
            <motion.div {...fadeUp(0.15)} className="relative">
              <div className="relative h-80 sm:h-96 rounded-3xl overflow-hidden clay-card">
                <Image
                  src="/images/kids-group.jpg"
                  alt="Students at a SkillFleet event"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              {/* floating badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-5 -left-5 clay-card px-5 py-3 flex items-center gap-3"
              >
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-display font-bold text-foreground text-sm">500+ Events</p>
                  <p className="text-xs text-muted">Hosted nationwide</p>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -top-4 -right-4 clay-card px-4 py-2.5 flex items-center gap-2"
              >
                <span className="text-lg">⭐</span>
                <p className="font-display font-bold text-foreground text-sm">Top-Rated</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  Event Types                                                     */}
      {/* ================================================================ */}
      <section className="relative py-20 sm:py-28 bg-gradient-to-b from-white to-slate-50/60">
        {/* floating doodles */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-12 right-[6%] hidden lg:block pointer-events-none"
        >
          <StarDoodle className="w-7 h-7 text-accent-yellow/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-16 left-[4%] hidden md:block pointer-events-none"
        >
          <LightbulbDoodle className="w-9 h-9 text-accent-purple/15" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Heading */}
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent-purple bg-accent-purple/10 px-4 py-1.5 rounded-full mb-4 border border-accent-purple/20">
              <Sparkles className="w-3.5 h-3.5" />
              Explore Our Event Types
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Something for <span className="text-accent-purple">Every Passion</span>
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Whether your child loves technology, art, music, business, or science — there is a
              SkillFleet event built just for them.
            </p>
          </motion.div>

          {/* Cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {eventTypes.map((event, i) => (
              <motion.div
                key={event.title}
                {...fadeUp(i * 0.08)}
                className="clay-card overflow-hidden group"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {/* Icon pill */}
                  <div
                    className={`absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm border text-xs font-semibold ${event.accent}`}
                  >
                    <event.icon className="w-3.5 h-3.5" />
                    Event
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className={`inline-flex p-2.5 rounded-xl mb-4 ${event.iconBg}`}>
                    <event.icon className={`w-5 h-5 ${event.accent.split(" ")[1]}`} />
                  </div>
                  <h3 className="font-display font-bold text-foreground text-lg mb-2">
                    {event.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{event.description}</p>
                </div>
              </motion.div>
            ))}

            {/* Spanning CTA card */}
            <motion.div
              {...fadeUp(eventTypes.length * 0.08)}
              className="clay-card p-8 flex flex-col items-center justify-center text-center sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-accent-teal/5 to-accent-purple/5"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-teal to-accent-purple flex items-center justify-center mb-5">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display font-bold text-foreground text-xl mb-3">
                Ready to Join?
              </h3>
              <p className="text-muted text-sm mb-6 leading-relaxed">
                Register now and secure your spot at the next SkillFleet event near you.
              </p>
              <WhatsAppCTA
                label="Register for Events"
                message="Hi, i'm interested in SkillFleet events!"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  Core Features                                                   */}
      {/* ================================================================ */}
      <section className="relative py-20 sm:py-28 bg-background overflow-hidden">
        {/* floating doodles */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-14 left-[7%] hidden md:block pointer-events-none"
        >
          <TrophyDoodle className="w-10 h-10 text-accent-yellow/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-10 right-[6%] hidden lg:block pointer-events-none"
        >
          <SparklesDoodle className="w-8 h-8 text-accent-pink/15" />
        </motion.div>
        <motion.div
          animate={{ rotate: [0, -360] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 right-[3%] hidden xl:block pointer-events-none"
        >
          <StarDoodle className="w-6 h-6 text-accent-teal/15" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Heading */}
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent-teal bg-accent-teal/10 px-4 py-1.5 rounded-full mb-4 border border-accent-teal/20">
              <Star className="w-3.5 h-3.5" />
              What Makes Our Events Special
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Built for <span className="text-accent-teal">Real Growth</span>
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Every SkillFleet event is engineered around four pillars that ensure students walk
              away with more than just a trophy.
            </p>
          </motion.div>

          {/* Features grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                {...fadeUp(i * 0.1)}
                className="clay-card p-7 flex flex-col items-start"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${feature.bg}`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-display font-bold text-foreground text-base mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Visual image strip */}
          <motion.div {...fadeUp(0.3)} className="mt-14 grid grid-cols-3 gap-4 rounded-3xl overflow-hidden">
            {["/images/kids-playing.jpg", "/images/kids-group.jpg", "/images/kids-classroom.jpg"].map(
              (src, i) => (
                <div key={src} className="relative aspect-video rounded-2xl overflow-hidden clay-card">
                  <Image
                    src={src}
                    alt={`SkillFleet event moment ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              )
            )}
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  Safety Section                                                  */}
      {/* ================================================================ */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-50/60 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image */}
            <motion.div {...fadeUp(0)} className="relative order-2 lg:order-1">
              <div className="relative h-80 sm:h-96 rounded-3xl overflow-hidden clay-card">
                <Image
                  src="/images/kids-playing.jpg"
                  alt="Safe and supervised SkillFleet events"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
              </div>
              {/* Safety badge */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-5 -right-5 clay-card px-5 py-3 flex items-center gap-3"
              >
                <Shield className="w-6 h-6 text-accent-teal" />
                <div>
                  <p className="font-display font-bold text-foreground text-sm">100% Safe</p>
                  <p className="text-xs text-muted">Every event, every time</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.div {...fadeUp(0.12)} className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent-teal bg-accent-teal/10 px-4 py-1.5 rounded-full mb-5 border border-accent-teal/20">
                <Shield className="w-3.5 h-3.5" />
                Safety First, Always
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Your Child&apos;s Safety Is Our{" "}
                <span className="text-accent-teal">Top Priority</span>
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-8">
                We take every precaution to ensure students feel safe, supported, and cared for at
                every SkillFleet event — so parents can relax while kids thrive.
              </p>

              <ul className="space-y-4">
                {safetyPoints.map((point, i) => (
                  <motion.li
                    key={point.text}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ ...spring, delay: i * 0.08 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center flex-shrink-0">
                      <point.icon className="w-5 h-5 text-accent-teal" />
                    </div>
                    <span className="text-foreground font-medium">{point.text}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  CTA Section                                                     */}
      {/* ================================================================ */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #7447E1 0%, #8B5CF6 40%, #14B8A6 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/[0.03] blur-3xl" />

        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -16, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[8%] hidden md:block pointer-events-none"
        >
          <TrophyDoodle className="w-10 h-10 text-white/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-16 right-[10%] hidden lg:block pointer-events-none"
        >
          <StarDoodle className="w-8 h-8 text-white/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-12 left-[25%] hidden lg:block pointer-events-none"
        >
          <MusicNoteDoodle className="w-7 h-7 text-white/10" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-16 right-[20%] hidden md:block pointer-events-none"
        >
          <SparklesDoodle className="w-9 h-9 text-white/10" />
        </motion.div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.05 }}
            className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/20"
          >
            <Calendar className="w-8 h-8 text-white" />
          </motion.div>

          <motion.h2
            {...fadeUp(0.1)}
            className="font-display text-3xl sm:text-4xl font-bold text-white mb-5"
          >
            Be Part of the Next Big Event
          </motion.h2>
          <motion.p
            {...fadeUp(0.18)}
            className="text-white/75 text-lg leading-relaxed mb-10"
          >
            Join thousands of students across the country who are learning, competing, and growing
            together at SkillFleet events. Your moment to shine starts here.
          </motion.p>

          <motion.div {...fadeUp(0.24)}>
            <WhatsAppCTA
              label="Register for Events"
              message="Hi, i'm interested in SkillFleet events!"
            />
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
