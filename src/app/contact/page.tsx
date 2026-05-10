"use client";

import React from "react";
import { motion } from "motion/react";
import { Phone, Mail, MapPin, Clock, BookOpen, PenTool } from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";
import WhatsAppCTA from "@/components/ui/whatsapp-cta";

/* ------------------------------------------------------------------ */
/*  Decorative floating SVG doodles                                   */
/* ------------------------------------------------------------------ */

function PencilSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function StarSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function LightbulbSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
    </svg>
  );
}

function HeartSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact info data                                                  */
/* ------------------------------------------------------------------ */

const contactInfo = [
  {
    icon: Phone,
    title: "Phone",
    primary: "+91 8076314479",
    secondary: "Mon–Sat, 9AM–7PM IST",
    secondaryIcon: Clock,
    color: "bg-primary/10 text-primary",
    borderColor: "border-primary/20",
  },
  {
    icon: Mail,
    title: "Email",
    primary: "contact@skillfleet.org",
    secondary: "We reply within 24 hours",
    secondaryIcon: Clock,
    color: "bg-accent-purple/10 text-accent-purple",
    borderColor: "border-accent-purple/20",
  },
  {
    icon: MapPin,
    title: "Address",
    primary: "HQ27 The Headquarters",
    secondary: "Gurugram, Haryana 122009",
    secondaryIcon: null,
    color: "bg-accent-teal/10 text-accent-teal",
    borderColor: "border-accent-teal/20",
  },
];

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const springIn = (delay = 0) => ({
  type: "spring" as const,
  stiffness: 80,
  damping: 18,
  delay,
});

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 18,
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ContactPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="Contact"
        highlight="Us"
        subtitle="Register for Our Adventure — SkillFleet Passport connects students, schools, and parents"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <section className="relative overflow-hidden py-16 sm:py-20 bg-background">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 left-[3%] hidden md:block pointer-events-none"
        >
          <PencilSVG className="w-10 h-10 text-primary/10" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-24 right-[6%] hidden md:block pointer-events-none"
        >
          <StarSVG className="w-8 h-8 text-accent-yellow/20" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/3 left-[1%] hidden lg:block pointer-events-none"
        >
          <LightbulbSVG className="w-9 h-9 text-accent-yellow/18" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-32 left-[8%] hidden lg:block pointer-events-none"
        >
          <HeartSVG className="w-8 h-8 text-accent-pink/12" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-20 right-[5%] hidden md:block pointer-events-none"
        >
          <PencilSVG className="w-9 h-9 text-primary/8" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-2/3 right-[2%] hidden xl:block pointer-events-none"
        >
          <BookOpen className="w-10 h-10 text-accent-teal/12" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute top-1/2 right-[8%] hidden xl:block pointer-events-none"
        >
          <PenTool className="w-7 h-7 text-accent-purple/10" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, 20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-12 left-[45%] hidden lg:block pointer-events-none"
        >
          <StarSVG className="w-6 h-6 text-accent-yellow/15" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={springIn(0)}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Get In Touch
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Let&apos;s Start Your Child&apos;s{" "}
              <span className="text-primary">Adventure</span>
            </h2>
            <p className="mt-3 text-muted max-w-xl mx-auto">
              Reach out to register, ask questions, or partner with us — we&apos;d love to hear from you.
            </p>
          </motion.div>

          {/* ---- Contact info cards ---- */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14"
          >
            {contactInfo.map((info) => {
              const Icon = info.icon;
              const SecIcon = info.secondaryIcon;
              return (
                <motion.div
                  key={info.title}
                  variants={itemVariants}
                  className={`clay-card p-6 flex flex-col gap-3 border ${info.borderColor}`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${info.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                      {info.title}
                    </p>
                    <p className="font-display font-bold text-foreground text-base leading-snug">
                      {info.primary}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-muted text-sm">
                      {SecIcon && <SecIcon className="w-3.5 h-3.5 shrink-0" />}
                      <span>{info.secondary}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ---- Registration Form ---- */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={springIn(0.1)}
            className="clay-card p-8 sm:p-10 max-w-3xl mx-auto border border-primary/10"
          >
            {/* Form header */}
            <div className="mb-8">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Register for the{" "}
                <span className="text-primary">SkillFleet Passport</span>
              </h3>
              <p className="text-muted text-sm">
                Fill in the details below and we&apos;ll reach out within 24 hours to get your child started.
              </p>
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {/* Child's Full Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="child-name" className="text-sm font-semibold text-foreground">
                  Child&apos;s Full Name <span className="text-accent-pink">*</span>
                </label>
                <input
                  id="child-name"
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  className="w-full rounded-xl border border-foreground/10 bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition"
                />
              </div>

              {/* Guardian Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="guardian-name" className="text-sm font-semibold text-foreground">
                  Guardian Name <span className="text-accent-pink">*</span>
                </label>
                <input
                  id="guardian-name"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl border border-foreground/10 bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email Address <span className="text-accent-pink">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-foreground/10 bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-semibold text-foreground">
                  Phone Number <span className="text-accent-pink">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-foreground/10 bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition"
                />
              </div>

              {/* Child's Age */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="child-age" className="text-sm font-semibold text-foreground">
                  Child&apos;s Age Group
                </label>
                <select
                  id="child-age"
                  defaultValue=""
                  className="w-full rounded-xl border border-foreground/10 bg-surface px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select age range</option>
                  <option value="3-6">3 – 6 years</option>
                  <option value="7-10">7 – 10 years</option>
                  <option value="11-13">11 – 13 years</option>
                  <option value="14-17">14 – 17 years</option>
                </select>
              </div>

              {/* Grade Level */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="grade" className="text-sm font-semibold text-foreground">
                  Grade Level
                </label>
                <select
                  id="grade"
                  defaultValue=""
                  className="w-full rounded-xl border border-foreground/10 bg-surface px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select grade</option>
                  <option value="pre-k">Pre-K</option>
                  <option value="kindergarten">Kindergarten</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={`grade-${i + 1}`}>
                      Grade {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="message" className="text-sm font-semibold text-foreground">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="Tell us about your child's interests, any questions, or how you heard about us…"
                  className="w-full rounded-xl border border-foreground/10 bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition resize-none"
                />
              </div>

              {/* Submit via WhatsApp */}
              <div className="sm:col-span-2 pt-2">
                <WhatsAppCTA label="Send Message" className="w-full" />
              </div>
            </form>
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
