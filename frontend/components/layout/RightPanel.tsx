"use client";

/**
 * Right column on wide screens (xl, >=1280px): stats, league rank, daily goal and hearts.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";
import Countdown from "@/components/ui/Countdown";
import ProgressBar from "@/components/ui/ProgressBar";
import { api } from "@/lib/api";
import type { LeaderboardEntry, Me } from "@/lib/types";
import { useUser } from "@/lib/user-context";
import StatsBar from "./StatsBar";

export default function RightPanel() {
  const { me } = useUser();
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);

  // reload the rank whenever the learner's XP changes
  const totalXp = me?.total_xp;
  useEffect(() => {
    if (totalXp === undefined) return;
    api
      .getLeaderboard()
      .then((board) => setMyRank(board.find((entry) => entry.is_me) ?? null))
      .catch(() => setMyRank(null));
  }, [totalXp]);

  return (
    <aside className="sticky top-0 hidden h-screen w-[368px] shrink-0 flex-col gap-6 overflow-y-auto py-6 xl:flex">
      <StatsBar />
      {myRank && <LeagueCard entry={myRank} />}
      {me && <DailyGoalCard me={me} />}
      {me && me.hearts < me.max_hearts && <HeartsCard me={me} />}
    </aside>
  );
}

function LeagueCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Bronze League</h2>
        <Link href="/leaderboard" className="text-sm font-extrabold uppercase text-blue">
          View league
        </Link>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <span className="text-5xl">🥉</span>
        <p className="text-muted">
          You&apos;re ranked <b className="text-ink">#{entry.rank}</b> this week with{" "}
          <b className="text-ink">{entry.xp} XP</b>
        </p>
      </div>
    </Card>
  );
}

function DailyGoalCard({ me }: { me: Me }) {
  const done = me.today_xp >= me.daily_goal;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Daily goal</h2>
        <Link href="/settings" className="text-sm font-extrabold uppercase text-blue">
          Edit goal
        </Link>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <span className="text-4xl">{done ? "🏆" : "⚡"}</span>
        <div className="flex-1">
          <p className="mb-2 font-bold">{done ? "Goal reached, great job!" : `Earn ${me.daily_goal} XP`}</p>
          <ProgressBar
            value={me.today_xp / me.daily_goal}
            color="bg-gold"
            height="h-5"
            label={`${Math.min(me.today_xp, me.daily_goal)} / ${me.daily_goal}`}
          />
        </div>
      </div>
    </Card>
  );
}

function HeartsCard({ me }: { me: Me }) {
  return (
    <Card>
      <h2 className="text-xl font-extrabold">Hearts</h2>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-2xl tracking-widest">
          {"❤️".repeat(me.hearts)}
          <span className="opacity-25 grayscale">{"❤️".repeat(me.max_hearts - me.hearts)}</span>
        </span>
      </div>
      {me.seconds_to_next_heart !== null && (
        <p className="mt-2 text-sm text-muted">
          Next heart in{" "}
          <b className="text-ink">
            <Countdown key={me.seconds_to_next_heart} seconds={me.seconds_to_next_heart} />
          </b>
          {" · "}
          <Link href="/shop" className="font-bold text-blue">
            Refill now
          </Link>
        </p>
      )}
    </Card>
  );
}
