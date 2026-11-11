/**
 * Sound effects, generated in the browser with the Web Audio API.
 * No audio files: each sound is a few short musical notes, so there is
 * nothing to download and no copyrighted audio.
 *
 *   playSound("correct")   // happy two-note "ding"
 *   playSound("wrong")     // low buzz
 *   playSound("complete")  // rising fanfare
 *
 * The on/off choice is saved in localStorage (toggled on the Settings page).
 */
import { useSyncExternalStore } from "react";

type SoundName = "correct" | "wrong" | "complete";

const STORAGE_KEY = "sound";
const CHANGE_EVENT = "soundchange";

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the setting just won't be remembered
  }
  window.dispatchEvent(new Event(CHANGE_EVENT)); // tell useSoundOn() to re-read
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** Whether sound is on, kept in sync with setSoundOn() (same idea as useTheme). */
export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribe, isSoundOn, () => true);
}

let audio: AudioContext | null = null;

/** Play one note: `frequency` in Hz, `start` and `length` in seconds. */
function note(frequency: number, start: number, length: number, wave: OscillatorType = "sine", volume = 0.15) {
  audio ??= new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const startAt = audio.currentTime + start;

  oscillator.type = wave;
  oscillator.frequency.value = frequency;
  // quick fade in and out, so the note doesn't "click"
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + length);

  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + length);
}

const SOUNDS: Record<SoundName, () => void> = {
  correct: () => {
    note(880, 0, 0.12); // A5
    note(1318.5, 0.1, 0.3); // E6
  },
  wrong: () => {
    note(196, 0, 0.2, "square", 0.06); // G3
    note(155.6, 0.15, 0.3, "square", 0.06); // D#3
  },
  complete: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => note(frequency, i * 0.12, 0.35, "triangle"));
  },
};

export function playSound(name: SoundName) {
  if (!isSoundOn()) return;
  try {
    SOUNDS[name]();
  } catch {
    // audio not available (old browser, blocked) - the app works without it
  }
}
