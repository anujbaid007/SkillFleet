import type { Metadata } from "next";
import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillFleet - India's First Industrial Exposure Platform",
  description:
    "Inspiring tomorrow's innovators today through real-world learning experiences. Trips, workshops, events, competitions & AI workshops for children aged 3-17.",
  keywords: [
    "SkillFleet",
    "industrial exposure",
    "children education",
    "workshops",
    "AI workshops",
    "school programs",
    "STEM education",
    "India",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${baloo.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-[#1E293B]">
        {children}
      </body>
    </html>
  );
}
