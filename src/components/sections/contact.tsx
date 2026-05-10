"use client";

import React from "react";
import { motion } from "motion/react";
import {
  Phone,
  Mail,
  MapPin,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <section
      id="contact"
      className="py-20 sm:py-28 bg-gradient-to-b from-background to-primary/[0.03]"
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
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent-teal/10 text-accent-teal text-sm font-semibold mb-4">
            Get In Touch
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Start Your Child&apos;s{" "}
            <span className="text-accent-teal">Journey</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Have questions? Want to enroll? We&apos;d love to hear from you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="clay-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground mb-1">
                    Call Us
                  </h3>
                  <p className="text-muted">+91 8076314479</p>
                  <p className="text-sm text-muted/60">Mon-Sat, 9AM - 7PM IST</p>
                </div>
              </div>
            </div>

            <div className="clay-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-light/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary-light" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground mb-1">
                    Email Us
                  </h3>
                  <p className="text-muted">contact@skillfleet.org</p>
                  <p className="text-sm text-muted/60">
                    We reply within 24 hours
                  </p>
                </div>
              </div>
            </div>

            <div className="clay-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-accent-purple" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground mb-1">
                    Visit Us
                  </h3>
                  <p className="text-muted">
                    HQ27 The Headquarters,
                    <br />
                    Gurugram, Haryana 122009
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="clay-card p-8">
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Register Your Child
              </h3>

              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="childName"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      Child&apos;s Full Name
                    </label>
                    <input
                      type="text"
                      id="childName"
                      className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-background border-2 border-primary/10 focus:border-primary focus:outline-none transition-colors text-foreground"
                      placeholder="Enter child's name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="guardianName"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      Guardian Name
                    </label>
                    <input
                      type="text"
                      id="guardianName"
                      className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-background border-2 border-primary/10 focus:border-primary focus:outline-none transition-colors text-foreground"
                      placeholder="Enter guardian's name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-background border-2 border-primary/10 focus:border-primary focus:outline-none transition-colors text-foreground"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-background border-2 border-primary/10 focus:border-primary focus:outline-none transition-colors text-foreground"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="age"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      Child&apos;s Age
                    </label>
                    <select
                      id="age"
                      className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-background border-2 border-primary/10 focus:border-primary focus:outline-none transition-colors text-foreground cursor-pointer"
                    >
                      <option value="">Select age</option>
                      {Array.from({ length: 15 }, (_, i) => i + 3).map(
                        (age) => (
                          <option key={age} value={age}>
                            {age} years
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="grade"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      Grade Level
                    </label>
                    <select
                      id="grade"
                      className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-background border-2 border-primary/10 focus:border-primary focus:outline-none transition-colors text-foreground cursor-pointer"
                    >
                      <option value="">Select grade</option>
                      <option value="prek">Pre-K</option>
                      <option value="kg">Kindergarten</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (grade) => (
                          <option key={grade} value={grade}>
                            Grade {grade}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-primary/10 focus:border-primary focus:outline-none transition-colors text-foreground resize-none"
                    placeholder="Any specific interests or questions?"
                  />
                </div>

                <a href="https://wa.me/917508807490?text=Hi%2C%20i'm%20interested%20to%20know%20more%20about%20SkillFleet!" target="_blank" rel="noopener noreferrer" className="block">
                  <Button size="lg" className="w-full group" type="button">
                    <Send className="w-5 h-5 mr-2" />
                    Submit Registration
                  </Button>
                </a>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
