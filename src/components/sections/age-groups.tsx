"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Baby, BookOpen, Microscope, Rocket } from "lucide-react";

const ageGroups = [
  {
    icon: Baby,
    age: "3-6",
    label: "Pre-K & Kindergarten",
    color: "bg-accent-pink",
    lightColor: "bg-accent-pink/10 text-accent-pink",
    borderAccent: "border-accent-pink/20",
    description:
      "Curiosity-driven play experiences that build foundational skills. Sensory exploration, simple experiments, and creative storytelling.",
    activities: [
      "Sensory Science Kits",
      "Nature Walks",
      "Story-based Learning",
      "Color & Shape Exploration",
    ],
    image: "/images/kids-playing.jpg",
  },
  {
    icon: BookOpen,
    age: "7-10",
    label: "Elementary School",
    color: "bg-accent-yellow",
    lightColor: "bg-accent-yellow/10 text-accent-yellow",
    borderAccent: "border-accent-yellow/20",
    description:
      "Hands-on workshops and guided exploration trips. Children discover how things work through interactive, project-based learning.",
    activities: [
      "Robotics Basics",
      "Factory Visits",
      "Art & Design Labs",
      "Coding with Scratch",
    ],
    image: "/images/kids-classroom.jpg",
  },
  {
    icon: Microscope,
    age: "11-13",
    label: "Middle School",
    color: "bg-accent-teal",
    lightColor: "bg-accent-teal/10 text-accent-teal",
    borderAccent: "border-accent-teal/20",
    description:
      "Critical thinking and problem-solving programs. Students tackle real-world challenges, collaborate on projects, and explore STEM careers.",
    activities: [
      "AI & ML Intro",
      "Science Olympiads",
      "Innovation Challenges",
      "Career Shadowing",
    ],
    // Its own photo rather than the shared one: kid-raising-hand.jpg shows a
    // child of about five, which is two age bands below this card.
    image: "/images/students-middle-school.jpg",
  },
  {
    icon: Rocket,
    age: "14-17",
    label: "High School",
    color: "bg-accent-purple",
    lightColor: "bg-accent-purple/10 text-accent-purple",
    borderAccent: "border-accent-purple/20",
    description:
      "Career-focused programs with real industry exposure. Internship-style experiences, advanced projects, and college-prep workshops.",
    activities: [
      "Industry Internships",
      "Advanced AI Projects",
      "Startup Bootcamps",
      "Scholarship Prep",
    ],
    image: "/images/kids-learning.jpg",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 70,
      damping: 16,
      delay: i * 0.1,
    },
  }),
};

export default function AgeGroups() {
  return (
    <section id="age-groups" className="py-14 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-center mb-8 sm:mb-16"
        >
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-accent-teal/10 text-accent-teal text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            Age-Appropriate Learning
          </span>
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-4">
            Designed for{" "}
            <span className="text-accent-teal">Every Stage</span>
          </h2>
          <p className="text-sm sm:text-lg text-muted max-w-2xl mx-auto">
            Tailored programs for each developmental phase — because a 5-year-old
            and a 15-year-old learn very differently.
          </p>
        </motion.div>

        {/* Age group cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {ageGroups.map((group, index) => (
            <motion.div
              key={group.age}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className="clay-card overflow-hidden group cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-20 sm:h-36 overflow-hidden">
                <Image
                  src={group.image}
                  alt={group.label}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                {/* Age badge overlay */}
                <div
                  className={`absolute bottom-2 left-2 sm:bottom-3 sm:left-4 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full ${group.color} text-white text-[10px] sm:text-xs font-bold shadow-lg`}
                >
                  {group.age} yrs
                </div>
              </div>

              <div className="p-3 sm:p-5 text-center">
                {/* Icon */}
                <div
                  className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${group.lightColor} flex items-center justify-center mx-auto mb-2 sm:mb-3 -mt-7 sm:-mt-9 relative z-10 border-2 sm:border-[3px] border-white`}
                  style={{
                    boxShadow:
                      "4px 4px 10px rgba(0,0,0,0.06), -2px -2px 6px rgba(255,255,255,0.8)",
                  }}
                >
                  <group.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>

                {/* Label */}
                <h3 className="font-display text-xs sm:text-lg font-bold text-foreground mb-1 sm:mb-2">
                  {group.label}
                </h3>

                {/* Description */}
                <p className="text-[11px] sm:text-sm text-muted leading-relaxed mb-2 sm:mb-4 line-clamp-3 sm:line-clamp-none">
                  {group.description}
                </p>

                {/* Activities — hidden on mobile */}
                <div className="hidden sm:flex flex-wrap justify-center gap-1.5">
                  {group.activities.map((activity) => (
                    <span
                      key={activity}
                      className={`px-2.5 py-1 rounded-lg bg-background text-xs font-medium text-muted border ${group.borderAccent}`}
                    >
                      {activity}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
