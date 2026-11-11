/**
 * /review -> "Practice your mistakes" session (earns back a heart).
 * No URL values to read, so no Suspense boundary is needed here.
 */
import LessonScreen from "@/components/lesson/LessonScreen";

export default function ReviewPage() {
  return <LessonScreen mode="practice" />;
}
