"use client";

/**
 * "Fill in the blank" - tap the word that completes the Spanish sentence.
 * Keys 1-3 pick a word; the chosen word is read aloud.
 */
import { useState } from "react";

import { cn } from "@/lib/cn";
import { speak } from "@/lib/speech";
import type { FillBlankData } from "@/lib/types";
import { WordTile, useNumberKeys, type ExerciseProps } from "./shared";

export default function FillBlank({ data, onAnswer, disabled }: ExerciseProps<FillBlankData>) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [before, after] = data.sentence.split("___");

  function choose(word: string | null) {
    setChosen(word);
    onAnswer(word);
    if (word) speak(word);
  }

  useNumberKeys(data.choices.length, (index) => choose(data.choices[index]), disabled);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          <span>{before}</span>
          <span
            className={cn(
              "inline-flex min-w-24 justify-center border-b-4 pb-1",
              chosen ? "border-blue-line" : "border-line",
            )}
          >
            {chosen ? (
              <WordTile word={chosen} disabled={disabled} onClick={() => choose(null)} />
            ) : (
              <span className="px-4 py-2 text-lg text-transparent">___</span>
            )}
          </span>
          <span>{after}</span>
        </p>
        <p className="mt-3 text-lg text-muted">“{data.translation}”</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {data.choices.map((word) =>
          word === chosen ? (
            <WordTile key={word} word={word} ghost />
          ) : (
            <WordTile key={word} word={word} disabled={disabled} onClick={() => choose(word)} />
          ),
        )}
      </div>
    </div>
  );
}
