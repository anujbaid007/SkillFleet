"use client";

import React from "react";

export default function ParallaxBanner() {
  return (
    <section className="relative h-[35vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden">
      {/* Parallax image — no overlay, students fully visible */}
      <div
        className="absolute inset-0 bg-fixed bg-top bg-cover"
        style={{ backgroundImage: "url('/images/skillfleet-students.webp')" }}
      />
    </section>
  );
}
