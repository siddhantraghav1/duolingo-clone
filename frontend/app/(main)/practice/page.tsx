"use client";

/**
 * Practice hub:
 *   - "Practice your mistakes" -> /review (earns back a heart)
 *   - Legendary challenges for every completed skill -> /legendary/[id]
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Mascot from "@/components/ui/Mascot";
import { api } from "@/lib/api";
import type { Skill } from "@/lib/types";
import { useUser } from "@/lib/user-context";

export default function PracticePage() {
  const { me } = useUser();
  const [completed, setCompleted] = useState<Skill[] | null>(null);

  useEffect(() => {
    api
      .getPath()
      .then((units) => setCompleted(units.flatMap((u) => u.skills).filter((s) => s.state === "completed")))
      .catch(() => setCompleted([]));
  }, []);

  const heartsFull = me ? me.hearts >= me.max_hearts : true;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Practice</h1>

      <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Mascot mood="thinking" size={100} className="shrink-0" />
        <div className="flex-1">
          <h2 className="text-xl font-extrabold">Practice your mistakes</h2>
          <p className="mt-1 text-muted">
            Review words you got wrong before.{" "}
            {heartsFull ? "Earn XP to reach your daily goal." : "Finish to earn back a ❤️."}
          </p>
        </div>
        <Link href="/review" className={buttonClasses("secondary")}>
          Start +10 XP
        </Link>
      </Card>

      <Card>
        <h2 className="text-xl font-extrabold">👑 Legendary challenges</h2>
        <p className="mt-1 text-muted">
          Beat a completed skill in 2 minutes with only 3 lives. Win and the skill turns gold!
        </p>

        <div className="mt-4 flex flex-col divide-y-2 divide-line">
          {completed === null && <p className="py-4 text-muted">Loading…</p>}
          {completed?.length === 0 && (
            <p className="py-4 font-bold text-muted">Complete a skill on the path to unlock its challenge.</p>
          )}
          {completed?.map((skill) => (
            <div key={skill.id} className="flex items-center gap-4 py-3">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${skill.legendary ? "bg-gold" : "bg-surface-2"}`}
              >
                {skill.icon}
              </span>
              <span className="flex-1 text-lg font-bold">{skill.title}</span>
              {skill.legendary && <span className="text-sm font-extrabold text-gold-dark uppercase">Legendary 👑</span>}
              <Link href={`/legendary/${skill.id}`} className={buttonClasses("gold", "sm")}>
                {skill.legendary ? "Replay" : "Start"}
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
