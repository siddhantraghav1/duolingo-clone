"use client";

/**
 * Plays one session (lesson / practice / legendary) from first exercise to the result screens.
 * The rules of the flow live in lib/lesson-state.ts; this component draws the
 * current state and talks to the backend.
 */
import { useCallback, useEffect, useReducer, useState } from "react";

import ExerciseView from "@/components/exercises/ExerciseView";
import Button from "@/components/ui/Button";
import Mascot from "@/components/ui/Mascot";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { createLessonState, isLastStep, lessonReducer } from "@/lib/lesson-state";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import type { Answer, CompleteResult, Exercise, LessonSession } from "@/lib/types";
import { LessonComplete, LessonFailed, StreakScreen } from "./EndScreens";
import FeedbackBar from "./FeedbackBar";
import LessonHeader from "./LessonHeader";
import OutOfHearts from "./OutOfHearts";

export type FinishInfo = { mistakes: number; duration_sec: number };

/**
 * Spanish to read aloud after a correct answer, so the learner hears it.
 * (Exercises that show a Spanish sentence already read it when they appear.)
 */
function spanishToSpeakAfter(exercise: Exercise, correctAnswer: string): string | null {
  if (exercise.type === "multiple_choice") return correctAnswer;
  if (exercise.type === "fill_blank") return exercise.audio_text; // the full sentence
  if (exercise.type === "translate" && exercise.data.tiles_lang === "es") return correctAnswer;
  return null;
}

const TITLES = {
  lesson: "Lesson complete!",
  practice: "Practice complete!",
  legendary: "Legendary complete!",
};

type LessonPlayerProps = {
  session: LessonSession;
  startHearts: number | null; // null = unlimited
  onFinish: (info: FinishInfo) => Promise<CompleteResult>; // saves the result on the server
  onExit: () => void; // back to the learning path
  onRetry: () => void; // start the same session again (legendary)
};

export default function LessonPlayer({ session, startHearts, onFinish, onExit, onRetry }: LessonPlayerProps) {
  const [state, dispatch] = useReducer(lessonReducer, null, () =>
    createLessonState(session.exercises, session.mode, startHearts),
  );
  const [startedAt] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const showToast = useToast();

  const current = state.queue[state.index];
  const canCheck = state.phase === "answering" && state.answer !== null;
  const showingResult = state.phase === "correct" || state.phase === "wrong";

  // ---------------------------------------------------------------- actions

  async function check(answer: Answer | null = state.answer) {
    if (answer === null || state.phase !== "answering") return;
    dispatch({ type: "check_start" });
    try {
      const graded = await api.checkAnswer(current.id, answer, session.mode);
      dispatch({
        type: "check_result",
        correct: graded.correct,
        correctAnswer: graded.correct_answer,
        serverHearts: graded.hearts,
      });
      playSound(graded.correct ? "correct" : "wrong");
      const spanish = graded.correct ? spanishToSpeakAfter(current, graded.correct_answer) : null;
      if (spanish) setTimeout(() => speak(spanish), 400); // after the "ding"
    } catch {
      dispatch({ type: "check_failed" });
      showToast("Connection problem - try again", "⚠️", "error");
    }
  }

  function handleAnswer(answer: Answer | null) {
    dispatch({ type: "answer", answer });
    // match pairs has no CHECK button: finishing all pairs submits right away
    if (current.type === "match_pairs" && answer !== null) check(answer);
  }

  function skip() {
    check(current.type === "match_pairs" ? [] : ""); // an empty answer counts as wrong
  }

  async function save(durationSec: number) {
    setSaveFailed(false);
    try {
      const saved = await onFinish({ mistakes: state.mistakes, duration_sec: durationSec });
      setResult(saved);
      for (const achievement of saved.new_achievements) {
        showToast(`Achievement unlocked: ${achievement.title}`, achievement.icon, "success");
      }
    } catch {
      setSaveFailed(true);
    }
  }

  function handleContinue() {
    const finishing = isLastStep(state); // read before the state changes
    dispatch({ type: "continue" });
    if (finishing) {
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      setSeconds(durationSec);
      save(durationSec);
    }
  }

  // stable function, so the legendary Countdown doesn't restart its effect on every render
  const timeUp = useCallback(() => dispatch({ type: "time_up" }), []);

  // Keyboard: Enter = CHECK or CONTINUE, Escape = quit dialog.
  // (preventDefault stops a focused button from also "clicking" on Enter)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (quitOpen) return; // the open dialog handles its own keys
      if (event.key === "Escape") {
        setQuitOpen(true);
        return;
      }
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (showingResult) handleContinue();
      else if (canCheck) check();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // ---------------------------------------------------------------- screens

  if (result) {
    if (showStreak) return <StreakScreen streak={result.streak} onContinue={onExit} />;
    const accuracy = Math.round((state.total / (state.total + state.mistakes)) * 100);
    return (
      <LessonComplete
        result={result}
        accuracy={accuracy}
        seconds={seconds}
        title={TITLES[session.mode]}
        note={session.mode === "practice" ? "You earned a heart back ❤️" : null}
        onContinue={() => (result.streak_extended ? setShowStreak(true) : onExit())}
      />
    );
  }

  if (state.phase === "finished") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
        <Mascot mood={saveFailed ? "sad" : "thinking"} size={140} />
        {saveFailed ? (
          <>
            <p className="text-lg font-bold">Couldn&apos;t save your lesson.</p>
            <Button onClick={() => save(seconds)}>Try again</Button>
          </>
        ) : (
          <p className="text-lg font-bold text-muted">Saving your progress…</p>
        )}
      </div>
    );
  }

  if (state.phase === "failed") {
    return <LessonFailed reason={state.failReason ?? "lives"} onRetry={onRetry} onQuit={onExit} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <LessonHeader
        progress={state.correctCount / state.total}
        hearts={state.hearts}
        combo={state.combo}
        timeLimit={session.time_limit_sec}
        onTimeUp={timeUp}
        onQuit={() => setQuitOpen(true)}
      />

      <main className="mx-auto w-full max-w-[600px] flex-1 px-4 py-8 sm:py-12">
        {/* key = queue position: every exercise (and every retry) starts with a fresh component */}
        <ExerciseView
          key={state.index}
          exercise={current}
          onAnswer={handleAnswer}
          disabled={state.phase !== "answering"}
          isRetry={state.index >= state.total}
        />
      </main>

      <FeedbackBar
        phase={state.phase}
        canCheck={canCheck}
        correctAnswer={state.correctAnswer}
        praiseIndex={state.correctCount}
        onCheck={() => check()}
        onSkip={skip}
        onContinue={handleContinue}
      />

      <Modal open={quitOpen} onClose={() => setQuitOpen(false)}>
        <Mascot mood="sad" size={110} className="mx-auto" />
        <h2 className="mt-4 text-2xl font-extrabold">Wait, don&apos;t go!</h2>
        <p className="mt-2 text-muted">You&apos;ll lose your progress if you quit now.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="secondary" fullWidth onClick={() => setQuitOpen(false)}>
            Keep learning
          </Button>
          <Button variant="ghost" fullWidth className="text-red" onClick={onExit}>
            End session
          </Button>
        </div>
      </Modal>

      <OutOfHearts
        open={state.phase === "out_of_hearts"}
        onRefilled={(hearts) => dispatch({ type: "refill", hearts })}
        onQuit={onExit}
      />
    </div>
  );
}
