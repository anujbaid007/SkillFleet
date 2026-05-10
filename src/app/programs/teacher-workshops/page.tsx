import type { Metadata } from "next";
import DeckHeader from "@/components/ui/deck-header";

export const metadata: Metadata = {
  title: "AI Teacher Workshops — SkillFleet",
  description:
    "3-hour AI workshops for school teachers. NEP 2020 aligned, hands-on training to make educators AI-ready.",
};

export default function TeacherWorkshopsPage() {
  return (
    <div className="h-dvh flex flex-col">
      <DeckHeader />
      <iframe
        src="/decks/teacher-workshop.html"
        className="w-full flex-1 border-0"
        title="AI Teacher Workshop Deck"
      />
    </div>
  );
}
