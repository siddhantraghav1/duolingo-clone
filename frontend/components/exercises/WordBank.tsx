"use client";

/**
 * "Translate this sentence" - tap words from the bank to build the answer.
 * Tapping a word in the answer line sends it back to the bank.
 * Spanish sentences / Spanish tiles are read aloud.
 */
import { useState } from "react";

import { speak } from "@/lib/speech";
import type { TranslateData } from "@/lib/types";
import { SpeechBubble, WordTile, type ExerciseProps } from "./shared";

export default function WordBank({ data, onAnswer, disabled, audioText }: ExerciseProps<TranslateData>) {
  // positions (in data.words) of the tiles placed in the answer, in order.
  // We store positions, not words, because the same word can appear twice.
  const [picked, setPicked] = useState<number[]>([]);

  function update(next: number[]) {
    setPicked(next);
    onAnswer(next.length ? next.map((i) => data.words[i]).join(" ") : null);
  }

  function pick(wordIndex: number) {
    update([...picked, wordIndex]);
    if (data.tiles_lang === "es") speak(data.words[wordIndex]);
  }

  return (
    <div className="flex flex-col gap-6">
      <SpeechBubble text={data.sentence} speakText={audioText} />

      {/* answer area: two ruled lines like Duolingo */}
      <div className="flex min-h-[124px] flex-wrap content-start gap-2 border-y-2 border-line bg-[linear-gradient(transparent_59px,var(--line)_59px,var(--line)_61px,transparent_61px)] py-2">
        {picked.map((wordIndex) => (
          <WordTile
            key={wordIndex}
            word={data.words[wordIndex]}
            disabled={disabled}
            onClick={() => update(picked.filter((i) => i !== wordIndex))}
          />
        ))}
      </div>

      {/* word bank: picked words leave a grey slot behind */}
      <div className="flex flex-wrap justify-center gap-2">
        {data.words.map((word, wordIndex) =>
          picked.includes(wordIndex) ? (
            <WordTile key={wordIndex} word={word} ghost />
          ) : (
            <WordTile
              key={wordIndex}
              word={word}
              disabled={disabled}
              onClick={() => pick(wordIndex)}
            />
          ),
        )}
      </div>
    </div>
  );
}
