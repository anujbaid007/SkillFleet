"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import FloatingDoodles from "@/components/ui/floating-doodles";

const faqs = [
  {
    question: "What is SkillFleet?",
    answer:
      "SkillFleet is India's first industrial exposure platform designed for children aged 3-17. We offer immersive trips, hands-on workshops, collaborative events, and competitive platforms that go beyond traditional classroom learning to inspire the next generation of innovators.",
  },
  {
    question: "What age groups do you cater to?",
    answer:
      "We design programs for four age groups: Pre-K & Kindergarten (3-6 years), Elementary School (7-10 years), Middle School (11-13 years), and High School (14-17 years). Each program is tailored to the developmental stage and learning capacity of the age group.",
  },
  {
    question: "How is SkillFleet different from regular tuition or coaching?",
    answer:
      "Unlike tuition centers that focus on exam preparation, SkillFleet focuses on experiential learning. We take students to real factories, tech labs, and cultural centers. Our workshops are project-based, and our competitions offer real scholarships. We build skills, curiosity, and career awareness — not just exam scores.",
  },
  {
    question: "Do you offer AI workshops for schools?",
    answer:
      "Yes! Our AI workshop programs are NEP 2020 aligned and cover everything from basic AI literacy for younger students to advanced machine learning projects for high schoolers. We also train teachers and can set up AI labs in schools.",
  },
  {
    question: "Can corporates book AI training workshops?",
    answer:
      "Absolutely. We offer customized AI workshops for corporate teams of all sizes. Programs include AI strategy workshops, generative AI bootcamps, team upskilling programs, and 2-day innovation sprints. These can be conducted on-site or remotely.",
  },
  {
    question: "What is the SkillFleet Passport?",
    answer:
      "The SkillFleet Passport is our proprietary tracking system that documents every experience, badge, and milestone a student earns. Parents and schools can track progress, skill development, and areas of interest over time — creating a living portfolio of a child's growth.",
  },
  {
    question: "How do I enroll my child?",
    answer:
      "You can enroll by filling out the registration form on our website or contacting us at contact@skillfleet.org. Share your child's age, grade, and interests, and our team will recommend the best programs to get started.",
  },
  {
    question: "Are scholarships available?",
    answer:
      "Yes, SkillFleet offers scholarships through our national and regional competitions. Top performers receive financial aid for further education, recognition, and opportunities for advanced programs and industry exposure.",
  },
];

function FAQItem({
  faq,
  isOpen,
  onToggle,
  index,
}: {
  faq: (typeof faqs)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        type: "spring" as const,
        stiffness: 80,
        damping: 18,
        delay: index * 0.04,
      }}
      className="clay-card overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-6 text-left cursor-pointer group"
      >
        <span className="font-display text-sm sm:text-lg font-semibold text-foreground pr-4 group-hover:text-primary transition-colors">
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <ChevronDown className="w-5 h-5 text-muted shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-sm sm:text-base text-muted leading-relaxed">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-14 sm:py-28 relative overflow-hidden">
      <FloatingDoodles variant="faq" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-center mb-8 sm:mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/5 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </span>
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-4">
            Frequently Asked{" "}
            <span className="text-primary">Questions</span>
          </h2>
          <p className="text-sm sm:text-lg text-muted">
            Everything you need to know about SkillFleet.
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
