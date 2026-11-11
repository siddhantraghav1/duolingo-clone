/**
 * TypeScript versions of the backend's response shapes (backend/app/schemas.py).
 * If you change a schema there, change it here too.
 */

// ---------------------------------------------------------------- learner

export type Me = {
  id: number;
  name: string;
  username: string;
  avatar: string;
  total_xp: number;
  gems: number;
  hearts: number;
  max_hearts: number;
  seconds_to_next_heart: number | null;
  streak: number;
  practiced_today: boolean;
  daily_goal: number;
  today_xp: number;
};

export type Settings = { name?: string; daily_goal?: 10 | 20 | 30 | 50 };

// ---------------------------------------------------------------- learning path

export type SkillState = "locked" | "active" | "completed";

export type Skill = {
  id: number;
  title: string;
  icon: string;
  position: number;
  state: SkillState;
  lessons_total: number;
  lessons_completed: number;
  next_lesson_id: number;
  legendary: boolean;
};

export type Unit = {
  id: number;
  position: number;
  title: string;
  description: string;
  color: string;
  skills: Skill[];
};

// ---------------------------------------------------------------- exercises
// `data` has a different shape for each exercise type (answers are never included).

export type MultipleChoiceData = { choices: { text: string; emoji: string }[] };
export type TranslateData = { sentence: string; words: string[]; tiles_lang: "en" | "es" };
export type FillBlankData = { sentence: string; translation: string; choices: string[] };
export type TypeAnswerData = { text: string };
export type MatchPairsData = { pairs: [string, string][] };

export type Exercise =
  | { id: number; type: "multiple_choice"; question: string; audio_text: string | null; data: MultipleChoiceData }
  | { id: number; type: "translate"; question: string; audio_text: string | null; data: TranslateData }
  | { id: number; type: "fill_blank"; question: string; audio_text: string | null; data: FillBlankData }
  | { id: number; type: "type_answer"; question: string; audio_text: string | null; data: TypeAnswerData }
  | { id: number; type: "match_pairs"; question: string; audio_text: string | null; data: MatchPairsData };

export type SessionMode = "lesson" | "practice" | "legendary";

export type LessonSession = {
  mode: SessionMode;
  title: string;
  lesson_id: number | null;
  skill_id: number | null;
  time_limit_sec: number | null;
  lives: number | null;
  exercises: Exercise[];
};

/** What the learner submits: text, or [spanish, english] pairs for match_pairs. */
export type Answer = string | [string, string][];

export type CheckResult = { correct: boolean; correct_answer: string; hearts: number };

export type Achievement = {
  code: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  unlocked: boolean;
  unlocked_on: string | null;
};

export type CompleteResult = {
  xp_earned: number;
  total_xp: number;
  streak: number;
  streak_extended: boolean;
  today_xp: number;
  daily_goal: number;
  hearts: number;
  new_achievements: Achievement[];
};

// ---------------------------------------------------------------- leaderboard & profile

export type LeaderboardEntry = {
  rank: number;
  user_id: number;
  name: string;
  avatar: string;
  xp: number;
  is_me: boolean;
};

export type Profile = {
  name: string;
  username: string;
  avatar: string;
  joined_on: string;
  total_xp: number;
  streak: number;
  longest_streak: number;
  lessons_completed: number;
  perfect_lessons: number;
  achievements: Achievement[];
  active_dates: string[];
  xp_last_7_days: { date: string; xp: number }[];
};
