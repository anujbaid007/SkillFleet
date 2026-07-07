"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Cute floating SVG doodles used across all sub-page banners        */
/* ------------------------------------------------------------------ */

function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
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

function FormulaDoodle({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true" style={{ fontFamily: "serif", fontStyle: "italic" }}>
      E=mc<sup>2</sup>
    </span>
  );
}

function LightbulbDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
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

/* ------------------------------------------------------------------ */
/*  Main PageBanner component                                          */
/* ------------------------------------------------------------------ */

interface PageBannerProps {
  title: string;
  highlight?: string;
  subtitle: string;
  breadcrumbs: { label: string; href?: string }[];
  accentColor?: string; // tailwind color class like "primary" | "accent-purple" | "accent-teal" etc.
}

const springTransition = {
  type: "spring" as const,
  stiffness: 80,
  damping: 18,
};

export default function PageBanner({
  title,
  highlight,
  subtitle,
  breadcrumbs,
  accentColor = "primary",
}: PageBannerProps) {
  return (
    <section
      className="relative overflow-hidden pt-28 sm:pt-32 pb-16 sm:pb-20"
      style={{
        background:
          "linear-gradient(135deg, #7447E1 0%, #8B5CF6 35%, #9333EA 65%, #7C3AED 100%)",
      }}
    >
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Gradient blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white/[0.03] blur-3xl" />

      {/* ---- Cute floating doodles ---- */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-[8%] hidden sm:block"
      >
        <HeartDoodle className="w-8 h-8 text-white/15" />
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0], rotate: [0, -360, -720] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-16 right-[12%] hidden sm:block"
      >
        <AtomDoodle className="w-12 h-12 text-white/10" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -18, 0], x: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-12 left-[15%] hidden md:block"
      >
        <RocketDoodle className="w-7 h-7 text-white/12 rotate-45" />
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-24 right-[30%] hidden lg:block"
      >
        <StarDoodle className="w-6 h-6 text-accent-yellow/30" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-16 right-[8%] hidden md:block"
      >
        <FormulaDoodle className="text-white/10 text-xl font-bold" />
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute top-32 left-[25%] hidden lg:block"
      >
        <LightbulbDoodle className="w-6 h-6 text-accent-yellow/25" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, 15, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-20 left-[40%] hidden sm:block"
      >
        <PencilDoodle className="w-5 h-5 text-white/10" />
      </motion.div>

      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute top-28 left-[55%] hidden lg:block"
      >
        <HeartDoodle className="w-5 h-5 text-accent-pink/20" />
      </motion.div>

      {/* ---- Content ---- */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Breadcrumbs */}
        <motion.nav
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="flex items-center justify-center gap-1.5 text-sm text-white/50 mb-6"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.label}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-white/80 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-white/80">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </motion.nav>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.2 }}
          className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
        >
          {title}{" "}
          {highlight && (
            <span className="text-accent-yellow drop-shadow-lg">{highlight}</span>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.3 }}
          className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed"
        >
          {subtitle}
        </motion.p>
      </div>
    </section>
  );
}
