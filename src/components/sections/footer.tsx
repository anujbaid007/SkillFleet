"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Globe, Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
  programs: [
    { name: "Exposure Trips", href: "#programs" },
    { name: "Workshops", href: "#programs" },
    { name: "Events", href: "#programs" },
    { name: "Competitions", href: "#programs" },
    { name: "AI Workshops", href: "#ai-workshops" },
  ],
  company: [
    { name: "About Us", href: "#about" },
    { name: "Blog", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Partner With Us", href: "#contact" },
  ],
  ageGroups: [
    { name: "Pre-K (3-6 yrs)", href: "#age-groups" },
    { name: "Elementary (7-10 yrs)", href: "#age-groups" },
    { name: "Middle School (11-13 yrs)", href: "#age-groups" },
    { name: "High School (14-17 yrs)", href: "#age-groups" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white/80 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="#home" className="flex items-center mb-4">
              <Image
                src="/logo.svg"
                alt="SkillFleet"
                width={160}
                height={44}
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-white/50 leading-relaxed mb-6 max-w-sm">
              India&apos;s first industrial exposure platform inspiring
              tomorrow&apos;s innovators through real-world learning experiences
              for children aged 3-17.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.linkedin.com/company/skill-fleet/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-colors"
                aria-label="LinkedIn"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/skillfleet/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent-pink/20 hover:border-accent-pink/30 transition-colors"
                aria-label="Instagram"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Programs */}
          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">
              Programs
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.programs.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Age Groups */}
          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">
              Age Groups
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.ageGroups.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                <span className="text-sm text-white/50">+91 8076314479</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                <span className="text-sm text-white/50">
                  contact@skillfleet.org
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                <span className="text-sm text-white/50">
                  HQ27 The Headquarters,
                  <br />
                  Gurugram, Haryana 122009
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/30">
              &copy; {new Date().getFullYear()} SkillFleet. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="#"
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
