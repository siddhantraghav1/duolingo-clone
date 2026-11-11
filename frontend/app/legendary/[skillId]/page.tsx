/**
 * /legendary/1 -> timed legendary challenge for skill 1 (3 lives, 2 minutes).
 * Same Suspense pattern as /lesson/[lessonId].
 */
import { Suspense } from "react";

import LessonScreen, { LessonLoading } from "@/components/lesson/LessonScreen";

export default function LegendaryPage({ params }: PageProps<"/legendary/[skillId]">) {
  return (
    <Suspense fallback={<LessonLoading />}>
      <LegendaryFromUrl params={params} />
    </Suspense>
  );
}

async function LegendaryFromUrl({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  return <LessonScreen mode="legendary" id={Number(skillId)} />;
}
