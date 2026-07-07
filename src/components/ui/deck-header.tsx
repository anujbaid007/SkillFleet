"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function DeckHeader() {
  return (
    <header className="h-12 bg-[#0F172A] flex items-center px-4 gap-3 shrink-0">
      <Link
        href="/"
        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <Image
          src="/logo.svg"
          alt="SkillFleet"
          width={100}
          height={28}
          className="h-6 w-auto brightness-0 invert"
        />
      </Link>
    </header>
  );
}
