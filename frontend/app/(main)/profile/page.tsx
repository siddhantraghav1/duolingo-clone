"use client";

/** Learner profile: header, statistics, weekly XP chart, streak calendar, achievements. */
import Link from "next/link";
import { useEffect, useState } from "react";

import AchievementBadge from "@/components/profile/AchievementBadge";
import StreakCalendar from "@/components/profile/StreakCalendar";
import XpChart from "@/components/profile/XpChart";
import { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Mascot from "@/components/ui/Mascot";
import SpanishFlag from "@/components/ui/SpanishFlag";
import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { useUser } from "@/lib/user-context";

export default function ProfilePage() {
  const { me } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);

  // load once, and again whenever the learner's total XP changes (e.g. after a demo reset)
  const totalXp = me?.total_xp;
  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => setFailed(true));
  }, [totalXp]);

  if (failed) {
    return (
      <div className="flex flex-col items-center py-16">
        <Mascot mood="sad" size={120} />
        <p className="mt-4 font-bold">Couldn&apos;t load your profile.</p>
      </div>
    );
  }
  if (!profile) return <p className="py-16 text-center text-muted">Loading…</p>;

  const today = profile.xp_last_7_days[profile.xp_last_7_days.length - 1].date;
  const joined = new Date(`${profile.joined_on}T00:00`).toLocaleDateString("en", { month: "long", year: "numeric" });
  const unlockedCount = profile.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="flex flex-col gap-8">
      {/* header */}
      <section className="flex flex-col items-center gap-4 border-b-2 border-line pb-8 text-center sm:flex-row sm:text-left">
        <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-blue-line bg-blue-light text-6xl">
          {profile.avatar}
        </span>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">{profile.name}</h1>
          <p className="text-muted">@{profile.username}</p>
          <p className="mt-2 text-muted">
            🕒 Joined {joined} · <SpanishFlag width={22} /> Spanish
          </p>
        </div>
        <Link href="/settings" className={buttonClasses("outline", "sm")}>
          ✏️ Edit profile
        </Link>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-extrabold">Statistics</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon="🔥" value={profile.streak} label="Day streak" />
          <Stat icon="⚡" value={profile.total_xp} label="Total XP" />
          <Stat icon="📚" value={profile.lessons_completed} label="Lessons completed" />
          <Stat icon="🎯" value={profile.perfect_lessons} label="Perfect lessons" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-extrabold">XP this week</h2>
        <Card>
          <XpChart days={profile.xp_last_7_days} />
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-extrabold">Streak calendar</h2>
        <Card>
          <StreakCalendar activeDates={profile.active_dates} today={today} />
          <p className="mt-4 text-center text-muted">
            Best streak: <b className="text-orange">{profile.longest_streak} days</b>
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold">Achievements</h2>
          <span className="font-bold text-muted">
            {unlockedCount} / {profile.achievements.length}
          </span>
        </div>
        <Card className="divide-y-2 divide-line py-0">
          {profile.achievements.map((achievement) => (
            <AchievementBadge key={achievement.code} achievement={achievement} />
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-extrabold">Friends</h2>
        <Card className="flex items-center gap-4">
          <span className="text-4xl">👋</span>
          <p className="text-muted">Following friends and friend quests are coming soon!</p>
        </Card>
      </section>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-line px-4 py-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xl font-extrabold">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
