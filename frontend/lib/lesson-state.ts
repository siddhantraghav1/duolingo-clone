/**
 * The lesson player's state machine, written as a React reducer.
 *
 *   answering --CHECK--> checking --server says--> correct ---CONTINUE--> next exercise (answering)
 *                                               \-> wrong   ---CONTINUE--> next exercise, or
 *                                                                         out_of_hearts / failed if no hearts left
 *   ...last exercise answered correctly + CONTINUE --> finished
 *   legendary only: timer reaches 0 (time_up) --> failed
 *
 * A wrong exercise is added again to the end of the queue, so the learner must
 * get it right before the lesson ends (like Duolingo).
 *
 * This file has no React components - only data in, data out - so it is easy to follow.
 */
import type { Answer, Exercise, SessionMode } from "./types";

export type Phase =
  | "answering" // learner is choosing an answer
  | "checking" // waiting for the server to grade it
  | "correct" // green feedback bar
  | "wrong" // red feedback bar
  | "out_of_hearts" // lesson mode: no hearts left -> modal
  | "failed" // legendary mode: no lives left
  | "finished"; // every exercise answered correctly

export type LessonState = {
  mode: SessionMode;
  queue: Exercise[]; // exercises still to do (wrong ones are appended again)
  index: number; // position in the queue
  total: number; // number of different exercises; progress = correctCount / total
  answer: Answer | null; // current selection, null = nothing chosen yet
  phase: Phase;
  correctAnswer: string; // shown in the red feedback bar
  correctCount: number;
  mistakes: number;
  combo: number; // correct answers in a row
  hearts: number | null; // null = unlimited (practice mode)
  failReason: "lives" | "time" | null; // why a legendary run failed
};

export type LessonAction =
  | { type: "answer"; answer: Answer | null }
  | { type: "check_start" }
  | { type: "check_failed" } // network error: let the learner try again
  | { type: "check_result"; correct: boolean; correctAnswer: string; serverHearts: number }
  | { type: "continue" }
  | { type: "refill"; hearts: number }
  | { type: "time_up" }; // legendary timer reached 0

export function createLessonState(exercises: Exercise[], mode: SessionMode, hearts: number | null): LessonState {
  return {
    mode,
    queue: exercises,
    index: 0,
    total: exercises.length,
    answer: null,
    phase: "answering",
    correctAnswer: "",
    correctCount: 0,
    mistakes: 0,
    combo: 0,
    hearts,
    failReason: null,
  };
}

/** Hearts after an answer: lessons trust the server, legendary counts its own lives, practice has none. */
function heartsAfterAnswer(state: LessonState, correct: boolean, serverHearts: number): number | null {
  if (state.mode === "lesson") return serverHearts;
  if (state.mode === "legendary" && state.hearts !== null) return correct ? state.hearts : state.hearts - 1;
  return null;
}

export function lessonReducer(state: LessonState, action: LessonAction): LessonState {
  switch (action.type) {
    case "answer":
      return state.phase === "answering" ? { ...state, answer: action.answer } : state;

    case "check_start":
      return { ...state, phase: "checking" };

    case "check_failed":
      return { ...state, phase: "answering" };

    case "check_result": {
      const hearts = heartsAfterAnswer(state, action.correct, action.serverHearts);
      if (action.correct) {
        return {
          ...state,
          phase: "correct",
          correctAnswer: action.correctAnswer,
          correctCount: state.correctCount + 1,
          combo: state.combo + 1,
          hearts,
        };
      }
      return {
        ...state,
        phase: "wrong",
        correctAnswer: action.correctAnswer,
        mistakes: state.mistakes + 1,
        combo: 0,
        hearts,
        queue: [...state.queue, state.queue[state.index]], // try this one again later
      };
    }

    case "continue": {
      const next = { ...state, index: state.index + 1, answer: null, correctAnswer: "" };
      if (state.hearts === 0) {
        return state.mode === "legendary"
          ? { ...next, phase: "failed", failReason: "lives" }
          : { ...next, phase: "out_of_hearts" };
      }
      if (next.index >= state.queue.length) {
        return { ...next, phase: "finished" };
      }
      return { ...next, phase: "answering" };
    }

    case "refill":
      return { ...state, hearts: action.hearts, phase: "answering" };

    case "time_up":
      // ignore if the run already ended (e.g. the last answer arrived just in time)
      if (state.phase === "finished" || state.phase === "failed") return state;
      return { ...state, phase: "failed", failReason: "time" };
  }
}

/** True when pressing CONTINUE now will end the lesson successfully. */
export function isLastStep(state: LessonState): boolean {
  return state.phase === "correct" && state.index + 1 >= state.queue.length;
}
