"use client";

import { useEffect, useState } from "react";

/** "4:59" style text */
export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type CountdownProps = {
  seconds: number; // starting value
  onDone?: () => void; // called once when it reaches 0
};

/**
 * Live "m:ss" timer that counts down every second.
 * To restart it with a new value, give it a new `key` (React then creates a fresh one).
 */
export default function Countdown({ seconds, onDone }: CountdownProps) {
  const [endsAt] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (secondsLeft === 0) onDone?.();
  }, [secondsLeft, onDone]);

  return <>{formatTime(secondsLeft)}</>;
}
