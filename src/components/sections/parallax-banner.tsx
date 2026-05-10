"use client";

import React from "react";
import { motion } from "motion/react";

export default function ParallaxBanner() {
  return (
    <section className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden">
      {/* Parallax image */}
      <div
        className="absolute inset-0 bg-fixed bg-center bg-cover"
        style={{ backgroundImage: "url('/images/skillfleet-students.png')" }}
      />

      {/* Purple gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-accent-purple/40 to-primary/60" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center px-4 max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            className="text-white/70 text-sm sm:text-base font-medium tracking-widest uppercase mb-3"
          >
            Join the Movement
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg"
          >
            Empowering Tomorrow&apos;s
            <br />
            <span className="text-accent-yellow">Innovators Today</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.2 }}
            className="mt-4 text-white/80 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
          >
            10,000+ students across 200+ schools — real-world exposure that
            sparks curiosity, builds confidence, and shapes futures.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
