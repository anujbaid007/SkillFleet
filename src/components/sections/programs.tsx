"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import {
  MapPin,
  Wrench,
  CalendarDays,
  Trophy,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import FloatingDoodles from "@/components/ui/floating-doodles";

const programs = [
  {
    icon: MapPin,
    title: "Exposure Trips",
    href: "/programs/exposure-trips",
    description:
      "Immersive visits to science museums, tech hubs, factories, and cultural landmarks. Students see how textbook concepts come alive in the real world.",
    color: "bg-primary/10 text-primary",
    gradient: "from-primary/20 to-primary-light/10",
    highlights: ["Science Museums", "Tech Companies", "Manufacturing Units"],
    image: "/images/kids-uniform.jpg",
  },
  {
    icon: Wrench,
    title: "Workshops",
    href: "/programs/workshops",
    description:
      "Hands-on learning sessions covering robotics, coding, creative arts, and more. Expert-led workshops designed to spark curiosity and build practical skills.",
    color: "bg-accent-pink/10 text-accent-pink",
    gradient: "from-accent-pink/20 to-accent-yellow/10",
    highlights: ["Robotics & IoT", "Creative Arts", "Science Experiments"],
    image: "/images/kids-classroom.jpg",
  },
  {
    icon: CalendarDays,
    title: "Events",
    href: "/programs/events",
    description:
      "Collaborative innovation activities including hackathons, science fairs, and inter-school challenges that foster teamwork and creative problem-solving.",
    color: "bg-accent-teal/10 text-accent-teal",
    gradient: "from-accent-teal/20 to-accent-teal/5",
    highlights: ["Hackathons", "Science Fairs", "Innovation Meets"],
    image: "/images/kids-playing.jpg",
  },
  {
    icon: Trophy,
    title: "Competitions",
    href: "/programs/competitions",
    description:
      "National and regional competitions with scholarship opportunities. Students showcase talents, compete with peers, and earn recognition on a larger stage.",
    color: "bg-accent-purple/10 text-accent-purple",
    gradient: "from-accent-purple/20 to-accent-pink/10",
    highlights: ["Scholarships", "National Exposure", "Awards & Prizes"],
    image: "/images/kid-raising-hand.jpg",
  },
  {
    icon: Briefcase,
    title: "Internships",
    href: "/programs/internships",
    description:
      "Mentored, real-world work experiences at companies and startups. Older students shadow professionals, build a project, and get a first taste of a real career.",
    color: "bg-accent-yellow/10 text-accent-yellow",
    gradient: "from-accent-yellow/20 to-primary/10",
    highlights: ["Industry Mentors", "Hands-On Projects", "Experience Certificate"],
    image: "/images/kids-group.jpg",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 18,
      delay: i * 0.12,
    },
  }),
};

export default function Programs() {
  return (
    <section id="programs" className="py-14 sm:py-28 relative overflow-hidden">
      <FloatingDoodles variant="programs" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-center mb-8 sm:mb-16"
        >
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/5 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            Our Programs
          </span>
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-4">
            Five Pillars of{" "}
            <span className="text-primary">Real-World Learning</span>
          </h2>
          <p className="text-sm sm:text-lg text-muted max-w-2xl mx-auto">
            Beyond textbooks and classrooms — we bring learning to life through
            experiences that inspire, challenge, and transform.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
          {programs.map((program, index) => (
            <Link key={program.title} href={program.href}>
              <motion.div
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={cardVariants}
                whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                className="clay-card relative overflow-hidden group cursor-pointer h-full"
              >
                {/* Image strip */}
                <div className="relative h-24 sm:h-44 overflow-hidden">
                  <Image
                    src={program.image}
                    alt={program.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, 50vw"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent`} />
                  {/* Icon overlay */}
                  <div
                    className={`absolute bottom-2 left-3 sm:bottom-4 sm:left-6 w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${program.color} flex items-center justify-center backdrop-blur-sm`}
                    style={{
                      boxShadow:
                        "4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.8)",
                    }}
                  >
                    <program.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                </div>

                <div className="p-3 pt-2 sm:p-6 sm:pt-4">
                  {/* Title */}
                  <h3 className="font-display text-sm sm:text-xl font-bold text-foreground mb-1 sm:mb-2">
                    {program.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-muted leading-relaxed mb-2 sm:mb-4 line-clamp-3 sm:line-clamp-none">
                    {program.description}
                  </p>

                  {/* Highlights — hidden on mobile */}
                  <div className="hidden sm:flex flex-wrap gap-2 mb-4">
                    {program.highlights.map((h) => (
                      <span
                        key={h}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${program.color} border border-current/10`}
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                    <span>Learn More</span>
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
