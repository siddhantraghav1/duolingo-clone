/** One achievement row: badge, title, description, and progress (or unlock date). */
import ProgressBar from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import type { Achievement } from "@/lib/types";

export default function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const { icon, title, description, progress, target, unlocked, unlocked_on } = achievement;

  return (
    <div className="flex items-center gap-4 py-4">
      <span
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl",
          unlocked ? "bg-gold shadow-[0_4px_0_var(--color-gold-dark)]" : "bg-surface-2",
        )}
      >
        <span className={cn(!unlocked && "opacity-40 grayscale")}>{icon}</span>
      </span>

      <div className="flex-1">
        <p className="text-lg font-extrabold">{title}</p>
        <p className="text-muted">{description}</p>
        {unlocked ? (
          <p className="mt-1 text-sm font-bold text-gold-dark">
            ✓ Unlocked {new Date(`${unlocked_on}T00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </p>
        ) : (
          <div className="mt-2">
            <ProgressBar value={progress / target} color="bg-gold" height="h-4" label={`${progress} / ${target}`} />
          </div>
        )}
      </div>
    </div>
  );
}
