"use client";

import React from "react";
import Navbar from "@/components/sections/navbar";
import Footer from "@/components/sections/footer";

export default function SubpageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Every page using this layout renders a PageBanner. */}
      <Navbar hasBanner />
      <main>{children}</main>
      <Footer />
    </>
  );
}
