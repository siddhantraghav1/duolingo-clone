"""
Database tables (SQLAlchemy models).

Course content          Learner data
--------------          ------------
units                   users
  └─ skills             activities          (every finished lesson / practice / legendary run)
       └─ lessons       user_mistakes       (wrong answers to practise later)
            └─ exercises  user_achievements  ──► achievements
"""
from datetime import date, datetime

from sqlalchemy import JSON, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


# ---------------------------------------------------------------- course content


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True)
    position: Mapped[int]  # order on the learning path (1, 2, 3 ...)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(200))
    color: Mapped[str] = mapped_column(String(7))  # hex colour of the unit banner

    skills: Mapped[list["Skill"]] = relationship(
        back_populates="unit", order_by="Skill.position", cascade="all, delete-orphan"
    )


class Skill(Base):
    """One circle (node) on the learning path."""

    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"))
    position: Mapped[int]
    title: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str] = mapped_column(String(10))  # emoji shown inside the node

    unit: Mapped[Unit] = relationship(back_populates="skills")
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="skill", order_by="Lesson.position", cascade="all, delete-orphan"
    )


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    position: Mapped[int]

    skill: Mapped[Skill] = relationship(back_populates="lessons")
    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="lesson", order_by="Exercise.position", cascade="all, delete-orphan"
    )


class Exercise(Base):
    """
    One question inside a lesson.

    `type` is one of: multiple_choice, translate, fill_blank, type_answer, match_pairs.
    `data` (JSON) holds the fields that differ per type, for example
        translate  -> {"sentence": "Yo bebo agua", "words": [...], "answers": ["I drink water"]}
    The "answers" key is removed before an exercise is sent to the browser.
    """

    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    position: Mapped[int]
    type: Mapped[str] = mapped_column(String(30))
    question: Mapped[str] = mapped_column(String(200))
    data: Mapped[dict] = mapped_column(JSON)
    audio_text: Mapped[str | None] = mapped_column(String(200))  # Spanish text to read aloud

    lesson: Mapped[Lesson] = relationship(back_populates="exercises")


# ---------------------------------------------------------------- learner data


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(50))
    avatar: Mapped[str] = mapped_column(String(10))  # emoji

    total_xp: Mapped[int] = mapped_column(default=0)
    gems: Mapped[int] = mapped_column(default=500)

    hearts: Mapped[int] = mapped_column(default=5)
    hearts_updated_at: Mapped[datetime] = mapped_column(default=datetime.now)

    streak: Mapped[int] = mapped_column(default=0)
    longest_streak: Mapped[int] = mapped_column(default=0)
    last_active_date: Mapped[date | None]  # last day the learner earned XP

    daily_goal: Mapped[int] = mapped_column(default=20)  # XP per day
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    activities: Mapped[list["Activity"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Activity(Base):
    """
    One finished session that earned XP. This table is the learner's history and
    is used to calculate: lesson progress, today's XP (daily goal), weekly
    leaderboard, streak calendar and achievement stats.

    mode = "lesson"    -> lesson_id + skill_id are set
    mode = "legendary" -> skill_id is set
    mode = "practice"  -> neither is set
    """

    __tablename__ = "activities"
    __table_args__ = (Index("ix_activities_user_date", "user_id", "completed_on"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    mode: Mapped[str] = mapped_column(String(20))
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"))
    skill_id: Mapped[int | None] = mapped_column(ForeignKey("skills.id", ondelete="SET NULL"))
    xp_earned: Mapped[int]
    mistakes: Mapped[int] = mapped_column(default=0)
    duration_sec: Mapped[int] = mapped_column(default=0)
    completed_on: Mapped[date]

    user: Mapped[User] = relationship(back_populates="activities")


class UserMistake(Base):
    """An exercise the learner got wrong. Removed once they answer it right in practice."""

    __tablename__ = "user_mistakes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    exercise: Mapped[Exercise] = relationship()


class Achievement(Base):
    """
    A badge definition, e.g. "Week Warrior: reach a 7 day streak".
    Unlocked when the learner's stat named by `metric` reaches `target`.
    """

    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(200))
    icon: Mapped[str] = mapped_column(String(10))
    metric: Mapped[str] = mapped_column(String(50))  # lessons_completed, total_xp, longest_streak ...
    target: Mapped[int]


class UserAchievement(Base):
    """Which learner unlocked which badge, and when."""

    __tablename__ = "user_achievements"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    achievement_id: Mapped[int] = mapped_column(
        ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True
    )
    unlocked_on: Mapped[date]

    achievement: Mapped[Achievement] = relationship()
