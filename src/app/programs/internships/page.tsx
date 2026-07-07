"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Briefcase,
  Code,
  Palette,
  LineChart,
  FlaskConical,
  Users,
  Award,
  Target,
  Compass,
  Lightbulb,
  Building2,
  FileText,
  CheckCircle,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Floating decorative SVG doodles                                    */
/* ------------------------------------------------------------------ */

function RocketDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C12 2 7 7 7 13c0 2 1 4 2 5l1-3h4l1 3c1-1 2-3 2-5 0-6-5-11-5-11zm0 11a2 2 0 110-4 2 2 0 010 4zM5 18s-1 2 0 3 3 0 3 0L7 19l-2-1zm14 0s1 2 0 3-3 0-3 0l1-2 2-1z" />
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

function BulbDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0012 3z" />
    </svg>
  );
}

function GearDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const tracks = [
  {
    title: "Technology & Software",
    description:
      "Shadow real engineers, ship a small feature, and see how apps and products are actually built. From coding basics to working alongside a product team.",
    tags: ["Coding Projects", "Product Teams", "Startups"],
    image: "/images/kids-classroom.jpg",
    icon: Code,
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Business & Entrepreneurship",
    description:
      "Step inside a growing company — marketing, operations, and strategy. Students learn how ideas become businesses and contribute to a live project.",
    tags: ["Marketing", "Operations", "Startups"],
    image: "/images/kids-group.jpg",
    icon: LineChart,
    color: "bg-accent-teal/10 text-accent-teal",
  },
  {
    title: "Design & Media",
    description:
      "Work with creative studios on branding, content, and digital media. Students build a real portfolio piece under the guidance of working designers.",
    tags: ["Branding", "Content", "Digital Media"],
    image: "/images/kids-playing.jpg",
    icon: Palette,
    color: "bg-accent-pink/10 text-accent-pink",
  },
  {
    title: "Science & Research",
    description:
      "Assist in labs and research settings — data, experiments, and discovery. A first, guided taste of how real scientific and R&D work happens.",
    tags: ["Labs", "Data & Research", "R&D"],
    image: "/images/kids-uniform.jpg",
    icon: FlaskConical,
    color: "bg-green-500/10 text-green-600",
  },
];

const benefits = [
  {
    icon: Users,
    title: "1:1 Industry Mentorship",
    description:
      "Every intern is paired with a working professional who guides them through real tasks, gives feedback, and shares how their field actually works.",
    color: "bg-primary/10 text-primary",
    bgGlow: "from-primary/5 to-transparent",
  },
  {
    icon: Award,
    title: "Experience Certificate",
    description:
      "Interns earn an official SkillFleet experience certificate and profile points — a verified head-start that stands out on future applications.",
    color: "bg-accent-teal/10 text-accent-teal",
    bgGlow: "from-accent-teal/5 to-transparent",
  },
  {
    icon: FileText,
    title: "A Real Portfolio Project",
    description:
      "Interns finish with something tangible — a project, product, or piece of work they built themselves — to show, share, and be proud of.",
    color: "bg-accent-purple/10 text-accent-purple",
    bgGlow: "from-accent-purple/5 to-transparent",
  },
];

const outcomes = [
  { icon: Target, label: "Career Discovery", color: "text-primary" },
  { icon: Briefcase, label: "Workplace Skills", color: "text-accent-teal" },
  { icon: Lightbulb, label: "Real Confidence", color: "text-accent-yellow" },
  { icon: Building2, label: "Industry Network", color: "text-accent-pink" },
];

