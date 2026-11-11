"""
Pydantic schemas: the exact JSON shape of every request and response.

FastAPI uses them to validate incoming data and to document the API at /docs.
The frontend's lib/types.ts mirrors these.
"""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

SkillState = Literal["locked", "active", "completed"]
SessionMode = Literal["lesson", "practice", "legendary"]


# ---------------------------------------------------------------- learner


class MeOut(BaseModel):
    """Everything the top bar needs."""

    id: int
    name: str
    username: str
    avatar: str
    total_xp: int
    gems: int
    hearts: int
    max_hearts: int
    seconds_to_next_heart: int | None  # None when hearts are full
    streak: int
    practiced_today: bool  # streak flame is lit
    daily_goal: int
    today_xp: int


class SettingsIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=30)
    daily_goal: Literal[10, 20, 30, 50] | None = None


# ---------------------------------------------------------------- learning path


class SkillOut(BaseModel):
    id: int
    title: str
    icon: str
    position: int
    state: SkillState
    lessons_total: int
    lessons_completed: int
    next_lesson_id: int  # lesson started when the node is tapped
    legendary: bool  # legendary challenge passed -> gold node


class UnitOut(BaseModel):
    id: int
    position: int
    title: str
    description: str
    color: str
    skills: list[SkillOut]


# ---------------------------------------------------------------- lesson player


class ExerciseOut(BaseModel):
    id: int
    type: str
    question: str
    data: dict  # never contains the answers
    audio_text: str | None


class LessonOut(BaseModel):
    """A playable session: a normal lesson, a practice round, or a legendary challenge."""

    mode: SessionMode
    title: str
    lesson_id: int | None = None
    skill_id: int | None = None
    time_limit_sec: int | None = None  # legendary only
    lives: int | None = None  # legendary only (it does not use the learner's hearts)
    exercises: list[ExerciseOut]


class CheckIn(BaseModel):
    # text answer, or for match_pairs a list of [spanish, english] pairs
    answer: str | list[list[str]]
    mode: SessionMode = "lesson"


class CheckOut(BaseModel):
    correct: bool
    correct_answer: str
    hearts: int


class CompleteIn(BaseModel):
    mistakes: int = Field(default=0, ge=0)
    duration_sec: int = Field(default=0, ge=0)


class AchievementOut(BaseModel):
    code: str
    title: str
    description: str
    icon: str
    target: int
    progress: int
    unlocked: bool
    unlocked_on: date | None


class CompleteOut(BaseModel):
    """Shown on the 'Lesson complete!' screen."""

    xp_earned: int
    total_xp: int
    streak: int
    streak_extended: bool  # first activity today -> show the streak celebration
    today_xp: int
    daily_goal: int
    hearts: int
    new_achievements: list[AchievementOut]


# ---------------------------------------------------------------- leaderboard & profile


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    name: str
    avatar: str
    xp: int  # XP earned this week
    is_me: bool


class DayXp(BaseModel):
    date: date
    xp: int


class ProfileOut(BaseModel):
    name: str
    username: str
    avatar: str
    joined_on: date
    total_xp: int
    streak: int
    longest_streak: int
    lessons_completed: int
    perfect_lessons: int
    achievements: list[AchievementOut]
    active_dates: list[date]  # for the streak calendar
    xp_last_7_days: list[DayXp]
