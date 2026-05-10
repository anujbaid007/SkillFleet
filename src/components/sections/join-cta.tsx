"use client";

import React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JoinCTA() {
  return (
    <section className="relative h-[60vh] sm:h-[65vh] lg:h-[70vh] overflow-hidden">
      {/* Parallax image */}
      <div
        className="absolute inset-0 bg-fixed bg-top bg-cover"
        style={{ backgroundImage: "url('/images/skillfleet-students.png')" }}
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

      {/* Content pinned to bottom */}
      <div className="relative z-10 h-full flex items-end">
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
              className="text-white/60 text-sm sm:text-base font-medium tracking-widest uppercase mb-3"
            >
              Join the Movement
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.1 }}
              className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg mb-4"
            >
              Empowering Tomorrow&apos;s{" "}
              <span className="text-accent-yellow">Innovators Today</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.2 }}
              className="text-white/70 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8"
            >
              10,000+ students across 200+ schools — real-world exposure that
              sparks curiosity, builds confidence, and shapes futures.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.3 }}
            >
              <a
                href="https://wa.me/917508807490?text=Hi%2C%20i'm%20interested%20to%20know%20more%20about%20SkillFleet!"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="group">
                  Start Your Child&apos;s Journey
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