const howItWorks = [
  { step: "01", title: "Apply", desc: "Share your interests and pick the fields you'd love to explore.", icon: GraduationCap },
  { step: "02", title: "Get Matched", desc: "We pair you with a partner company and a dedicated mentor.", icon: Compass },
  { step: "03", title: "Intern", desc: "Work on real tasks and a guided project over a short, structured term.", icon: Briefcase },
  { step: "04", title: "Showcase", desc: "Present your work, earn your certificate, and grow your profile.", icon: Award },
];

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 18, delay: i * 0.1 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 90, damping: 16, delay: i * 0.08 },
  }),
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function InternshipsPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="Student"
        highlight="Internships"
        subtitle="Real Work, Real Mentors — A First Step Into the World of Careers"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Programs" },
          { label: "Internships" },
        ]}
      />

      {/* ---------------------------------------------------------------- */}
      {/* 1. Hero Description Section                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 left-[5%] hidden sm:block pointer-events-none"
        >
          <RocketDoodle className="w-10 h-10 text-primary/10 rotate-12" />
        </motion.div>
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute top-8 right-[8%] hidden sm:block pointer-events-none"
        >
          <GearDoodle className="w-12 h-12 text-accent-teal/10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-16 right-[15%] hidden md:block pointer-events-none"
        >
          <StarDoodle className="w-7 h-7 text-accent-yellow/20" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5">
                What Are Student Internships?
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                A First Real Taste of a{" "}
                <span className="text-primary">Future Career</span>
              </h2>
              <p className="text-lg text-muted leading-relaxed mb-6">
                SkillFleet Internships are short, mentored, real-world work experiences at
                companies and startups — designed for older students ready to see what a career
                actually feels like. Interns don&apos;t just observe; they contribute to real
                projects alongside working professionals.
              </p>
              <p className="text-base text-muted leading-relaxed mb-8">
                Every placement is age-appropriate, safe, and structured — pairing a student with
                a dedicated mentor, a clear project, and the guidance to turn curiosity into
                genuine, career-shaping experience.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Mentor-Guided", "Real Projects", "Ages 13–17"].map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 rounded-full bg-primary/5 text-primary text-sm font-medium border border-primary/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Image collage */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative h-52 rounded-2xl overflow-hidden clay-card">
                  <Image src="/images/kids-classroom.jpg" alt="Student interning at a company" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                </div>
                <div className="relative h-52 rounded-2xl overflow-hidden clay-card mt-8">
                  <Image src="/images/kids-group.jpg" alt="Interns working together" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                </div>
                <div className="relative h-44 rounded-2xl overflow-hidden clay-card -mt-4">
                  <Image src="/images/kids-playing.jpg" alt="Hands-on project work" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                </div>
                <div className="relative h-44 rounded-2xl overflow-hidden clay-card mt-4">
                  <Image src="/images/kids-uniform.jpg" alt="Learning from a mentor" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 clay-card p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted">Interns Placed</p>
                  <p className="font-display text-lg font-bold text-foreground">100+ Students</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Internship Tracks                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-background to-primary/[0.02] relative overflow-hidden">
        <motion.div
          animate={{ y: [0, -16, 0], rotate: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-16 right-[5%] hidden lg:block pointer-events-none"
        >
          <BulbDoodle className="w-10 h-10 text-accent-yellow/20" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Internship Tracks
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Find Your{" "}
              <span className="text-primary">Field</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Four hands-on tracks across the industries students are most curious about — each
              built around real work and a real mentor.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {tracks.map((track, index) => (
              <motion.div
                key={track.title}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }}
                className="clay-card overflow-hidden group cursor-pointer"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={track.image}
                    alt={track.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                  <div
                    className={`absolute bottom-4 left-6 w-11 h-11 rounded-2xl ${track.color} flex items-center justify-center backdrop-blur-sm`}
                    style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.8)" }}
                  >
                    <track.icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-6 pt-4">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">{track.title}</h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">{track.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {track.tags.map((tag) => (
                      <span key={tag} className={`px-3 py-1 rounded-full text-xs font-medium ${track.color} border border-current/10`}>
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
      {/* 3. What You Get                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-primary/[0.02] to-background relative overflow-hidden">
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[6%] hidden lg:block pointer-events-none"
        >
          <StarDoodle className="w-9 h-9 text-accent-purple/12" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent-purple/10 text-accent-purple text-sm font-semibold mb-4">
              What You Get
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              More Than Just{" "}
              <span className="text-accent-purple">Work Experience</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Every internship is built to leave a student with something lasting — skills,
              proof, and a clearer sense of where they&apos;re headed.
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
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.bgGlow} opacity-60`} />
                <div className="relative z-10">
                  <div
                    className={`w-14 h-14 rounded-2xl ${benefit.color} flex items-center justify-center mb-5`}
                    style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.8)" }}
                  >
                    <benefit.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-3">{benefit.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Outcomes strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 mt-10">
            {outcomes.map((outcome, index) => (
              <motion.div
                key={outcome.label}
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
                  <outcome.icon className={`w-6 h-6 ${outcome.color}`} />
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug">{outcome.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 4. How It Works                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-background to-primary/[0.03] relative overflow-hidden">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-10 right-[7%] hidden md:block pointer-events-none"
        >
          <GearDoodle className="w-12 h-12 text-accent-purple/8" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Simple 4-Step Process
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It{" "}
              <span className="text-primary">Works</span>
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              From application to showcase — a clear, guided path into a first real work
              experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
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
                  <motion.div
                    whileHover={{ scale: 1.12, rotate: 6 }}
                    transition={{ type: "spring" as const, stiffness: 300, damping: 15 }}
                    className={`w-16 h-16 rounded-full ${stepColors[index]} flex items-center justify-center mx-auto mb-5 relative z-10`}
                    style={{ boxShadow: "6px 6px 14px rgba(0,0,0,0.12), -3px -3px 8px rgba(255,255,255,0.6)" }}
                  >
                    <step.icon className="w-7 h-7" />
                  </motion.div>

                  <div className="clay-card p-6">
                    <span className="text-xs font-bold text-muted uppercase tracking-widest">Step {step.step}</span>
                    <h3 className="font-display text-xl font-bold text-foreground mt-2 mb-2">{step.title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                  </div>

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
      {/* 5. Safety / Assurance                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="clay-card p-8 sm:p-10"
            style={{ background: "linear-gradient(135deg, rgba(116,71,225,0.04) 0%, rgba(20,184,166,0.04) 100%)" }}
          >
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1.5 rounded-full bg-green-500/10 text-green-600 text-sm font-semibold mb-4">
                Safe &amp; Supervised
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Structured for Students, Trusted by Parents
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {[
                "Vetted, background-checked partner companies",
                "A dedicated mentor supervising every intern",
                "Age-appropriate tasks and clear working hours",
                "Parent consent and regular progress updates",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm text-muted">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 6. CTA Section                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 left-[8%] hidden sm:block pointer-events-none"
        >
          <RocketDoodle className="w-10 h-10 text-white/20 rotate-12" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-16 right-[10%] hidden sm:block pointer-events-none"
        >
          <StarDoodle className="w-8 h-8 text-white/15" />
        </motion.div>

        <div
          className="mx-4 sm:mx-6 lg:mx-8 max-w-5xl xl:max-w-6xl xl:mx-auto rounded-3xl relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7447E1 0%, #8B5CF6 40%, #9333EA 70%, #14B8A6 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }}
          />
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/[0.04] blur-3xl" />

          <div className="relative z-10 py-16 px-8 sm:px-16 text-center">
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 mb-6"
              style={{ boxShadow: "4px 4px 16px rgba(0,0,0,0.15), -2px -2px 8px rgba(255,255,255,0.1)" }}
            >
              <Briefcase className="w-10 h-10 text-white" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring" as const, stiffness: 80, damping: 18 }}
              className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            >
              Start Your First{" "}
              <span className="text-yellow-300">Internship</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring" as const, stiffness: 80, damping: 18, delay: 0.15 }}
              className="text-lg text-white/75 max-w-xl mx-auto mb-10 leading-relaxed"
            >
              Give your child a real head-start. Apply today and match with a mentor and a
              company that fits their spark.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring" as const, stiffness: 80, damping: 16, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <WhatsAppCTA label="Apply for an Internship" />
            </motion.div>

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
