/**
 * The bar at the bottom of the lesson - Duolingo's signature feedback.
 *   answering -> SKIP + CHECK (grey until an answer is chosen)
 *   correct   -> green bar "Nice!" + CONTINUE
 *   wrong     -> red bar "Correct solution: ..." + CONTINUE
 */
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Phase } from "@/lib/lesson-state";

const PRAISE = ["Nice!", "Great job!", "Amazing!", "Excellent!", "You're on fire!", "Awesome!"];

type FeedbackBarProps = {
  phase: Phase;
  canCheck: boolean;
  correctAnswer: string;
  praiseIndex: number; // picks a different compliment each time
  onCheck: () => void;
  onSkip: () => void;
  onContinue: () => void;
};

export default function FeedbackBar(props: FeedbackBarProps) {
  const { phase, canCheck, correctAnswer, praiseIndex, onCheck, onSkip, onContinue } = props;
  const showResult = phase === "correct" || phase === "wrong";
  const correct = phase === "correct";

  return (
    <footer
      className={cn(
        "border-t-2 border-line",
        showResult && "animate-slide-up border-transparent",
        phase === "correct" && "bg-green-light",
        phase === "wrong" && "bg-red-light",
      )}
    >
      <div className="mx-auto flex min-h-[140px] max-w-[1000px] flex-col justify-center gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        {showResult ? (
          <div className={cn("flex items-center gap-4", correct ? "text-green-dark" : "text-red")}>
            <span
              className={cn(
                "hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface text-4xl font-black sm:flex",
              )}
            >
              {correct ? "✓" : "✕"}
            </span>
            <div>
              <p className="text-2xl font-extrabold">
                {correct ? PRAISE[praiseIndex % PRAISE.length] : "Correct solution:"}
              </p>
              {!correct && correctAnswer && <p className="text-lg">{correctAnswer}</p>}
            </div>
          </div>
        ) : (
          <Button variant="outline" size="lg" onClick={onSkip} className="hidden sm:inline-flex" disabled={phase !== "answering"}>
            Skip
          </Button>
        )}

        {showResult ? (
          <Button variant={correct ? "primary" : "danger"} size="lg" onClick={onContinue} className="w-full sm:w-auto sm:min-w-[150px]">
            Continue
          </Button>
        ) : (
          <Button size="lg" onClick={onCheck} disabled={!canCheck} className="w-full sm:w-auto sm:min-w-[150px]">
            {phase === "checking" ? "Checking…" : "Check"}
          </Button>
        )}
      </div>
    </footer>
  );
}
