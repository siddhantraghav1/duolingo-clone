"use client";

/**
 * Full-screen results shown after a session:
 *   LessonComplete -> confetti, XP / accuracy / time boxes
 *   StreakScreen   -> big flame when today's first lesson extended the streak
 *   LessonFailed   -> legendary challenge lost
 */
import confetti from "canvas-confetti";
import { useEffect } from "react";

import Button from "@/components/ui/Button";
import { formatTime } from "@/components/ui/Countdown";
import Mascot from "@/components/ui/Mascot";
import { playSound } from "@/lib/sounds";
import type { CompleteResult } from "@/lib/types";

type LessonCompleteProps = {
  result: CompleteResult;
  accuracy: number; // 0 to 100
  seconds: number;
  title: string;
  note: string | null; // extra line, e.g. "You earned a heart back"
  onContinue: () => void;
};

export function LessonComplete({ result, accuracy, seconds, title, note, onContinue }: LessonCompleteProps) {
  // celebrate once when the screen appears
  useEffect(() => {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    playSound("complete");
  }, []);

  const goalReached = result.today_xp >= result.daily_goal;

  return (
    <EndLayout button={<Button size="lg" fullWidth onClick={onContinue}>Continue</Button>}>
      <Mascot mood="celebrate" size={170} />
      <h1 className="mt-6 text-3xl font-extrabold text-gold-dark">{title}</h1>
      {note && <p className="mt-2 font-bold text-red">{note}</p>}
      {goalReached && <p className="mt-2 font-bold text-muted">🏆 Daily goal reached!</p>}

      <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
        <StatBox label="Total XP" value={`⚡ ${result.xp_earned}`} color="var(--color-gold)" />
        <StatBox
          label={accuracy === 100 ? "Perfect" : "Accuracy"}
          value={`🎯 ${accuracy}%`}
          color="var(--color-green)"
        />
        <StatBox label="Time" value={`⏱ ${formatTime(seconds)}`} color="var(--color-blue)" />
      </div>
    </EndLayout>
  );
}

/** Coloured box with a label strip on top, like Duolingo's lesson results. */
function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border-2 p-[2px]" style={{ borderColor: color, background: color }}>
      <p className="py-1 text-center text-xs font-extrabold tracking-wide text-white uppercase">{label}</p>
      <p className="rounded-xl bg-surface py-3 text-center text-lg font-extrabold sm:text-xl" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

export function StreakScreen({ streak, onContinue }: { streak: number; onContinue: () => void }) {
  return (
    <EndLayout button={<Button size="lg" fullWidth onClick={onContinue}>Continue</Button>}>
      <span className="animate-pop text-[120px] leading-none">🔥</span>
      <p className="mt-4 text-7xl font-black text-orange">{streak}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-orange">day streak!</h1>
      <p className="mt-4 max-w-sm text-muted">
        Practice each day to keep your streak growing. See you tomorrow!
      </p>
    </EndLayout>
  );
}

type LessonFailedProps = { reason: "lives" | "time"; onRetry: () => void; onQuit: () => void };

export function LessonFailed({ reason, onRetry, onQuit }: LessonFailedProps) {
  return (
    <EndLayout
      button={
        <div className="flex w-full flex-col gap-3 sm:flex-row-reverse">
          <Button size="lg" fullWidth onClick={onRetry}>Try again</Button>
          <Button size="lg" variant="outline" fullWidth onClick={onQuit}>Back to path</Button>
        </div>
      }
    >
      <Mascot mood="sad" size={160} />
      <h1 className="mt-6 text-3xl font-extrabold">{reason === "time" ? "Time's up!" : "Out of lives"}</h1>
      <p className="mt-2 text-muted">Legendary needs focus. Review the skill and try again!</p>
    </EndLayout>
  );
}

/** Centered content with the action button(s) in a footer, matching the lesson layout. */
function EndLayout({ children, button }: { children: React.ReactNode; button: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">{children}</main>
      <footer className="border-t-2 border-line">
        <div className="mx-auto flex max-w-[1000px] justify-end px-4 py-6">
          <div className="w-full sm:w-auto sm:min-w-[200px]">{button}</div>
        </div>
      </footer>
    </div>
  );
}
