"use client";

/** Course flag, streak, gems and hearts. Shown in the TopBar (phones) and RightPanel (desktop). */
import Link from "next/link";

import SpanishFlag from "@/components/ui/SpanishFlag";
import { cn } from "@/lib/cn";
import { useUser } from "@/lib/user-context";

export default function StatsBar() {
  const { me, error } = useUser();

  if (error) {
    return <p className="rounded-xl bg-red-light px-4 py-2 text-sm font-bold text-red">⚠️ {error}</p>;
  }

  const litFlame = me?.practiced_today ?? false;

  return (
    <div className="flex items-center justify-between gap-1">
      <Link href="/" title="Learning Spanish" className="rounded-xl px-3 py-2 hover:bg-surface-2">
        <SpanishFlag />
      </Link>
      <Stat
        href="/profile"
        icon="🔥"
        value={me?.streak}
        label={litFlame ? "Day streak" : "Do a lesson today to extend your streak"}
        className={litFlame ? "text-orange" : "text-faint"}
        iconClassName={litFlame ? undefined : "opacity-50 grayscale"}
      />
      <Stat href="/shop" icon="💎" value={me?.gems} label="Gems" className="text-blue" />
      <Stat href="/shop" icon="❤️" value={me?.hearts} label="Hearts" className="text-red" />
    </div>
  );
}

type StatProps = {
  href: string;
  icon: string;
  label: string;
  value?: number; // undefined while loading
  className?: string;
  iconClassName?: string;
};

function Stat({ href, icon, label, value, className, iconClassName }: StatProps) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-[17px] font-extrabold hover:bg-surface-2",
        className,
      )}
    >
      <span className={cn("text-2xl leading-none", iconClassName)}>{icon}</span>
      <span>{value ?? "–"}</span>
    </Link>
  );
}
