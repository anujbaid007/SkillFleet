"use client";

import React from "react";
import { motion } from "motion/react";
import {
  UserPlus,
  Compass,
  Award,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign Up",
    description:
      "Register your child on SkillFleet. Share age, interests, and goals to personalize their journey.",
    color: "bg-primary text-white",
  },
  {
    icon: Compass,
    step: "02",
    title: "Explore & Participate",
    description:
      "Choose from trips, workshops, events, and competitions — each curated for maximum learning impact.",
    color: "bg-primary-light text-white",
  },
  {
    icon: Award,
    step: "03",
    title: "Earn Milestones",
    description:
      "Earn badges and milestones in the SkillFleet Passport — a living record of your child's growth.",
    color: "bg-accent-teal text-white",
  },
  {
    icon: BarChart3,
    step: "04",
    title: "Track Progress",
    description:
      "Parents and schools get insights into skill development, interests, and competencies built over time.",
    color: "bg-accent-purple text-white",
  },
];

const stepVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 16,
      delay: i * 0.15,
    },
  }),
};

export default function Passport() {
  return (
    <section
      id="about"
      className="py-14 sm:py-28 bg-gradient-to-b from-background to-primary/[0.02]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-center mb-8 sm:mb-16"
        >
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            SkillFleet Passport
          </span>
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-4">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-sm sm:text-lg text-muted max-w-2xl mx-auto">
            A simple 4-step journey that connects students, schools, and parents
            through meaningful learning milestones.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/20 via-primary-light/20 via-accent-teal/20 to-accent-purple/20" />

          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={stepVariants}
              className="relative text-center"
            >
              {/* Step number circle */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full ${step.color} flex items-center justify-center mx-auto mb-3 sm:mb-5 relative z-10`}
                style={{
                  boxShadow:
                    "6px 6px 14px rgba(0,0,0,0.12), -3px -3px 8px rgba(255,255,255,0.6)",
                }}
              >
                <step.icon className="w-5 h-5 sm:w-7 sm:h-7" />
              </motion.div>

              {/* Content */}
              <div className="clay-card p-3 sm:p-6">
                <span className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-widest">
                  Step {step.step}
                </span>
                <h3 className="font-display text-sm sm:text-xl font-bold text-foreground mt-1 sm:mt-2 mb-1.5 sm:mb-3">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed line-clamp-4 sm:line-clamp-none">
                  {step.description}
                </p>
              </div>

              {/* Arrow (between cards on desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-14 -right-3 z-20">
                  <ArrowRight className="w-5 h-5 text-muted/30" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
