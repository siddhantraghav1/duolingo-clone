"use client";

/**
 * One round button on the learning path, plus the card that opens when you tap it.
 *
 *   locked    -> grey, "complete the levels above" card
 *   active    -> unit colour, progress ring, bouncing START bubble
 *   completed -> unit colour with a crown badge; card offers practice + legendary
 *   legendary -> gold
 */
import Link from "next/link";

import { cn } from "@/lib/cn";
import { darken } from "@/lib/color";
import type { Skill } from "@/lib/types";

type SkillNodeProps = {
  skill: Skill;
  color: string; // unit colour
  offset: number; // px to the left/right, creates the zig-zag
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
};

const GOLD = "#ffc800";
const LOCKED = "var(--line)";

export default function SkillNode({ skill, color, offset, isOpen, onToggle, onClose }: SkillNodeProps) {
  const isLocked = skill.state === "locked";
  const isActive = skill.state === "active";
  const isCompleted = skill.state === "completed";

  const fill = isLocked ? LOCKED : skill.legendary ? GOLD : color;
  const edge = isLocked ? "var(--faint)" : darken(fill);

  return (
    // `left` (not transform) shifts the node: a transform would trap the fixed "click outside" layer below
    <div className={cn("relative flex flex-col items-center", isOpen && "z-30")} style={{ left: offset }}>
      {isActive && !isOpen && <StartBubble color={color} />}

      <div className="relative flex h-24 w-24 items-center justify-center">
        {isActive && <ProgressRing value={skill.lessons_completed / skill.lessons_total} color={color} />}

        <button
          onClick={onToggle}
          aria-label={`${skill.title} (${skill.state})`}
          // CSS variables let Tailwind's active: state change the edge without inline-style conflicts
          style={{ "--node": fill, "--node-edge": edge } as React.CSSProperties}
          className={cn(
            "relative z-[1] flex h-[70px] w-[70px] items-center justify-center rounded-full text-[34px]",
            "bg-[var(--node)] shadow-[0_7px_0_var(--node-edge)] transition-transform duration-75",
            "active:translate-y-[5px] active:shadow-[0_2px_0_var(--node-edge)]",
          )}
        >
          <span className={cn(isLocked && "opacity-40 grayscale")}>{skill.icon}</span>
        </button>

        {isCompleted && (
          <span className="absolute right-1 bottom-1 z-[2] flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg bg-gold text-base">
            👑
          </span>
        )}
      </div>

      <p className={cn("mt-1 text-sm font-extrabold", isLocked ? "text-faint" : "text-ink")}>{skill.title}</p>

      {isOpen && (
        <>
          {/* invisible full-screen layer: clicking anywhere else closes the card */}
          <div className="fixed inset-0 z-20" onClick={onClose} />
          <SkillCard skill={skill} color={color} offset={offset} />
        </>
      )}
    </div>
  );
}

/** Bouncing "START" label above the node you should do next. */
function StartBubble({ color }: { color: string }) {
  return (
    <div className="absolute -top-12 z-[3] animate-float">
      <div
        className="relative rounded-xl border-2 border-line bg-surface px-3 py-2 text-[15px] font-extrabold uppercase tracking-wide"
        style={{ color }}
      >
        Start
        <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-line bg-surface" />
      </div>
    </div>
  );
}

/** Circle around the active node showing lessons done / total. */
function ProgressRing({ value, color }: { value: number; color: string }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 96 96" className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--line)" strokeWidth="7" />
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}

/**
 * The card under a tapped node. It is centred in the column (not under the
 * shifted node) so it never goes off-screen on phones; only its arrow follows the node.
 */
function SkillCard({ skill, color, offset }: { skill: Skill; color: string; offset: number }) {
  const background = skill.state === "locked" ? "var(--surface-2)" : color;

  return (
    // Outer div = position (uses transform). Inner div = pop-in animation (also uses transform).
    // They must be separate elements, otherwise the animation would undo the centring.
    <div
      className="absolute top-full z-30 mt-4 w-72"
      style={{ left: "50%", transform: `translateX(calc(-50% - ${offset}px))` }}
    >
      <div className="relative animate-pop">
        <span
          className="absolute -top-2 h-4 w-4 -translate-x-1/2 rotate-45"
          style={{ left: `calc(50% + ${offset}px)`, background }}
        />
        <div
          className={cn(
            "relative rounded-2xl p-4",
            skill.state === "locked" ? "border-2 border-line text-muted" : "text-white",
          )}
          style={{ background }}
        >
          <h3 className="text-lg font-extrabold">{skill.title}</h3>
          <CardBody skill={skill} color={color} />
        </div>
      </div>
    </div>
  );
}

/** What the card says and offers, depending on the skill's state. */
function CardBody({ skill, color }: { skill: Skill; color: string }) {
  if (skill.state === "locked") {
    return (
      <>
        <p className="mt-1 mb-4 font-bold">Complete all levels above to unlock this!</p>
        <button disabled className="h-12 w-full rounded-2xl bg-line font-extrabold uppercase text-faint">
          Locked
        </button>
      </>
    );
  }

  if (skill.state === "active") {
    const lessonNumber = Math.min(skill.lessons_completed + 1, skill.lessons_total);
    return (
      <>
        <p className="mt-1 mb-4 font-bold opacity-90">
          Lesson {lessonNumber} of {skill.lessons_total}
        </p>
        <CardButton href={`/lesson/${skill.next_lesson_id}`} color={color} label="Start +10 XP" />
      </>
    );
  }

  // completed
  return (
    <>
      <p className="mt-1 mb-4 font-bold opacity-90">
        {skill.legendary
          ? "Legendary! You mastered this skill 👑"
          : "You completed this skill! Prove yourself to reach Legendary."}
      </p>
      <div className="flex flex-col gap-3">
        <CardButton href={`/lesson/${skill.next_lesson_id}`} color={color} label="Practice +10 XP" />
        {!skill.legendary && (
          <Link
            href={`/legendary/${skill.id}`}
            className="flex h-12 items-center justify-center rounded-2xl bg-gold font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_var(--color-gold-dark)] active:translate-y-[4px] active:shadow-none"
          >
            👑 Legendary +40 XP
          </Link>
        )}
      </div>
    </>
  );
}

/** White 3D button with text in the unit colour (Duolingo's style inside coloured cards). */
function CardButton({ href, color, label }: { href: string; color: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-12 items-center justify-center rounded-2xl bg-white font-extrabold uppercase tracking-wide shadow-[0_4px_0_rgba(0,0,0,0.15)] active:translate-y-[4px] active:shadow-none"
      style={{ color }}
    >
      {label}
    </Link>
  );
}
