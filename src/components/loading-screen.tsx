"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<"logo" | "bars" | "done">("logo");

  useEffect(() => {
    // Phase 1: Show logo animation for 0.8s
    const logoTimer = setTimeout(() => setPhase("bars"), 800);
    // Phase 2: Bars sweep for 0.4s, then hide
    const barsTimer = setTimeout(() => setPhase("done"), 1200);
    const hideTimer = setTimeout(() => setIsLoading(false), 1400);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(barsTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <AnimatePresence>
      {phase !== "done" ? (
        <motion.div
          key="loader"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 50%, #F0F4FF 100%)" }}
        >
          {/* Animated background blobs */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                x: [0, 30, 0],
                y: [0, -20, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-20 -left-20 w-80 h-80 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)" }}
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                x: [0, -30, 0],
                y: [0, 20, 0],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)" }}
            />
          </div>

          {/* Logo container with 3D perspective */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotateY: -15 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotateY: 0,
            }}
            transition={{
              duration: 0.8,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            style={{ perspective: "600px" }}
            className="relative z-10 flex flex-col items-center"
          >
            <motion.div
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Image
                src="/logo.svg"
                alt="SkillFleet"
                width={220}
                height={60}
                className="h-14 w-auto"
                priority
              />
            </motion.div>

            {/* Loading dots */}
            <div className="flex items-center gap-2 mt-8">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3, scale: 0.5 }}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.5, 1, 0.5],
                    y: [0, -6, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>

          {/* Vertical sweep bars */}
          {phase === "bars" && (
            <div className="absolute inset-0 flex z-20">
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 1 }}
                  animate={{ scaleY: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.04,
                    ease: [0.645, 0.045, 0.355, 1],
                  }}
                  className="flex-1 origin-top"
                  style={{
                    background: `linear-gradient(180deg, rgba(37,99,235,${0.03 + i * 0.01}) 0%, rgba(248,250,252,0.95) 100%)`,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
