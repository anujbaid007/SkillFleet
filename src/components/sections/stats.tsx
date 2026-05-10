"use client";

import React from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Users, School, Factory, Award, Globe, Calendar } from "lucide-react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [displayValue, setDisplayValue] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [rounded]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animate(count, target, { duration: 2, ease: "easeOut" });
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [count, target]);

  return (
    <span ref={ref}>
      {displayValue}
      {suffix}
    </span>
  );
}

const stats = [
  { icon: Users, value: 10000, suffix: "+", label: "Students Impacted" },
  { icon: School, value: 200, suffix: "+", label: "Partner Schools" },
  { icon: Factory, value: 50, suffix: "+", label: "Industry Partners" },
  { icon: Award, value: 500, suffix: "+", label: "Workshops Conducted" },
  { icon: Globe, value: 15, suffix: "+", label: "Cities Covered" },
  { icon: Calendar, value: 100, suffix: "+", label: "Events Organized" },
];

const statVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 16,
      delay: i * 0.08,
    },
  }),
};

export default function Stats() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden" style={{
      background: "linear-gradient(135deg, #7447E1 0%, #8B5CF6 40%, #9333EA 70%, #7C3AED 100%)",
    }}>
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-white/[0.03] blur-2xl" />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Our Impact in Numbers
          </h2>
          <p className="text-lg text-white/70 max-w-xl mx-auto">
            Growing every day as more schools, parents, and industry leaders join
            the SkillFleet movement.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-30px" }}
              variants={statVariants}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className="text-center"
            >
              <div
                className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 border border-white/20"
                style={{
                  boxShadow: "4px 4px 12px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.15)",
                }}
              >
                <stat.icon className="w-7 h-7 text-white" />
              </div>
              <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-white/60">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
