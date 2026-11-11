/**
 * Text-to-speech with the browser's built-in Web Speech API.
 * Reads Spanish words and sentences aloud - no audio files or paid service needed.
 *
 *   speak("Yo bebo agua")
 */
import { isSoundOn } from "./sounds";

export function speak(text: string, lang = "es-ES") {
  if (!isSoundOn() || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  synth.cancel(); // stop whatever was still being read

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9; // a little slower, easier for learners

  // prefer a real Spanish voice if the device has one
  const voice = synth.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
  if (voice) utterance.voice = voice;

  synth.speak(utterance);
}
