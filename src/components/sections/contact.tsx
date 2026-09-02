"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import FloatingDoodles from "@/components/ui/floating-doodles";

/**
 * The closing call to action on the home page.
 *
 * This used to be a seven-field registration form that opened WhatsApp with the
 * answers pasted into a message. It collected a child's name, age and grade
 * before anyone had agreed to anything, and it led away from the product rather
 * than into it. Signing up does the same job properly: the account is created,
 * the details are asked for once inside, and consent is taken where it belongs.
 */
export default function Contact() {
  return (
    <section
      id="contact"
      className="py-14 sm:py-28 bg-gradient-to-b from-background to-primary/[0.03] relative overflow-hidden"
    >
      <FloatingDoodles variant="contact" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-center"
        >
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-accent-teal/10 text-accent-teal text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            Get In Touch
          </span>
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-4">
            Start Your Child&apos;s{" "}
            <span className="text-accent-teal">Journey</span>
          </h2>
          <p className="text-sm sm:text-lg text-muted max-w-2xl mx-auto">
            Create a free account to book workshops and trips, and to enter the International Skill
            Championship.
          </p>

          <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="clay-button bg-cta text-white w-full sm:w-auto px-8 h-13 sm:h-14 text-base font-semibold inline-flex items-center justify-center gap-2 group"
            >
              Enroll Now
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/contact"
              className="clay-button bg-white text-foreground w-full sm:w-auto px-8 h-13 sm:h-14 text-base font-semibold inline-flex items-center justify-center"
            >
              Talk to us first
            </Link>
          </div>

          <p className="mt-4 text-xs sm:text-sm text-muted">
            Free to join. Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
