"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Calendar, ArrowRight, BookOpen, PenTool } from "lucide-react";
import SubpageLayout from "@/components/subpage-layout";
import PageBanner from "@/components/ui/page-banner";

/* ------------------------------------------------------------------ */
/*  Decorative floating SVG doodles                                   */
/* ------------------------------------------------------------------ */

function PencilSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function BookSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
    </svg>
  );
}

function LightbulbSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
    </svg>
  );
}

function StarSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Blog post data                                                     */
/* ------------------------------------------------------------------ */

const blogPosts = [
  {
    title: "How Exposure Trips Shape Future Leaders",
    date: "June 24, 2024",
    description:
      "Discover how real-world industrial visits transform the way children think about careers and innovation.",
    image: "/images/kids-uniform.jpg",
    href: "#",
  },
  {
    title: "The Power of Hands-On Workshops for Young Minds",
    date: "June 20, 2024",
    description:
      "Why project-based learning beats traditional classrooms every time.",
    image: "/images/kids-classroom.jpg",
    href: "#",
  },
  {
    title: "Why AI Literacy Matters for Every Student",
    date: "June 15, 2024",
    description:
      "From chatbots to neural networks — preparing the next generation for an AI-first world.",
    image: "/images/kids-learning.jpg",
    href: "#",
  },
  {
    title: "Building Confidence Through Competitions",
    date: "June 10, 2024",
    description:
      "How national-level competitions help children discover their strengths and overcome fears.",
    image: "/images/kid-raising-hand.jpg",
    href: "#",
  },
  {
    title: "The SkillFleet Passport: Tracking Every Milestone",
    date: "June 5, 2024",
    description:
      "A deep dive into our proprietary progress tracking system for students.",
    image: "/images/kids-group.jpg",
    href: "#",
  },
  {
    title: "Bridging the Gap: CSR in Education",
    date: "May 28, 2024",
    description:
      "How corporate partners are making real-world learning accessible to underprivileged children.",
    image: "/images/kids-playing.jpg",
    href: "#",
  },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 18,
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Blog Card                                                          */
/* ------------------------------------------------------------------ */

function BlogCard({
  title,
  date,
  description,
  image,
  href,
}: (typeof blogPosts)[number]) {
  return (
    <motion.article variants={cardVariants} className="clay-card overflow-hidden flex flex-col group">
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Purple overlay on hover */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300" />
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        {/* Date */}
        <div className="flex items-center gap-1.5 text-muted text-sm mb-3">
          <Calendar className="w-3.5 h-3.5 text-primary/60" />
          <time>{date}</time>
        </div>

        {/* Title */}
        <h3 className="font-display text-lg font-bold text-foreground leading-snug mb-3 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-muted text-sm leading-relaxed flex-1 mb-5">
          {description}
        </p>

        {/* Read More link */}
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm hover:gap-2.5 transition-all duration-200"
        >
          Read More
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BlogPage() {
  return (
    <SubpageLayout>
      <PageBanner
        title="Our"
        highlight="Blog"
        subtitle="Stories, insights, and updates from the world of experiential learning"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />

      {/* Main content */}
      <section className="relative overflow-hidden py-16 sm:py-20 bg-background">
        {/* Floating doodles */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 left-[4%] hidden md:block pointer-events-none"
        >
          <PencilSVG className="w-10 h-10 text-primary/10" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 12, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-32 right-[5%] hidden md:block pointer-events-none"
        >
          <BookSVG className="w-12 h-12 text-accent-purple/10" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -10, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-20 right-[20%] hidden lg:block pointer-events-none"
        >
          <LightbulbSVG className="w-8 h-8 text-accent-yellow/25" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0], rotate: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-24 left-[10%] hidden lg:block pointer-events-none"
        >
          <StarSVG className="w-7 h-7 text-accent-yellow/20" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-16 right-[12%] hidden md:block pointer-events-none"
        >
          <PencilSVG className="w-8 h-8 text-primary/10" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-1/2 left-[2%] hidden xl:block pointer-events-none"
        >
          <BookOpen className="w-9 h-9 text-accent-teal/15" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute top-1/3 right-[2%] hidden xl:block pointer-events-none"
        >
          <PenTool className="w-8 h-8 text-accent-pink/12" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring" as const, stiffness: 80, damping: 18 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Latest Articles
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Ideas Worth{" "}
              <span className="text-primary">Exploring</span>
            </h2>
          </motion.div>

          {/* Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {blogPosts.map((post) => (
              <BlogCard key={post.title} {...post} />
            ))}
          </motion.div>
        </div>
      </section>
    </SubpageLayout>
  );
}
