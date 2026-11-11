"use client";

/**
 * Loads a session from the backend, then hands it to <LessonPlayer>.
 * Used by the /lesson, /legendary and practice pages - only `mode` and `id` differ.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import Mascot from "@/components/ui/Mascot";
import { api, ApiError } from "@/lib/api";
import type { LessonSession, SessionMode } from "@/lib/types";
import { useUser } from "@/lib/user-context";
import LessonPlayer, { type FinishInfo } from "./LessonPlayer";
import OutOfHearts from "./OutOfHearts";

type LessonScreenProps = {
  mode: SessionMode;
  id?: number; // lesson id (lesson mode) or skill id (legendary mode)
};

function loadSession(mode: SessionMode, id = 0): Promise<LessonSession> {
  if (mode === "lesson") return api.getLesson(id);
  if (mode === "legendary") return api.getLegendary(id);
  return api.getPractice();
}

function finishSession(mode: SessionMode, id: number, info: FinishInfo) {
  if (mode === "lesson") return api.completeLesson(id, info);
  if (mode === "legendary") return api.completeLegendary(id, info);
  return api.completePractice(info);
}

export default function LessonScreen({ mode, id = 0 }: LessonScreenProps) {
  const router = useRouter();
  const { me, refreshMe } = useUser();
  const [session, setSession] = useState<LessonSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // increase to load (and play) again

  useEffect(() => {
    let cancelled = false;
    loadSession(mode, id)
      .then((loaded) => !cancelled && setSession(loaded))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "network"));
    return () => {
      cancelled = true;
    };
  }, [mode, id, attempt]);

  function restart() {
    setSession(null);
    setError(null);
    setAttempt((n) => n + 1);
  }

  function exit() {
    refreshMe(); // update hearts / XP / streak in the menus
    router.push("/");
  }

  async function finish(info: FinishInfo) {
    const result = await finishSession(mode, id, info);
    refreshMe();
    return result;
  }

  if (error === "out_of_hearts") {
    return (
      <>
        <LessonLoading />
        <OutOfHearts open onRefilled={restart} onQuit={exit} />
      </>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Mascot mood="sad" size={140} />
        <p className="text-lg font-bold">
          {error === "network" ? "Can't reach the server. Is the backend running?" : error}
        </p>
        <Link href="/" className={buttonClasses("primary")}>
          Back to path
        </Link>
      </div>
    );
  }

  if (!session || !me) return <LessonLoading />;

  const startHearts = mode === "lesson" ? me.hearts : mode === "legendary" ? session.lives : null;

  return (
    <LessonPlayer
      key={attempt}
      session={session}
      startHearts={startHearts}
      onFinish={finish}
      onExit={exit}
      onRetry={restart}
    />
  );
}

/** Shown while a session loads (also used as the Suspense fallback of the pages). */
export function LessonLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Mascot mood="thinking" size={140} />
      <p className="text-lg font-bold text-muted">Loading…</p>
    </div>
  );
}
