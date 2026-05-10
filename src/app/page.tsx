"use client";

import LoadingScreen from "@/components/loading-screen";
import Navbar from "@/components/sections/navbar";
import Hero from "@/components/sections/hero";
import Programs from "@/components/sections/programs";
import AIWorkshops from "@/components/sections/ai-workshops";
import AgeGroups from "@/components/sections/age-groups";
import Passport from "@/components/sections/passport";
import ParallaxBanner from "@/components/sections/parallax-banner";
import Stats from "@/components/sections/stats";
import Testimonials from "@/components/sections/testimonials";
import FAQ from "@/components/sections/faq";
import Contact from "@/components/sections/contact";
import Footer from "@/components/sections/footer";

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <Navbar />
      <main>
        <Hero />
        <Programs />
        <AIWorkshops />
        <AgeGroups />
        <Passport />
        <ParallaxBanner />
        <Stats />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
