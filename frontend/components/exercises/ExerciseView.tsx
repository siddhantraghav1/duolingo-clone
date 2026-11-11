/**
 * Shows the right component for an exercise's type, with the question title on top.
 * Because Exercise is a discriminated union, TypeScript knows the exact `data`
 * shape inside each `case`.
 */
import type { Answer, Exercise } from "@/lib/types";
import FillBlank from "./FillBlank";
import MatchPairs from "./MatchPairs";
import MultipleChoice from "./MultipleChoice";
import TypeAnswer from "./TypeAnswer";
import WordBank from "./WordBank";

type ExerciseViewProps = {
  exercise: Exercise;
  onAnswer: (answer: Answer | null) => void;
  disabled: boolean;
  isRetry: boolean; // this exercise was answered wrongly before
};

export default function ExerciseView({ exercise, onAnswer, disabled, isRetry }: ExerciseViewProps) {
  const props = { onAnswer, disabled, audioText: exercise.audio_text };

  return (
    <div className="flex flex-col gap-6">
      {isRetry && (
        <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-orange">
          🔁 Previous mistake
        </p>
      )}
      <h1 className="text-2xl font-extrabold sm:text-3xl">{exercise.question}</h1>

      {exercise.type === "multiple_choice" && <MultipleChoice data={exercise.data} {...props} />}
      {exercise.type === "translate" && <WordBank data={exercise.data} {...props} />}
      {exercise.type === "fill_blank" && <FillBlank data={exercise.data} {...props} />}
      {exercise.type === "type_answer" && <TypeAnswer data={exercise.data} {...props} />}
      {exercise.type === "match_pairs" && <MatchPairs data={exercise.data} {...props} />}
    </div>
  );
}
