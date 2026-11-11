import { cn } from "@/lib/cn";

type ProgressBarProps = {
  value: number; // 0 to 1
  color?: string; // Tailwind background class
  height?: string; // Tailwind height class
  label?: string; // optional text in the middle, e.g. "5 / 20"
};

/** Rounded progress bar with the light "shine" stripe on top, like Duolingo's. */
export default function ProgressBar({ value, color = "bg-green", height = "h-4", label }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(1, value)) * 100;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-line", height)}>
      <div
        className={cn("relative h-full rounded-full transition-[width] duration-500 ease-out", color)}
        style={{ width: `${percent}%` }}
      >
        <div className="absolute inset-x-2 top-[20%] h-[25%] rounded-full bg-white/30" />
      </div>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-ink/70">
          {label}
        </span>
      )}
    </div>
  );
}
