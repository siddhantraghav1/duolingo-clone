/**
 * Bar chart of XP earned on each of the last 7 days (one series, so no legend).
 *  - colour: blue-dark (#1899d6), checked with a palette validator to keep
 *    >= 3:1 contrast on both the light and the dark background
 *  - thin bars with 4px rounded tops, standing on one baseline
 *  - only today's bar carries a number; hover any day for its exact value
 *  - a hidden <table> gives screen readers the same numbers
 */
import { cn } from "@/lib/cn";

type Day = { date: string; xp: number };

const CHART_HEIGHT = 140; // px available for the tallest bar

function weekday(isoDate: string) {
  return new Date(`${isoDate}T00:00`).toLocaleDateString("en", { weekday: "short" });
}

function longDate(isoDate: string) {
  return new Date(`${isoDate}T00:00`).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
}

export default function XpChart({ days }: { days: Day[] }) {
  const max = Math.max(10, ...days.map((d) => d.xp)); // at least 10, so tiny days don't fill the chart
  const lastIndex = days.length - 1; // the last day is today

  return (
    <figure>
      <div className="flex items-end gap-2 border-b-2 border-line" style={{ height: CHART_HEIGHT + 24 }}>
        {days.map((day, i) => {
          const height = Math.round((day.xp / max) * CHART_HEIGHT);
          const isToday = i === lastIndex;
          return (
            // the whole column is the hover target, bigger than the bar itself
            <div key={day.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              {isToday && day.xp > 0 && (
                <span className="mb-1 text-xs font-extrabold text-ink">{day.xp}</span>
              )}
              {day.xp > 0 && (
                <div
                  className="w-full max-w-7 rounded-t-[4px] bg-blue-dark transition-opacity group-hover:opacity-80"
                  style={{ height }}
                />
              )}
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-lg bg-ink px-2 py-1 text-xs font-bold whitespace-nowrap text-bg group-hover:block"
              >
                {longDate(day.date)} · {day.xp} XP
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {days.map((day, i) => (
          <span
            key={day.date}
            className={cn("flex-1 text-center text-xs font-bold", i === lastIndex ? "text-ink" : "text-muted")}
          >
            {i === lastIndex ? "Today" : weekday(day.date)}
          </span>
        ))}
      </div>

      {/* same data for screen readers */}
      <table className="sr-only">
        <caption>XP earned per day, last 7 days</caption>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{longDate(day.date)}</th>
              <td>{day.xp} XP</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
