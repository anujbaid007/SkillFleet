import type { Metadata } from "next";
import DeckHeader from "@/components/ui/deck-header";

export const metadata: Metadata = {
  title: "AI Student Workshops — SkillFleet",
  description:
    "AI workshops for school students. Age-appropriate, hands-on AI training from chatbots to neural networks.",
};

export default function StudentWorkshopsPage() {
  return (
    <div className="h-dvh flex flex-col">
      <DeckHeader />
      <iframe
        src="/decks/student-workshop.html"
        className="w-full flex-1 border-0"
        title="AI Student Workshop Deck"
      />
    </div>
  );
}
