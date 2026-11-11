/**
 * Month view with every day the learner practised marked in orange (like Duolingo's streak calendar).
 * `today` comes from the server data, so the component never reads the clock during render.
 */
import { cn } from "@/lib/cn";

type StreakCalendarProps = {
  activeDates: string[]; // "2026-11-05" ...
  today: string;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const pad = (n: number) => n.toString().padStart(2, "0");

export default function StreakCalendar({ activeDates, today }: StreakCalendarProps) {
  const [year, month] = today.split("-").map(Number); // month is 1-12
  const daysInMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this one
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday = 0
  const active = new Set(activeDates);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });

  // empty cells before day 1, so the 1st lands under the right weekday
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p className="mb-3 text-center font-extrabold">{monthName}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day, i) => (
          <span key={i} className="pb-1 text-xs font-bold text-faint">
            {day}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} />;
          const iso = `${year}-${pad(month)}-${pad(day)}`;
          const practised = active.has(iso);
          return (
            <span
              key={iso}
              title={practised ? "Practised" : undefined}
              className={cn(
                "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                practised ? "bg-orange text-white" : "text-muted",
                iso === today && "ring-2 ring-blue ring-offset-2 ring-offset-bg",
              )}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
