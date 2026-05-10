import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Corporate Workshops — SkillFleet",
  description:
    "3-hour AI workshops for corporate teams. Hands-on training to make employees AI-ready.",
};

export default function CorporateWorkshopsPage() {
  return (
    <iframe
      src="/decks/corporate-workshop.html"
      className="w-full h-dvh border-0"
      title="AI Corporate Workshop Deck"
    />
  );
}
