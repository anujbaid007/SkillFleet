"use client";

import React from "react";
import { motion } from "motion/react";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns";
import FloatingDoodles from "@/components/ui/floating-doodles";

const testimonials = [
  {
    text: "My son came back from the SkillFleet factory visit and couldn't stop talking about how robots are programmed. He's now building his own small projects at home. This platform opened a world we didn't know existed.",
    name: "Priya Sharma",
    role: "Parent of Grade 7 Student",
    rating: 5,
  },
  {
    text: "As a principal, I've seen many programs come and go. SkillFleet is different — their exposure trips genuinely changed how our students think about careers. The AI workshop was the highlight of our academic year.",
    name: "Dr. Rajesh Khanna",
    role: "Principal, DPS Gurugram",
    rating: 5,
  },
  {
    text: "The corporate AI workshop was eye-opening. Our marketing team now uses AI tools daily for content creation and analytics. The trainers made complex concepts accessible to non-technical team members.",
    name: "Anita Desai",
    role: "Head of L&D, TechCorp India",
    rating: 5,
  },
  {
    text: "My daughter won a scholarship through SkillFleet's national competition. The exposure she got at age 12 has already shaped her career aspirations. She now wants to study aerospace engineering.",
    name: "Vikram Mehta",
    role: "Parent of Grade 8 Student",
    rating: 5,
  },
  {
    text: "SkillFleet's workshops are perfectly aligned with NEP 2020 guidelines. The way they blend experiential learning with curriculum outcomes is exactly what Indian education needs right now.",
    name: "Sunita Verma",
    role: "Education Consultant",
    rating: 5,
  },
  {
    text: "My 5-year-old attended the Pre-K Nature Walk program. Watching her explain photosynthesis to her grandmother using leaves she collected was the most heartwarming moment. SkillFleet makes learning magical.",
    name: "Deepak Joshi",
    role: "Parent of Pre-K Student",
    rating: 5,
  },
  {
    text: "We partnered with SkillFleet for our CSR initiative. Their programs for underprivileged children are thoughtfully designed and genuinely impactful. The data they share on learning outcomes is impressive.",
    name: "Meera Kapoor",
    role: "CSR Director, InfoBridge",
    rating: 5,
  },
  {
    text: "The AI bootcamp SkillFleet conducted for our engineering team was the best training investment we made this year. Practical, hands-on, and immediately applicable to our projects.",
    name: "Arjun Nair",
    role: "CTO, DataWave Solutions",
    rating: 5,
  },
  {
    text: "Both my kids attend SkillFleet programs — the younger one loves the science experiments and the older one is now competing in national robotics challenges. Worth every penny.",
    name: "Nisha Agarwal",
    role: "Parent, Gurugram",
    rating: 5,
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export default function Testimonials() {
  return (
    <section className="py-14 sm:py-28 bg-gradient-to-b from-primary/[0.02] to-background relative overflow-hidden">
      <FloatingDoodles variant="testimonials" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-accent-pink/10 text-accent-pink text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            Testimonials
          </span>
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-4">
            Real People,{" "}
            <span className="text-accent-pink">Real Impact</span>
          </h2>
          <p className="text-sm sm:text-lg text-muted max-w-xl mx-auto">
            Hear from parents, educators, and corporate leaders who&apos;ve
            experienced the SkillFleet difference.
          </p>
        </motion.div>

        {/* Marquee Columns */}
        <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>
      </div>
    </section>
  );
}
