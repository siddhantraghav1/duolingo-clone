"use client";

/**
 * "Tap the matching pairs" - Spanish words on the left, English on the right.
 * Tap one on each side: a correct pair turns grey and stays, a wrong pair flashes red.
 * When every pair is matched, the answer is sent automatically (no CHECK button).
 */
import { useState } from "react";

import { cn } from "@/lib/cn";
import { speak } from "@/lib/speech";
import type { MatchPairsData } from "@/lib/types";
import { shuffle, type ExerciseProps } from "./shared";

type Side = "left" | "right";
type Pick = { side: Side; word: string };

export default function MatchPairs({ data, onAnswer, disabled }: ExerciseProps<MatchPairsData>) {
  // shuffle both columns once, when the exercise appears
  const [left] = useState(() => shuffle(data.pairs.map(([spanish]) => spanish)));
  const [right] = useState(() => shuffle(data.pairs.map(([, english]) => english)));

  const [selected, setSelected] = useState<Pick | null>(null);
  const [matched, setMatched] = useState<string[]>([]); // spanish words already matched
  const [wrong, setWrong] = useState<Pick[]>([]); // the two words flashing red

  const englishFor = (spanish: string) => data.pairs.find(([es]) => es === spanish)?.[1];
  const isMatched = (pick: Pick) =>
    pick.side === "left" ? matched.includes(pick.word) : matched.some((es) => englishFor(es) === pick.word);

  function tap(pick: Pick) {
    if (pick.side === "left") speak(pick.word); // left column is Spanish

    // first tap, or another word on the same side -> just select it
    if (!selected || selected.side === pick.side) {
      setSelected(pick);
      return;
    }

    const spanish = pick.side === "left" ? pick.word : selected.word;
    const english = pick.side === "right" ? pick.word : selected.word;
    setSelected(null);

    if (englishFor(spanish) === english) {
      const nowMatched = [...matched, spanish];
      setMatched(nowMatched);
      if (nowMatched.length === data.pairs.length) {
        onAnswer(nowMatched.map((es) => [es, englishFor(es)!] as [string, string]));
      }
    } else {
      setWrong([selected, pick]);
      setTimeout(() => setWrong([]), 500);
    }
  }

  function column(side: Side, words: string[]) {
    return (
      <div className="flex flex-col gap-3">
        {words.map((word) => {
          const pick = { side, word };
          const done = isMatched(pick);
          const isSelected = selected?.side === side && selected.word === word;
          const isWrong = wrong.some((w) => w.side === side && w.word === word);
          return (
            <button
              key={word}
              disabled={disabled || done}
              onClick={() => tap(pick)}
              className={cn(
                "h-14 rounded-2xl border-2 px-3 text-lg font-bold active:translate-y-[4px] active:shadow-none",
                done && "border-line text-faint opacity-60",
                !done && isWrong && "animate-shake border-red bg-red-light text-red shadow-[0_4px_0_var(--color-red)]",
                !done && !isWrong && isSelected &&
                  "border-blue-line bg-blue-light text-blue shadow-[0_4px_0_var(--blue-soft-line)]",
                !done && !isWrong && !isSelected &&
                  "border-line text-ink shadow-[0_4px_0_var(--line)] hover:bg-surface-2",
              )}
            >
              {word}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-8">
      {column("left", left)}
      {column("right", right)}
    </div>
  );
}
