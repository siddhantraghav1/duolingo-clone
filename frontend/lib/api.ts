/**
 * Every call to the backend lives in this one file, so components never build
 * URLs themselves. Requests go to /api/... and next.config.ts forwards them to FastAPI.
 */
import type {
  Answer,
  CheckResult,
  CompleteResult,
  LeaderboardEntry,
  LessonSession,
  Me,
  Profile,
  SessionMode,
  Settings,
  Unit,
} from "./types";

/** Error with the HTTP status, so pages can react, e.g. 403 "out_of_hearts". */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.detail ?? response.statusText);
  }
  return response.json();
}

type Finish = { mistakes: number; duration_sec: number };

export const api = {
  // learner
  getMe: () => request<Me>("/me"),
  updateSettings: (settings: Settings) => request<Me>("/me/settings", "PATCH", settings),
  refillHearts: () => request<Me>("/hearts/refill", "POST"),
  getLeaderboard: () => request<LeaderboardEntry[]>("/leaderboard"),
  getProfile: () => request<Profile>("/profile"),

  // learning path & lessons
  getPath: () => request<Unit[]>("/path"),
  getLesson: (lessonId: number) => request<LessonSession>(`/lessons/${lessonId}`),
  checkAnswer: (exerciseId: number, answer: Answer, mode: SessionMode) =>
    request<CheckResult>(`/exercises/${exerciseId}/check`, "POST", { answer, mode }),
  completeLesson: (lessonId: number, result: Finish) =>
    request<CompleteResult>(`/lessons/${lessonId}/complete`, "POST", result),

  // practice & legendary
  getPractice: () => request<LessonSession>("/practice/mistakes"),
  completePractice: (result: Finish) => request<CompleteResult>("/practice/complete", "POST", result),
  getLegendary: (skillId: number) => request<LessonSession>(`/skills/${skillId}/legendary`),
  completeLegendary: (skillId: number, result: Finish) =>
    request<CompleteResult>(`/skills/${skillId}/legendary/complete`, "POST", result),

  // dev tools
  nextDay: () => request<Me>("/dev/next-day", "POST"),
  resetDemo: () => request<{ status: string }>("/dev/reset", "POST"),
};
