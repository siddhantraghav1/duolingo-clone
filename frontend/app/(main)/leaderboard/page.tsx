"use client";

/**
 * Weekly league, Duolingo style:
 *   top 3          -> promotion zone (green line)
 *   bottom 2       -> demotion zone (red line)
 *   your row       -> highlighted
 * Ranking comes from GET /api/leaderboard (XP earned since Monday).
 */
import { useEffect, useState } from "react";

import Mascot from "@/components/ui/Mascot";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/lib/types";

const PROMOTE = 3; // top N move up a league
const DEMOTE = 2; // bottom N move down

// Only Bronze is real; the others show what's ahead.
const LEAGUES = [
  { name: "Bronze", color: "#cd7f32" },
  { name: "Silver", color: "#c0c0c0" },
  { name: "Gold", color: "#ffc800" },
  { name: "Sapphire", color: "#1cb0f6" },
  { name: "Ruby", color: "#ff4b4b" },
];

/** Days until the week ends on Sunday night (Monday = 7, Sunday = 1). */
function daysLeftInWeek() {
  const mondayBased = (new Date().getDay() + 6) % 7; // Mon=0 ... Sun=6
  return 7 - mondayBased;
}

export default function LeaderboardPage() {
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    api
      .getLeaderboard()
      .then((entries) => {
        setBoard(entries);
        // read the clock here, not during render: Next.js prerenders pages on the
        // server, and a time read during render would be frozen into that HTML
        setDaysLeft(daysLeftInWeek());
      })
      .catch(() => setBoard([]));
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* league shields: current one in colour, the rest locked */}
      <div className="flex items-end gap-3">
        {LEAGUES.map((league, i) => (
          <Shield key={league.name} color={league.color} active={i === 0} />
        ))}
      </div>

      <h1 className="mt-4 text-2xl font-extrabold">Bronze League</h1>
      <p className="mt-1 text-muted">Top {PROMOTE} advance to the next league</p>
      {daysLeft !== null && (
        <p className="mt-1 font-extrabold text-gold-dark">
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </p>
      )}

      <div className="mt-6 w-full border-t-2 border-line pt-2">
        {board === null && <p className="py-8 text-center text-muted">Loading…</p>}
        {board?.length === 0 && (
          <div className="flex flex-col items-center py-8">
            <Mascot mood="sad" size={100} />
            <p className="mt-4 font-bold">Couldn&apos;t load the league.</p>
          </div>
        )}

        {board?.map((entry) => (
          <div key={entry.user_id}>
            {/* zone dividers sit between rows */}
            {entry.rank === board.length - DEMOTE + 1 && <ZoneLine kind="demote" />}
            <Row entry={entry} />
            {entry.rank === PROMOTE && <ZoneLine kind="promote" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const medal = ["", "text-gold", "text-[#a5a5a5]", "text-[#cd7f32]"][entry.rank] ?? "";
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl px-4 py-3",
        entry.is_me ? "bg-blue-light" : "hover:bg-surface-2",
      )}
    >
      <span className={cn("w-8 text-center text-lg font-extrabold", medal || "text-muted")}>
        {entry.rank}
      </span>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-2xl">
        {entry.avatar}
      </span>
      <span className={cn("flex-1 text-lg font-bold", entry.is_me && "text-blue")}>
        {entry.name}
        {entry.is_me && " (you)"}
      </span>
      <span className="font-bold text-muted">{entry.xp} XP</span>
    </div>
  );
}

function ZoneLine({ kind }: { kind: "promote" | "demote" }) {
  const promote = kind === "promote";
  return (
    <div className={cn("my-2 flex items-center gap-3 text-sm font-extrabold uppercase", promote ? "text-green-dark" : "text-red")}>
      <span className={cn("h-0.5 flex-1", promote ? "bg-green" : "bg-red")} />
      {promote ? "⬆ Promotion zone" : "⬇ Demotion zone"}
      <span className={cn("h-0.5 flex-1", promote ? "bg-green" : "bg-red")} />
    </div>
  );
}

/** League badge drawn with SVG: a shield shape. */
function Shield({ color, active }: { color: string; active: boolean }) {
  const size = active ? 64 : 44;
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" aria-hidden="true" className={cn(!active && "opacity-60")}>
      <path d="M20 2 L37 8 V22 C37 33 29 39 20 42 C11 39 3 33 3 22 V8 Z" fill={active ? color : "var(--line)"} />
      <path d="M20 8 L31 12 V22 C31 29 26 33 20 35 C14 33 9 29 9 22 V12 Z" fill="white" opacity={active ? 0.3 : 0.5} />
      {!active && <text x="20" y="27" textAnchor="middle" fontSize="12">🔒</text>}
    </svg>
  );
}
