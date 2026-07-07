"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  MapPin,
  Shield,
  Compass,
  Globe,
  Factory,
  Cpu,
  Palette,
  TreePine,
  Award,
  Users,
  Smartphone,
  HeartPulse,
  BookOpen,
  Star,
  CheckCircle,
  ArrowRight,
  Stamp,
  Layers,
  Landmark,
  Film,
  Wind,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Floating decorative SVG doodles                                    */
/* ------------------------------------------------------------------ */

function CompassDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="12,2 14.5,9.5 12,12 9.5,9.5" fill="currentColor" opacity="0.6" />
      <polygon points="12,22 9.5,14.5 12,12 14.5,14.5" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
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

function AtomDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
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

function StampDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 21v-2h2v-8c0-1.1.9-2 2-2h1V7c0-1.65 1.35-3 3-3s3 1.35 3 3v2h1c1.1 0 2 .9 2 2v8h2v2H3zM9 7v2h6V7a3 3 0 10-6 0z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const tripCategories = [
  {
    title: "Industrial Visits",
    description:
      "Go behind the scenes at real factories and tech companies. Students observe machinery, automation, and production processes that bring classroom concepts to life.",
    tags: ["Factory Operations", "Technology Hubs", "Behind-the-Scenes"],
    image: "/images/kids-uniform.jpg",
    icon: Factory,
    color: "bg-primary/10 text-primary",
    accent: "#7447E1",
  },
  {
    title: "Science & Technology",
    description:
      "Explore science museums, AI research labs, and robotics centers. Hands-on demos with cutting-edge equipment that sparks genuine curiosity and wonder.",
    tags: ["Science Museums", "AI Labs", "Robotics Centers"],
    image: "/images/kids-classroom.jpg",
    icon: Cpu,
    color: "bg-accent-teal/10 text-accent-teal",
    accent: "#14B8A6",
  },
  {
    title: "Cultural & Creative",
    description:
      "Immerse in art galleries, media production houses, and architecture firms. Students discover the creative industries and learn how ideas turn into impact.",
    tags: ["Art Galleries", "Media Houses", "Architecture Firms"],
    image: "/images/kids-group.jpg",
    icon: Palette,
    color: "bg-accent-pink/10 text-accent-pink",
    accent: "#EC4899",
  },
  {
    title: "Nature & Environment",
    description:
      "Connect with the natural world through eco-parks, sustainability centers, and working farms. Real-world environmental education beyond any textbook.",
    tags: ["Eco-Parks", "Sustainability Centers", "Farms"],
    image: "/images/kids-playing.jpg",
    icon: TreePine,
    color: "bg-green-500/10 text-green-600",
    accent: "#22C55E",
  },
];

const industries = [
  { icon: Factory, label: "Mechanical Engineering", color: "text-primary" },
  { icon: Cpu, label: "Robotics & Automation", color: "text-accent-teal" },
  { icon: Globe, label: "Artificial Intelligence", color: "text-accent-purple" },
  { icon: Wind, label: "Environmental Science", color: "text-green-600" },
  { icon: Palette, label: "Creative Arts", color: "text-accent-pink" },
  { icon: Smartphone, label: "Technology & Software", color: "text-blue-500" },
  { icon: Film, label: "Media & Film", color: "text-orange-500" },
  { icon: Landmark, label: "Architecture", color: "text-yellow-600" },
];

const benefits = [
  {
    icon: Award,
    title: "Certificates & Scholarships",
    description:
      "Every participant receives an official certificate of completion. Outstanding students are eligible for SkillFleet scholarships recognizing real-world learning.",
    color: "bg-primary/10 text-primary",
    bgGlow: "from-primary/5 to-transparent",
  },
  {
    icon: Users,
    title: "SkillFleet Community Membership",
    description:
      "Join a nationwide network of curious learners. Access exclusive workshops, events, and peer groups that extend the learning far beyond the trip.",
    color: "bg-accent-teal/10 text-accent-teal",
    bgGlow: "from-accent-teal/5 to-transparent",
  },
  {
    icon: Stamp,
    title: "Physical Exposure Passport",
    description:
      "Our most iconic reward — a beautifully designed physical passport. Each trip earns a unique collectible stamp, building a tangible record of exploration and growth.",
    color: "bg-accent-purple/10 text-accent-purple",
    bgGlow: "from-accent-purple/5 to-transparent",
  },
];

