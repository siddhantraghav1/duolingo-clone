/**
 * /lesson/5 -> plays lesson 5.
 * Lives outside the (main) route group, so it is full-screen with no menus.
 *
 * Next.js 16 with Cache Components: the URL value (lessonId) is only known at
 * request time, so it must be read inside a <Suspense> boundary.
 */
import { Suspense } from "react";

import LessonScreen, { LessonLoading } from "@/components/lesson/LessonScreen";

export default function LessonPage({ params }: PageProps<"/lesson/[lessonId]">) {
  return (
    <Suspense fallback={<LessonLoading />}>
      <LessonFromUrl params={params} />
    </Suspense>
  );
}

async function LessonFromUrl({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <LessonScreen mode="lesson" id={Number(lessonId)} />;
}
