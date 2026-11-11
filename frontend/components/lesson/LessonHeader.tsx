/** Top of the lesson screen: quit (X), progress bar, legendary timer, hearts. */
import Countdown from "@/components/ui/Countdown";
import ProgressBar from "@/components/ui/ProgressBar";

type LessonHeaderProps = {
  progress: number; // 0 to 1
  hearts: number | null; // null = unlimited (practice)
  combo: number;
  timeLimit: number | null; // seconds, legendary only
  onTimeUp: () => void;
  onQuit: () => void;
};

export default function LessonHeader({ progress, hearts, combo, timeLimit, onTimeUp, onQuit }: LessonHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-[1000px] items-center gap-4 px-4 pt-6 sm:pt-10">
      <button
        onClick={onQuit}
        aria-label="Quit lesson"
        className="text-3xl leading-none font-bold text-faint hover:text-muted"
      >
        ✕
      </button>

      <div className="relative flex-1">
        <ProgressBar value={progress} height="h-4" color={timeLimit ? "bg-gold" : "bg-green"} />
        {combo >= 3 && (
          // "5 IN A ROW" streak label above the bar
          <span
            key={combo}
            className="absolute -top-6 left-0 animate-pop text-xs font-extrabold tracking-wide text-orange uppercase"
          >
            🔥 {combo} in a row
          </span>
        )}
      </div>

      {timeLimit !== null && (
        <span className="flex items-center gap-1 text-lg font-extrabold text-blue" aria-label="Time left">
          ⏱ <Countdown seconds={timeLimit} onDone={onTimeUp} />
        </span>
      )}

      <span className="flex items-center gap-1 text-lg font-extrabold text-red">
        <span className="text-2xl">❤️</span>
        {hearts === null ? "∞" : hearts}
      </span>
    </header>
  );
}
