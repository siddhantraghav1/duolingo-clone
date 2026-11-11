"use client";

/**
 * Home page: the learning path.
 * Loads units + skills from GET /api/path and draws them as a zig-zag of round
 * nodes, one coloured section per unit, ending in a trophy.
 */
import { useEffect, useRef, useState } from "react";

import SkillNode from "@/components/path/SkillNode";
import UnitHeader from "@/components/path/UnitHeader";
import Button from "@/components/ui/Button";
import Mascot, { type MascotMood } from "@/components/ui/Mascot";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Unit } from "@/lib/types";

// Horizontal shift (px) of each node, repeating. Gives the path its snake shape.
const ZIGZAG = [0, 44, 70, 44, 0, -44, -70, -44];
const MASCOT_MOODS: MascotMood[] = ["happy", "thinking", "celebrate"];

export default function LearnPage() {
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openSkillId, setOpenSkillId] = useState<number | null>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);

  function loadPath() {
    setFailed(false);
    api.getPath().then(setUnits).catch(() => setFailed(true));
  }

  useEffect(() => {
    api.getPath().then(setUnits).catch(() => setFailed(true));
  }, []);

  // once the path is drawn, scroll so the skill to do next is in view
  useEffect(() => {
    activeNodeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [units]);

  if (failed) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Mascot mood="sad" size={120} />
        <p className="mt-4 mb-6 text-lg font-bold">Couldn&apos;t load your path.</p>
        <Button onClick={loadPath}>Try again</Button>
      </div>
    );
  }

  if (!units) return <PathSkeleton />;

  let nodeIndex = 0; // counts nodes across all units so the zig-zag flows from one unit into the next

  return (
    <div className="-mt-6">
      {units.map((unit, unitIndex) => {
        // put the mascot on the side this unit's nodes are NOT bending towards
        const mascotOnLeft = ZIGZAG[(nodeIndex + 1) % ZIGZAG.length] > 0;
        const unitDone = unit.skills.every((skill) => skill.state === "completed");

        return (
          <section key={unit.id} className="mb-6">
            <UnitHeader unit={unit} />

            <div className="relative flex flex-col items-center gap-12 pt-16 pb-6">
              {unit.skills.map((skill) => {
                const offset = ZIGZAG[nodeIndex++ % ZIGZAG.length];
                return (
                  <div key={skill.id} ref={skill.state === "active" ? activeNodeRef : undefined}>
                    <SkillNode
                      skill={skill}
                      color={unit.color}
                      offset={offset}
                      isOpen={openSkillId === skill.id}
                      onToggle={() => setOpenSkillId(openSkillId === skill.id ? null : skill.id)}
                      onClose={() => setOpenSkillId(null)}
                    />
                  </div>
                );
              })}

              <UnitTrophy done={unitDone} offset={ZIGZAG[nodeIndex++ % ZIGZAG.length]} />

              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 -translate-y-1/2",
                  mascotOnLeft ? "left-[calc(50%-170px)]" : "left-[calc(50%+60px)]",
                )}
              >
                <Mascot mood={MASCOT_MOODS[unitIndex % MASCOT_MOODS.length]} size={110} />
              </div>
            </div>
          </section>
        );
      })}

      <p className="py-6 text-center font-bold text-muted">More units coming soon! 🚀</p>
    </div>
  );
}

/** The last stop of every unit: grey until all its skills are completed, then gold. */
function UnitTrophy({ done, offset }: { done: boolean; offset: number }) {
  return (
    <div className="relative flex flex-col items-center" style={{ left: offset }}>
      <div
        className={cn(
          "flex h-[70px] w-[70px] items-center justify-center rounded-full text-[34px]",
          done ? "bg-gold shadow-[0_7px_0_var(--color-gold-dark)]" : "bg-line shadow-[0_7px_0_var(--faint)]",
        )}
        title={done ? "Unit complete!" : "Finish every skill in this unit"}
      >
        <span className={cn(!done && "opacity-40 grayscale")}>🏆</span>
      </div>
      <p className={cn("mt-2 text-sm font-extrabold", done ? "text-ink" : "text-faint")}>Unit review</p>
    </div>
  );
}

/** Grey placeholder shapes while the path loads. */
function PathSkeleton() {
  return (
    <div className="flex animate-pulse flex-col items-center gap-8">
      <div className="h-20 w-full rounded-2xl bg-line" />
      {ZIGZAG.slice(0, 5).map((offset, i) => (
        <div key={i} className="relative h-[70px] w-[70px] rounded-full bg-line" style={{ left: offset }} />
      ))}
    </div>
  );
}
