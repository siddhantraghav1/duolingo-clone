"use client";

/** "Type this in English" - free text answer. */
import type { TypeAnswerData } from "@/lib/types";
import { SpeechBubble, type ExerciseProps } from "./shared";

export default function TypeAnswer({ data, onAnswer, disabled, audioText }: ExerciseProps<TypeAnswerData>) {
  return (
    <div className="flex flex-col gap-6">
      <SpeechBubble text={data.text} speakText={audioText} />
      <textarea
        autoFocus
        disabled={disabled}
        rows={4}
        placeholder="Type in English"
        onChange={(event) => onAnswer(event.target.value.trim() || null)}
        // Enter submits (handled by the lesson player), so don't add a new line
        onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
        className="w-full resize-none rounded-2xl border-2 border-line bg-surface-2 p-4 text-lg outline-none focus:border-blue-line"
      />
    </div>
  );
}
