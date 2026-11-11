"use client";

/**
 * "Which one of these is 'the water'?" - pick one of the picture cards.
 * Tapping a card reads the Spanish word aloud. Keys 1-4 pick a card.
 */
import { useState } from "react";

import { cn } from "@/lib/cn";
import { speak } from "@/lib/speech";
import type { MultipleChoiceData } from "@/lib/types";
import { useNumberKeys, type ExerciseProps } from "./shared";

export default function MultipleChoice({ data, onAnswer, disabled }: ExerciseProps<MultipleChoiceData>) {
  const [selected, setSelected] = useState<string | null>(null);

  function choose(text: string) {
    setSelected(text);
    onAnswer(text);
    speak(text);
  }

  useNumberKeys(data.choices.length, (index) => choose(data.choices[index].text), disabled);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {data.choices.map((choice, index) => {
        const isSelected = selected === choice.text;
        return (
          <button
            key={choice.text}
            onClick={() => choose(choice.text)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 sm:p-6",
              "active:translate-y-[4px] active:shadow-none disabled:pointer-events-none",
              isSelected
                ? "border-blue-line bg-blue-light text-blue shadow-[0_4px_0_var(--blue-soft-line)]"
                : "border-line text-ink shadow-[0_4px_0_var(--line)] hover:bg-surface-2",
            )}
          >
            <span className="text-6xl sm:text-7xl">{choice.emoji}</span>
            <span className="text-lg font-bold">{choice.text}</span>
            {/* keyboard number, like Duolingo */}
            <span
              className={cn(
                "absolute top-3 left-3 hidden h-7 w-7 items-center justify-center rounded-lg border-2 text-sm font-bold sm:flex",
                isSelected ? "border-blue-line text-blue" : "border-line text-faint",
              )}
            >
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
