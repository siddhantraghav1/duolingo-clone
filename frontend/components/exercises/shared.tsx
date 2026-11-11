"use client";

/** Small pieces reused by several exercise types. */
import { useEffect } from "react";

import Mascot from "@/components/ui/Mascot";
import { cn } from "@/lib/cn";
import { speak } from "@/lib/speech";
import type { Answer } from "@/lib/types";

/** Props every exercise component receives. */
export type ExerciseProps<Data> = {
  data: Data;
  onAnswer: (answer: Answer | null) => void; // null = nothing selected
  disabled: boolean; // true after CHECK, so the answer can't change
  audioText: string | null; // Spanish text to read aloud, if any
};

/**
 * Keyboard shortcuts: pressing 1, 2, 3 ... calls onPick(0), onPick(1), onPick(2) ...
 * Used by the exercises that show numbered options.
 */
export function useNumberKeys(count: number, onPick: (index: number) => void, disabled: boolean) {
  useEffect(() => {
    if (disabled) return;
    function onKeyDown(event: KeyboardEvent) {
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= count) onPick(number - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, onPick, disabled]);
}

/** A word button, as in Duolingo's word bank. `ghost` = empty grey slot left behind. */
export function WordTile({
  word,
  onClick,
  disabled = false,
  ghost = false,
}: {
  word: string;
  onClick?: () => void;
  disabled?: boolean;
  ghost?: boolean;
}) {
  if (ghost) {
    // keeps the space so the other tiles don't jump around
    return (
      <span className="rounded-xl bg-line px-4 py-2 text-lg font-bold text-transparent select-none">
        {word}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl border-2 border-line bg-surface px-4 py-2 text-lg font-bold text-ink",
        "shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none",
        disabled && "pointer-events-none",
      )}
    >
      {word}
    </button>
  );
}

/**
 * The mascot "saying" a sentence, used for translate and type exercises.
 * If `speakText` is given, it is read aloud once when the exercise appears,
 * and the blue speaker button reads it again.
 */
export function SpeechBubble({ text, speakText = null }: { text: string; speakText?: string | null }) {
  useEffect(() => {
    if (speakText) speak(speakText);
  }, [speakText]);

  return (
    <div className="flex items-end gap-3">
      <Mascot size={90} className="shrink-0" />
      <div className="relative mb-6 flex items-center gap-3 rounded-2xl border-2 border-line px-4 py-3 text-lg font-bold">
        {speakText && (
          <button
            onClick={() => speak(speakText)}
            aria-label="Play audio"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue text-lg text-white shadow-[0_3px_0_var(--color-blue-dark)] active:translate-y-[3px] active:shadow-none"
          >
            🔊
          </button>
        )}
        {text}
        {/* little tail pointing at the mascot */}
        <span className="absolute top-1/2 -left-[9px] h-4 w-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-line bg-bg" />
      </div>
    </div>
  );
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
