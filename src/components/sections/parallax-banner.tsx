"use client";

import React from "react";
import Image from "next/image";

export default function ParallaxBanner() {
  return (
    <section className="relative h-[35vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden">
      {/* Mobile: regular image (bg-fixed broken on iOS Safari) */}
      <div className="absolute inset-0 sm:hidden">
        <Image
          src="/images/skillfleet-students.webp"
          alt="SkillFleet students holding banner"
          fill
          className="object-cover object-top"
          sizes="100vw"
        />
      </div>
      {/* Desktop: parallax fixed background */}
      <div
        className="absolute inset-0 hidden sm:block bg-fixed bg-top bg-cover"
        style={{ backgroundImage: "url('/images/skillfleet-students.webp')" }}
      />
    </section>
  );
}
