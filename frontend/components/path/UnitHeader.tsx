"use client";

/**
 * Coloured banner at the start of each unit ("UNIT 1 · Order food, greet people ...").
 * It is sticky: while you scroll through a unit, its banner stays at the top,
 * then the next unit's banner pushes it away - just like Duolingo.
 */
import { useToast } from "@/components/ui/Toast";
import { darken } from "@/lib/color";
import type { Unit } from "@/lib/types";

export default function UnitHeader({ unit }: { unit: Unit }) {
  const showToast = useToast();

  return (
    // the bg-bg wrapper hides the path scrolling underneath the sticky banner
    // top-[58px] = just below the TopBar; on xl screens there is no TopBar
    <div className="sticky top-[58px] z-10 bg-bg pt-3 pb-2 xl:top-0 xl:pt-6">
      <div
        className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 text-white"
        style={{ backgroundColor: unit.color, boxShadow: `0 4px 0 ${darken(unit.color)}` }}
      >
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide opacity-80">{unit.title}</p>
          <h2 className="text-xl font-extrabold leading-tight">{unit.description}</h2>
        </div>
        <button
          onClick={() => showToast("Guidebooks are coming soon!", "📖")}
          className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-white/40 px-3 py-2 text-sm font-extrabold uppercase hover:bg-white/10"
        >
          <span className="text-lg">📖</span>
          <span className="hidden sm:inline">Guidebook</span>
        </button>
      </div>
    </div>
  );
}
