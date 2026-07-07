"use client";

import React from "react";
import { motion } from "motion/react";

/* ---- SVG Doodle primitives ---- */

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

/* ---- Preset doodle arrangements ---- */

interface DoodleConfig {
  Component: React.FC<{ className?: string }>;
  position: string;
  size: string;
  color: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transition: any;
  hideBelow?: "sm" | "md" | "lg";
}

const presets: Record<string, DoodleConfig[]> = {
  programs: [
    {
      Component: StarDoodle,
      position: "top-8 right-[8%]",
      size: "w-6 h-6",
      color: "text-accent-yellow/20",
      animation: { y: [0, 8, 0], scale: [1, 1.15, 1] },
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      hideBelow: "md",
    },
    {
      Component: RocketDoodle,
      position: "bottom-12 left-[5%]",
      size: "w-7 h-7",
      color: "text-primary/10",
      animation: { y: [0, -14, 0], x: [0, 6, 0] },
      transition: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 },
      hideBelow: "lg",
    },
    {
      Component: HeartDoodle,
      position: "top-16 left-[6%]",
      size: "w-5 h-5",
      color: "text-accent-pink/15",
      animation: { y: [0, -10, 0], rotate: [0, 10, 0] },
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
      hideBelow: "md",
    },
  ],
  stats: [
    {
      Component: AtomDoodle,
      position: "top-10 left-[10%]",
      size: "w-10 h-10",
      color: "text-white/10",
      animation: { y: [0, 8, 0], rotate: [0, -360, -720] },
      transition: { duration: 20, repeat: Infinity, ease: "linear" },
      hideBelow: "md",
    },
    {
      Component: LightbulbDoodle,
      position: "bottom-10 right-[7%]",
      size: "w-6 h-6",
      color: "text-white/15",
      animation: { y: [0, -10, 0], rotate: [0, -8, 0] },
      transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 },
      hideBelow: "lg",
    },
  ],
  testimonials: [
    {
      Component: HeartDoodle,
      position: "top-12 right-[6%]",
      size: "w-7 h-7",
      color: "text-accent-pink/12",
      animation: { scale: [1, 1.2, 1], rotate: [0, -10, 0] },
      transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
      hideBelow: "md",
    },
    {
      Component: StarDoodle,
      position: "bottom-16 left-[4%]",
      size: "w-5 h-5",
      color: "text-accent-yellow/15",
      animation: { y: [0, 10, 0], scale: [1, 1.1, 1] },
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
      hideBelow: "lg",
    },
    {
      Component: PencilDoodle,
      position: "top-20 left-[8%]",
      size: "w-5 h-5",
      color: "text-primary/8",
      animation: { y: [0, -6, 0], rotate: [0, 15, 0] },
      transition: { duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 3 },
      hideBelow: "lg",
    },
  ],
  faq: [
    {
      Component: LightbulbDoodle,
      position: "top-10 right-[10%]",
      size: "w-7 h-7",
      color: "text-accent-yellow/15",
      animation: { y: [0, 10, 0], rotate: [0, -8, 0] },
      transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
      hideBelow: "md",
    },
    {
      Component: FormulaDoodle,
      position: "bottom-14 left-[6%]",
      size: "",
      color: "text-primary/8 text-lg font-bold",
      animation: { y: [0, -8, 0], rotate: [0, 5, -5, 0] },
      transition: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 },
      hideBelow: "md",
    },
  ],
  contact: [
    {
      Component: RocketDoodle,
      position: "top-12 right-[5%]",
      size: "w-6 h-6",
      color: "text-accent-teal/10",
      animation: { y: [0, -12, 0], x: [0, 6, 0] },
      transition: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 },
      hideBelow: "lg",
    },
    {
      Component: HeartDoodle,
      position: "bottom-16 left-[3%]",
      size: "w-5 h-5",
      color: "text-accent-pink/10",
      animation: { y: [0, -8, 0], rotate: [0, 10, 0] },
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
      hideBelow: "md",
    },
    {
      Component: StarDoodle,
      position: "top-20 left-[12%]",
      size: "w-5 h-5",
      color: "text-accent-yellow/12",
      animation: { scale: [1, 1.15, 1] },
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
      hideBelow: "lg",
    },
  ],
};

const hideMap = { sm: "hidden sm:block", md: "hidden md:block", lg: "hidden lg:block" };

export default function FloatingDoodles({ variant }: { variant: keyof typeof presets }) {
  const doodles = presets[variant];
  if (!doodles) return null;

  return (
    <>
      {doodles.map((d, i) => {
        const hide = d.hideBelow ? hideMap[d.hideBelow] : "";
        return (
          <motion.div
            key={i}
            animate={d.animation}
            transition={d.transition}
            className={`absolute ${d.position} ${hide} pointer-events-none`}
          >
            <d.Component className={`${d.size} ${d.color}`} />
          </motion.div>
        );
      })}
    </>
  );
}
