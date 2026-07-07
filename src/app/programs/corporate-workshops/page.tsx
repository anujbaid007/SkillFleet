import type { Metadata } from "next";
import DeckHeader from "@/components/ui/deck-header";

export const metadata: Metadata = {
  title: "AI Corporate Workshops — SkillFleet",
  description:
    "3-hour AI workshops for corporate teams. Hands-on training to make employees AI-ready.",
};

export default function CorporateWorkshopsPage() {
  return (
    <div className="h-dvh flex flex-col">
      <DeckHeader />
      <iframe
        src="/decks/corporate-workshop.html"
        className="w-full flex-1 border-0"
        title="AI Corporate Workshop Deck"
      />
    </div>
  );
}
