"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play } from "lucide-react";

const roles = [
  "Engineer",
  "Artist",
  "Scientist",
  "Chef",
  "Musician",
  "Architect",
  "Astronaut",
  "Innovator",
];

const roleColors = [
  "text-primary",
  "text-accent-pink",
  "text-accent-teal",
  "text-primary-light",
  "text-accent-purple",
  "text-primary-light",
  "text-accent-yellow",
  "text-accent-teal",
];

const springTransition = {
  type: "spring" as const,
  stiffness: 100,
  damping: 15,
  mass: 1,
};

export default function Hero() {
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % roles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-dvh flex items-center overflow-hidden pt-24 pb-12 sm:pt-20"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-background to-accent-purple/[0.03]" />
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Floating decorative blobs */}
      <motion.div
        animate={{ y: [0, -30, 0], x: [0, 15, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[12%] left-[3%] w-36 h-36 rounded-[40px] bg-primary/[0.06] border-[3px] border-white/50 hidden lg:block"
        style={{
          boxShadow:
            "8px 8px 24px rgba(0,0,0,0.06), -4px -4px 12px rgba(255,255,255,0.9), inset 0 2px 6px rgba(255,255,255,0.7)",
        }}
      />
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, -10, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[18%] right-[5%] w-24 h-24 rounded-[30px] bg-accent-pink/[0.07] border-[3px] border-white/50 hidden lg:block"
        style={{
          boxShadow:
            "6px 6px 18px rgba(0,0,0,0.06), -3px -3px 10px rgba(255,255,255,0.9), inset 0 2px 4px rgba(255,255,255,0.7)",
        }}
      />
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 10, -5, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[20%] left-[8%] w-20 h-20 rounded-[24px] bg-accent-purple/[0.06] border-[3px] border-white/50 hidden lg:block"
        style={{
          boxShadow:
            "6px 6px 16px rgba(0,0,0,0.05), -3px -3px 10px rgba(255,255,255,0.9), inset 0 1px 4px rgba(255,255,255,0.6)",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left — Text content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border-2 border-primary/10 mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                India&apos;s First Industrial Exposure Platform
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.2 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-5"
            >
              <span className="text-foreground">Inspiring Tomorrow&apos;s</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-accent-purple to-primary-light bg-clip-text text-transparent">
                Innovators Today
              </span>
            </motion.h1>

            {/* Animated role */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.3 }}
              className="text-lg sm:text-2xl lg:text-3xl font-display font-medium mb-6 min-h-[3rem] flex items-center justify-center lg:justify-start gap-2 sm:gap-3 flex-wrap"
            >
              <span className="text-muted">Your future</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={roleIndex}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                  transition={{ duration: 0.4 }}
                  className={`font-bold ${roleColors[roleIndex]}`}
                >
                  {roles[roleIndex]}
                </motion.span>
              </AnimatePresence>
              <span className="text-muted">starts here</span>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.4 }}
              className="text-lg text-muted max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              From factory floors to AI labs — we bring learning to life through
              real-world exposure for children aged 3-17.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4"
            >
              <Button size="lg" className="group">
                Start Your Child&apos;s Journey
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="group">
                <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Watch Video
              </Button>
            </motion.div>

            {/* Trust stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.7 }}
              className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-8"
            >
              {[
                { value: "10,000+", label: "Students Impacted" },
                { value: "200+", label: "Partner Schools" },
                { value: "50+", label: "Industry Partners" },
              ].map((stat, i) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="font-display text-2xl sm:text-3xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Mobile hero image (shown below text on small screens) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.6 }}
            className="lg:hidden relative w-full max-w-sm mx-auto"
          >
            <div
              className="relative aspect-[4/3] rounded-[24px] overflow-hidden border-[3px] border-white/70"
              style={{
                boxShadow:
                  "10px 10px 28px rgba(0,0,0,0.1), -5px -5px 14px rgba(255,255,255,0.9), inset 0 2px 4px rgba(255,255,255,0.5)",
              }}
            >
              <Image
                src="/images/kids-group.jpg"
                alt="Children learning together at SkillFleet"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 90vw, 400px"
                priority
              />
            </div>
          </motion.div>

          {/* Right — Image collage (desktop) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springTransition, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-[4/5] max-w-lg mx-auto">
              {/* Main hero image */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 right-0 w-[75%] h-[65%] rounded-[28px] overflow-hidden border-[4px] border-white/70 z-10"
                style={{
                  boxShadow:
                    "12px 12px 32px rgba(0,0,0,0.1), -6px -6px 16px rgba(255,255,255,0.9), inset 0 2px 6px rgba(255,255,255,0.5)",
                }}
              >
                <Image
                  src="/images/kids-group.jpg"
                  alt="Children learning together at SkillFleet"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 400px"
                  priority
                />
              </motion.div>

              {/* Secondary image */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[5%] left-0 w-[55%] h-[45%] rounded-[24px] overflow-hidden border-[4px] border-white/70 z-20"
                style={{
                  boxShadow:
                    "10px 10px 28px rgba(0,0,0,0.1), -5px -5px 14px rgba(255,255,255,0.9), inset 0 2px 4px rgba(255,255,255,0.5)",
                }}
              >
                <Image
                  src="/images/kids-classroom.jpg"
                  alt="Kids in classroom with teacher"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 280px"
                />
              </motion.div>

              {/* Floating stat card */}
              <motion.div
                animate={{ y: [0, -6, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-[55%] right-[-5%] z-30 clay-card px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-accent-teal" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-foreground text-lg leading-tight">
                      500+
                    </div>
                    <div className="text-xs text-muted">Workshops Done</div>
                  </div>
                </div>
              </motion.div>

              {/* Decorative circle accent */}
              <div className="absolute -top-4 left-[15%] w-20 h-20 rounded-full bg-accent-yellow/20 border-[3px] border-accent-yellow/30 -z-10" />
              <div className="absolute -bottom-2 right-[20%] w-14 h-14 rounded-full bg-accent-pink/15 border-[3px] border-accent-pink/20 -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
