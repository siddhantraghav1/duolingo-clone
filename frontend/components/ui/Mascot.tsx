/**
 * "Pip", the app's own mascot: a round green sprout drawn with plain SVG shapes.
 * (Original artwork, so we don't copy Duolingo's owl.)
 * The mood changes the eyes, eyebrows, mouth and arms.
 */
import { cn } from "@/lib/cn";

export type MascotMood = "happy" | "sad" | "celebrate" | "thinking";

const INK = "#4b4b4b";
const BODY = "#58cc02";
const BODY_DARK = "#58a700";
const BELLY = "#89e219";

type MascotProps = { mood?: MascotMood; size?: number; className?: string };

export default function Mascot({ mood = "happy", size = 120, className }: MascotProps) {
  // where the pupils look
  const pupilY = mood === "sad" ? 65 : mood === "thinking" ? 56 : 62;
  const pupilX = mood === "thinking" ? 3 : 1;
  const armsUp = mood === "celebrate";

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn(mood === "celebrate" ? "animate-celebrate" : "animate-float", className)}
    >
      {/* leaf sprout on top */}
      <path d="M60 30 C58 18 50 10 38 10 C40 22 48 30 60 30 Z" fill={BODY_DARK} />
      <path d="M60 30 C62 16 72 8 86 10 C82 24 72 30 60 30 Z" fill={BELLY} />

      {/* arms */}
      {armsUp ? (
        <>
          <ellipse cx="16" cy="48" rx="8" ry="16" transform="rotate(-35 16 48)" fill={BODY_DARK} />
          <ellipse cx="104" cy="48" rx="8" ry="16" transform="rotate(35 104 48)" fill={BODY_DARK} />
        </>
      ) : (
        <>
          <ellipse cx="18" cy="80" rx="8" ry="14" transform="rotate(20 18 80)" fill={BODY_DARK} />
          <ellipse cx="102" cy="80" rx="8" ry="14" transform="rotate(-20 102 80)" fill={BODY_DARK} />
        </>
      )}

      {/* body, belly and feet */}
      <ellipse cx="60" cy="70" rx="44" ry="42" fill={BODY} />
      <ellipse cx="60" cy="88" rx="26" ry="18" fill={BELLY} />
      <ellipse cx="44" cy="111" rx="11" ry="6" fill={BODY_DARK} />
      <ellipse cx="76" cy="111" rx="11" ry="6" fill={BODY_DARK} />

      {/* eyes */}
      <circle cx="44" cy="60" r="13" fill="white" />
      <circle cx="76" cy="60" r="13" fill="white" />
      <circle cx={44 + pupilX} cy={pupilY} r="7" fill={INK} />
      <circle cx={76 + pupilX} cy={pupilY} r="7" fill={INK} />
      <circle cx={47 + pupilX} cy={pupilY - 3} r="2.5" fill="white" />
      <circle cx={79 + pupilX} cy={pupilY - 3} r="2.5" fill="white" />

      {/* sad eyebrows */}
      {mood === "sad" && (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round">
          <line x1="32" y1="45" x2="52" y2="40" />
          <line x1="68" y1="40" x2="88" y2="45" />
        </g>
      )}

      {/* cheeks */}
      <ellipse cx="28" cy="76" rx="7" ry="4" fill="#ff9fb2" opacity="0.7" />
      <ellipse cx="92" cy="76" rx="7" ry="4" fill="#ff9fb2" opacity="0.7" />

      {/* mouth */}
      {mood === "happy" && (
        <path d="M50 80 Q60 90 70 80" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {mood === "celebrate" && <path d="M47 78 Q60 98 73 78 Z" fill="#ea2b2b" />}
      {mood === "sad" && (
        <path d="M50 88 Q60 79 70 88" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {mood === "thinking" && (
        <path d="M54 84 L67 81" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      )}
    </svg>
  );
}