const safetyMeasures = [
  {
    icon: Users,
    title: "Trained Leaders",
    description:
      "Certified trip leaders manage groups with care and expertise, ensuring structure, safety, and an enriching experience throughout.",
    color: "text-primary",
  },
  {
    icon: HeartPulse,
    title: "Emergency Response",
    description:
      "Dedicated first-aid trained staff and on-call medical support are present on every trip, so parents can have peace of mind.",
    color: "text-accent-pink",
  },
  {
    icon: Smartphone,
    title: "GPS-Enabled ID Cards",
    description:
      "Every student carries a GPS-linked ID card giving parents real-time location tracking and instant notifications throughout the journey.",
    color: "text-accent-teal",
  },
  {
    icon: Shield,
    title: "Insurance Coverage",
    description:
      "All SkillFleet trips are fully insured. Comprehensive coverage protects every participant from departure to return.",
    color: "text-green-600",
  },
];

const howItWorks = [
  { step: "01", title: "Register", desc: "Sign up on SkillFleet and share your child's interests.", icon: BookOpen },
  { step: "02", title: "Choose Trip", desc: "Pick from a curated calendar of upcoming exposure trips.", icon: Compass },
  { step: "03", title: "Experience", desc: "Arrive, explore, and immerse in real-world environments.", icon: Globe },
  { step: "04", title: "Earn Stamp", desc: "Collect your unique Passport stamp and share your story.", icon: Stamp },
];

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 90,
      damping: 16,
      delay: i * 0.08,
    },
  }),
};

const slideLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 18,
      delay: i * 0.12,
    },
  }),
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function ExposureTripsPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="Exposure"
        highlight="Trips"
        subtitle="Explore Beyond Boundaries — Where Learning Meets the Real World"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Programs" },
          { label: "Exposure Trips" },
        ]}
      />

      {/* ---------------------------------------------------------------- */}
      {/* 1. Hero Description Section                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        {/* Decorative floaters */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 left-[5%] hidden sm:block pointer-events-none"
        >
          <CompassDoodle className="w-10 h-10 text-primary/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -360, -720] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-8 right-[8%] hidden sm:block pointer-events-none"
        >
          <AtomDoodle className="w-12 h-12 text-accent-teal/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-16 right-[15%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-7 h-7 text-accent-yellow/20" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute bottom-20 left-[20%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-6 h-6 text-accent-pink/15" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5">
                What Are Exposure Trips?
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Learning That Happens{" "}
                <span className="text-primary">Outside the Classroom</span>
              </h2>
              <p className="text-lg text-muted leading-relaxed mb-6">
                Exposure Trips are purposeful educational journeys where students step into
                the real world — experiencing industries, environments, and creative spaces
                that textbooks can only describe. Each trip is designed to spark curiosity,
                deepen understanding, and connect knowledge to living, breathing contexts.
              </p>
              <p className="text-base text-muted leading-relaxed mb-8">
                From factories running on robotics to lush eco-farms practicing sustainable
                agriculture, every destination is handpicked to expand a student's worldview
                and ignite a passion for lifelong learning.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Real-World Contexts", "Expert-Led Visits", "Hands-On Exploration"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 rounded-full bg-primary/5 text-primary text-sm font-medium border border-primary/10"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </motion.div>

            {/* Image collage */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={2}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="relative h-52 rounded-2xl overflow-hidden clay-card">
                  <Image
                    src="/images/kids-uniform.jpg"
                    alt="Students on an exposure trip"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="relative h-52 rounded-2xl overflow-hidden clay-card mt-8">
                  <Image
                    src="/images/kids-group.jpg"
                    alt="Group of students exploring"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="relative h-44 rounded-2xl overflow-hidden clay-card -mt-4">
                  <Image
                    src="/images/kids-playing.jpg"
                    alt="Kids learning by doing"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="relative h-44 rounded-2xl overflow-hidden clay-card mt-4">
                  <Image
                    src="/images/kids-classroom.jpg"
                    alt="Classroom to real world"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 clay-card p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted">Trips Conducted</p>
                  <p className="font-display text-lg font-bold text-foreground">200+ Visits</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Trip Categories                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-background to-primary/[0.02] relative overflow-hidden">
        {/* Decorative floaters */}
        <motion.div
          animate={{ y: [0, -16, 0], rotate: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-16 right-[5%] hidden lg:block pointer-events-none"
        >
          <RocketDoodle className="w-9 h-9 text-primary/10 rotate-45" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-24 left-[8%] hidden lg:block pointer-events-none"
        >
          <StarDoodle className="w-8 h-8 text-accent-yellow/15" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Trip Categories
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Choose Your{" "}
              <span className="text-primary">Adventure</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Four curated categories of immersive trips, each designed to open a different
              door to the real world.
            </p>
          </motion.div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {tripCategories.map((cat, index) => (
              <motion.div
                key={cat.title}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }}
                className="clay-card overflow-hidden group cursor-pointer"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                  {/* Icon badge */}
                  <div
                    className={`absolute bottom-4 left-6 w-11 h-11 rounded-2xl ${cat.color} flex items-center justify-center backdrop-blur-sm`}
                    style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.8)" }}
                  >
                    <cat.icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-6 pt-4">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">
                    {cat.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cat.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${cat.color} border border-current/10`}
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

      {/* ---------------------------------------------------------------- */}
      {/* 3. Industries Covered                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        {/* Decorative floaters */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-8 left-[12%] hidden md:block pointer-events-none"
        >
          <AtomDoodle className="w-14 h-14 text-primary/8" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-12 right-[10%] hidden md:block pointer-events-none"
        >
          <CompassDoodle className="w-10 h-10 text-accent-teal/10" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent-teal/10 text-accent-teal text-sm font-semibold mb-4">
              Industries We Explore
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Eight Worlds to{" "}
              <span className="text-accent-teal">Discover</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Our trips span a diverse range of industries — giving students exposure to
              career paths, sectors, and fields they may never have considered before.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
            {industries.map((industry, index) => (
              <motion.div
                key={industry.label}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={scaleIn}
                whileHover={{ y: -5, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }}
                className="clay-card p-6 flex flex-col items-center text-center gap-3 cursor-pointer group"
              >
                <div
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-background to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                  style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.06), -2px -2px 6px rgba(255,255,255,0.9)" }}
                >
                  <industry.icon className={`w-6 h-6 ${industry.color}`} />
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {industry.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 4. Key Benefits                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-primary/[0.02] to-background relative overflow-hidden">
        {/* Decorative floaters */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[6%] hidden lg:block pointer-events-none"
        >
          <StampDoodle className="w-9 h-9 text-accent-purple/10" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="absolute bottom-16 left-[5%] hidden md:block pointer-events-none"
        >
          <HeartDoodle className="w-7 h-7 text-accent-pink/12" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent-purple/10 text-accent-purple text-sm font-semibold mb-4">
              What You Get
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Benefits That Go{" "}
              <span className="text-accent-purple">Beyond the Trip</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Every SkillFleet Exposure Trip delivers lasting value — long after you return
              home.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }}
                className="clay-card p-8 relative overflow-hidden"
              >
                {/* Background glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.bgGlow} opacity-60`} />

                <div className="relative z-10">
                  <div
                    className={`w-14 h-14 rounded-2xl ${benefit.color} flex items-center justify-center mb-5`}
                    style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.8)" }}
                  >
                    <benefit.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-3">
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

      {/* ---------------------------------------------------------------- */}
      {/* 5. Safety Measures                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        {/* Decorative floaters */}
        <motion.div
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[10%] hidden lg:block pointer-events-none"
        >
          <RocketDoodle className="w-8 h-8 text-accent-teal/10 -rotate-45" />
        </motion.div>
        <motion.div
          animate={{ rotate: [0, 15, -15, 0], y: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-20 right-[8%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-6 h-6 text-accent-yellow/20" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Side */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-green-500/10 text-green-600 text-sm font-semibold mb-5">
                Safety First, Always
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5">
                Your Child&apos;s Safety is Our{" "}
                <span className="text-green-600">Top Priority</span>
              </h2>
              <p className="text-base text-muted leading-relaxed mb-8">
                We go above and beyond to ensure every trip is not just enriching but
                completely safe. Our multi-layered safety framework gives parents full
                confidence and peace of mind from start to finish.
              </p>

              <div className="space-y-4">
                {safetyMeasures.map((measure, index) => (
                  <motion.div
                    key={measure.title}
                    custom={index}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideLeft}
                    className="clay-card p-5 flex gap-4 items-start"
                  >
                    <div
                      className="w-11 h-11 rounded-xl bg-background flex items-center justify-center shrink-0"
                      style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.06), -2px -2px 6px rgba(255,255,255,0.9)" }}
                    >
                      <measure.icon className={`w-5 h-5 ${measure.color}`} />
                    </div>
                    <div>
                      <h4 className="font-display text-base font-bold text-foreground mb-1">
                        {measure.title}
                      </h4>
                      <p className="text-sm text-muted leading-relaxed">
                        {measure.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Visual Side */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={3}
              className="relative"
            >
              <div
                className="clay-card p-8 relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(116,71,225,0.04) 0%, rgba(20,184,166,0.04) 100%)",
                }}
              >
                {/* Shield icon large */}
                <div className="flex justify-center mb-8">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-28 h-28 rounded-full bg-green-500/10 flex items-center justify-center"
                    style={{ boxShadow: "8px 8px 20px rgba(34,197,94,0.12), -4px -4px 12px rgba(255,255,255,0.8)" }}
                  >
                    <Shield className="w-14 h-14 text-green-600" />
                  </motion.div>
                </div>

                <h3 className="font-display text-2xl font-bold text-center text-foreground mb-6">
                  100% Safety Committed
                </h3>

                <div className="space-y-3">
                  {[
                    "Background-verified trip leaders",
                    "Pre-trip safety briefing for all students",
                    "Parent consent & emergency contact collection",
                    "Venue risk assessments before every visit",
                    "24/7 parent communication hotline",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-sm text-muted">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -top-5 -right-5 clay-card p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-green-600 fill-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted">Safety Rating</p>
                  <p className="font-display text-lg font-bold text-foreground">5.0 / 5.0</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 6. How It Works                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-background to-primary/[0.03] relative overflow-hidden">
        {/* Decorative floaters */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-14 left-[6%] hidden lg:block pointer-events-none"
        >
          <HeartDoodle className="w-8 h-8 text-accent-pink/12" />
        </motion.div>
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-10 right-[7%] hidden md:block pointer-events-none"
        >
          <AtomDoodle className="w-12 h-12 text-accent-purple/8" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Simple 4-Step Process
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It{" "}
              <span className="text-primary">Works</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Getting started is easy. From sign-up to earning your first Passport stamp —
              here&apos;s the journey.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/20 via-accent-teal/20 to-accent-purple/20" />

            {howItWorks.map((step, index) => {
              const stepColors = [
                "bg-primary text-white",
                "bg-accent-teal text-white",
                "bg-accent-purple text-white",
                "bg-accent-pink text-white",
              ];
              return (
                <motion.div
                  key={step.step}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={scaleIn}
                  className="relative text-center"
                >
                  {/* Icon circle */}
                  <motion.div
                    whileHover={{ scale: 1.12, rotate: 6 }}
                    transition={{ type: "spring" as const, stiffness: 300, damping: 15 }}
                    className={`w-16 h-16 rounded-full ${stepColors[index]} flex items-center justify-center mx-auto mb-5 relative z-10`}
                    style={{
                      boxShadow:
                        "6px 6px 14px rgba(0,0,0,0.12), -3px -3px 8px rgba(255,255,255,0.6)",
                    }}
                  >
                    <step.icon className="w-7 h-7" />
                  </motion.div>

                  <div className="clay-card p-6">
                    <span className="text-xs font-bold text-muted uppercase tracking-widest">
                      Step {step.step}
                    </span>
                    <h3 className="font-display text-xl font-bold text-foreground mt-2 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                  </div>

                  {/* Arrow */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:flex absolute top-14 -right-3 z-20">
                      <ArrowRight className="w-5 h-5 text-muted/30" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 7. CTA Section                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        {/* Decorative floaters */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 left-[8%] hidden sm:block pointer-events-none"
        >
          <CompassDoodle className="w-10 h-10 text-white/20" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-16 right-[10%] hidden sm:block pointer-events-none"
        >
          <StarDoodle className="w-8 h-8 text-white/15" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-12 right-[20%] hidden md:block pointer-events-none"
        >
          <RocketDoodle className="w-7 h-7 text-white/12 rotate-12" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-16 left-[22%] hidden lg:block pointer-events-none"
        >
          <HeartDoodle className="w-6 h-6 text-white/10" />
        </motion.div>

        <div
          className="mx-4 sm:mx-6 lg:mx-8 max-w-5xl xl:max-w-6xl xl:mx-auto rounded-3xl relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #7447E1 0%, #8B5CF6 40%, #9333EA 70%, #14B8A6 100%)",
          }}
        >
          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* Glow blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/[0.04] blur-3xl" />

          <div className="relative z-10 py-16 px-8 sm:px-16 text-center">
            {/* Passport icon */}
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 mb-6"
              style={{ boxShadow: "4px 4px 16px rgba(0,0,0,0.15), -2px -2px 8px rgba(255,255,255,0.1)" }}
            >
              <Layers className="w-10 h-10 text-white" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring" as const, stiffness: 80, damping: 18 }}
              className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            >
              Get Your SkillFleet{" "}
              <span className="text-yellow-300">Passport Today</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring" as const, stiffness: 80, damping: 18, delay: 0.15 }}
              className="text-lg text-white/75 max-w-xl mx-auto mb-10 leading-relaxed"
            >
              Start your real-world learning journey. Register today and earn your first
              Exposure Trip stamp — one experience at a time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring" as const, stiffness: 80, damping: 16, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <WhatsAppCTA label="Get Your Passport Today" />
            </motion.div>

            {/* Social proof */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-sm text-white/50"
            >
              Trusted by 500+ students across 50+ schools
            </motion.p>
          </div>
        </div>
      </section>
    </SubpageLayout>
  );
}
