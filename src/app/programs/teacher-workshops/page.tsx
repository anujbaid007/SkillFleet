import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Teacher Workshops — SkillFleet",
  description:
    "3-hour AI workshops for school teachers. NEP 2020 aligned, hands-on training to make educators AI-ready.",
};

export default function TeacherWorkshopsPage() {
  return (
    <iframe
      src="/decks/teacher-workshop.html"
      className="w-full h-dvh border-0"
      title="AI Teacher Workshop Deck"
    />
  );
}
