"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  BrainCircuit,
  GraduationCap,
  Building2,
  Bot,
  Code2,
  Cpu,
  Lightbulb,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const schoolFeatures = [
  {
    icon: Bot,
    title: "Introduction to AI & ML",
    desc: "Age-appropriate AI concepts from chatbots to image recognition",
  },
  {
    icon: Code2,
    title: "Hands-on Coding",
    desc: "Python, Scratch, and visual programming for every skill level",
  },
  {
    icon: Lightbulb,
    title: "AI Project Building",
    desc: "Students build real AI projects — from idea to demo day",
  },
  {
    icon: GraduationCap,
    title: "Teacher Training",
    desc: "Equip educators with AI literacy and classroom integration tools",
  },
];

const corporateFeatures = [
  {
    icon: BrainCircuit,
    title: "AI Strategy Workshops",
    desc: "Help teams understand AI potential and identify use cases",
  },
  {
    icon: Cpu,
    title: "Generative AI Bootcamp",
    desc: "LLMs, prompt engineering, and AI-powered workflow automation",
  },
  {
    icon: Users,
    title: "Team Upskilling",
    desc: "Custom programs for engineering, sales, marketing, and leadership",
  },
  {
    icon: Building2,
    title: "Innovation Sprints",
    desc: "2-day sprints to prototype AI solutions for real business problems",
  },
];

const featureVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 18,
      delay: i * 0.08,
    },
  }),
};

export default function AIWorkshops() {
  return (
    <section
      id="ai-workshops"
      className="py-20 sm:py-28 bg-gradient-to-b from-primary/[0.02] to-accent-purple/[0.02]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-purple/10 text-accent-purple text-sm font-semibold mb-4">
            <BrainCircuit className="w-4 h-4" />
            New: AI Workshops
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            AI-Powered Learning for{" "}
            <span className="text-accent-purple">Everyone</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            From classrooms to boardrooms — our AI workshops demystify
            artificial intelligence and equip learners with practical skills for
            the future.
          </p>
        </motion.div>

        {/* Video Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Where Humans Meet{" "}
              <span className="text-primary">AI</span>
            </h3>
            <p className="text-muted text-sm sm:text-base mt-2 max-w-lg mx-auto">
              Building the future together — hands-on workshops that bridge
              creativity and technology.
            </p>
          </div>
          <div className="relative aspect-[16/9] sm:aspect-[21/9] lg:aspect-[24/9]">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/videos/ai-collaboration.mp4" type="video/mp4" />
            </video>
          </div>
        </motion.div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Schools */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
            className="clay-card relative overflow-hidden"
          >
            {/* Image header */}
            <div className="relative h-48 overflow-hidden">
              <Image
                src="/images/kids-classroom.jpg"
                alt="Children learning AI in classroom"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
              <div className="absolute bottom-4 left-6 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">
                    For Schools
                  </h3>
                  <p className="text-xs text-muted">
                    Grades 1-12 | Curriculum Aligned
                  </p>
                </div>
              </div>
            </div>

            <div className="p-7">
              <p className="text-muted mb-6 leading-relaxed text-sm">
                We bring AI education directly into schools with structured,
                age-appropriate programs. From introducing kindergarteners to
                simple pattern recognition to guiding high schoolers through
                building neural networks.
              </p>

              <div className="space-y-3.5 mb-6">
                {schoolFeatures.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={featureVariants}
                    className="flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                      <feature.icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-muted leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  "NEP 2020 Aligned",
                  "Certified Trainers",
                  "Lab Setup Support",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>

              <a href="https://wa.me/917508807490?text=Hi%2C%20i'm%20interested%20to%20know%20more%20about%20SkillFleet%20for%20our%20school!" target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto group">
                  Partner Your School
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Corporates */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.1 }}
            className="clay-card relative overflow-hidden"
          >
            {/* Image header */}
            <div className="relative h-48 overflow-hidden">
              <Image
                src="/images/corporate-workshop.webp"
                alt="Corporate AI workshop training session"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
              <div className="absolute bottom-4 left-6 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-accent-purple" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">
                    For Corporates
                  </h3>
                  <p className="text-xs text-muted">
                    Teams of all sizes | Customizable
                  </p>
                </div>
              </div>
            </div>

            <div className="p-7">
              <p className="text-muted mb-6 leading-relaxed text-sm">
                Future-proof your workforce with our tailored AI training
                programs. Whether your team is technical or non-technical, we
                design workshops that bridge the gap between AI theory and
                practical business applications.
              </p>

              <div className="space-y-3.5 mb-6">
                {corporateFeatures.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={featureVariants}
                    className="flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-accent-purple/5 flex items-center justify-center shrink-0 mt-0.5">
                      <feature.icon className="w-4.5 h-4.5 text-accent-purple" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-muted leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {["Custom Curriculum", "On-site & Remote", "ROI Tracking"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-purple/5 text-accent-purple text-xs font-medium"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {tag}
                    </span>
                  )
                )}
              </div>

              <a href="https://wa.me/917508807490?text=Hi%2C%20i'm%20interested%20to%20book%20an%20AI%20workshop%20for%20our%20team!" target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto group bg-accent-purple hover:bg-accent-purple/90">
                  Book a Workshop
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
