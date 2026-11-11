"""
Helper functions shared by several routes.

game_logic.py decides the rules; this file reads/writes the database and
combines the two (e.g. "finish a lesson" = save activity + add XP + update streak
+ unlock achievements).
"""
from datetime import date

from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .game_logic import (
    MAX_HEARTS,
    displayed_streak,
    hide_answers,
    now,
    reached_achievements,
    refresh_hearts,
    seconds_until_next_heart,
    today,
    update_streak,
)
from .models import Achievement, Activity, Exercise, Skill, Unit, User, UserAchievement

DEFAULT_USERNAME = "learner"


# ---------------------------------------------------------------- current user


def get_current_user(db: Session = Depends(get_db)) -> User:
    """
    FastAPI dependency that returns the logged-in learner.

    Authentication is simplified (allowed by the assignment): every request acts
    as the seeded learner. Adding real login would only change this function.
    """
    user = db.scalar(select(User).where(User.username == DEFAULT_USERNAME))
    if user is None:
        raise HTTPException(status_code=500, detail="Database is not seeded")
    refresh_hearts(user, now())  # apply hearts that grew back since last visit
    db.commit()
    return user


def me_dict(db: Session, user: User) -> dict:
    day = today()
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "avatar": user.avatar,
        "total_xp": user.total_xp,
        "gems": user.gems,
        "hearts": user.hearts,
        "max_hearts": MAX_HEARTS,
        "seconds_to_next_heart": seconds_until_next_heart(user, now()),
        "streak": displayed_streak(user, day),
        "practiced_today": user.last_active_date == day,
        "daily_goal": user.daily_goal,
        "today_xp": xp_on_day(db, user.id, day),
    }


# ---------------------------------------------------------------- progress queries


def xp_on_day(db: Session, user_id: int, day: date) -> int:
    total = db.scalar(
        select(func.sum(Activity.xp_earned)).where(
            Activity.user_id == user_id, Activity.completed_on == day
        )
    )
    return total or 0


def completed_lesson_ids(db: Session, user_id: int) -> set[int]:
    return set(
        db.scalars(
            select(Activity.lesson_id).where(
                Activity.user_id == user_id, Activity.mode == "lesson"
            )
        )
    )


def legendary_skill_ids(db: Session, user_id: int) -> set[int]:
    return set(
        db.scalars(
            select(Activity.skill_id).where(
                Activity.user_id == user_id, Activity.mode == "legendary"
            )
        )
    )


def build_path(db: Session, user: User) -> list[dict]:
    """
    The learning path with a state for every skill:
      completed - all its lessons are done
      active    - the first skill that is not completed (the one to do next)
      locked    - every skill after the active one
    Nothing about locking is stored; it is worked out from finished lessons.
    """
    units = db.scalars(
        select(Unit)
        .options(selectinload(Unit.skills).selectinload(Skill.lessons))
        .order_by(Unit.position)
    ).all()
    done = completed_lesson_ids(db, user.id)
    legendary = legendary_skill_ids(db, user.id)

    found_active = False
    path = []
    for unit in units:
        skills = []
        for skill in unit.skills:
            lesson_ids = [lesson.id for lesson in skill.lessons]
            lessons_completed = sum(1 for lesson_id in lesson_ids if lesson_id in done)

            if lessons_completed == len(lesson_ids):
                state = "completed"
            elif not found_active:
                state = "active"
                found_active = True
            else:
                state = "locked"

            # first unfinished lesson; a completed skill replays its first lesson
            next_lesson_id = next((i for i in lesson_ids if i not in done), lesson_ids[0])

            skills.append(
                {
                    "id": skill.id,
                    "title": skill.title,
                    "icon": skill.icon,
                    "position": skill.position,
                    "state": state,
                    "lessons_total": len(lesson_ids),
                    "lessons_completed": lessons_completed,
                    "next_lesson_id": next_lesson_id,
                    "legendary": skill.id in legendary,
                }
            )
        path.append(
            {
                "id": unit.id,
                "position": unit.position,
                "title": unit.title,
                "description": unit.description,
                "color": unit.color,
                "skills": skills,
            }
        )
    return path


def find_skill(path: list[dict], skill_id: int) -> dict | None:
    for unit in path:
        for skill in unit["skills"]:
            if skill["id"] == skill_id:
                return skill
    return None


def exercise_to_dict(exercise: Exercise) -> dict:
    return {
        "id": exercise.id,
        "type": exercise.type,
        "question": exercise.question,
        "data": hide_answers(exercise.data),
        "audio_text": exercise.audio_text,
    }


# ---------------------------------------------------------------- stats & achievements


def get_user_stats(db: Session, user: User) -> dict:
    """Numbers that achievements are measured against (keys = Achievement.metric)."""

    def count_activities(*conditions) -> int:
        return db.scalar(
            select(func.count(Activity.id)).where(Activity.user_id == user.id, *conditions)
        )

    return {
        "lessons_completed": count_activities(Activity.mode == "lesson"),
        "perfect_lessons": count_activities(Activity.mode == "lesson", Activity.mistakes == 0),
        "legendary_completed": count_activities(Activity.mode == "legendary"),
        "total_xp": user.total_xp,
        "longest_streak": user.longest_streak,
    }


def achievement_to_dict(achievement: Achievement, stats: dict, unlocked_on: date | None) -> dict:
    return {
        "code": achievement.code,
        "title": achievement.title,
        "description": achievement.description,
        "icon": achievement.icon,
        "target": achievement.target,
        "progress": min(stats.get(achievement.metric, 0), achievement.target),
        "unlocked": unlocked_on is not None,
        "unlocked_on": unlocked_on,
    }


def unlock_new_achievements(db: Session, user: User) -> list[dict]:
    """Save every achievement the learner has just reached and return them."""
    stats = get_user_stats(db, user)
    already_unlocked = set(
        db.scalars(
            select(UserAchievement.achievement_id).where(UserAchievement.user_id == user.id)
        )
    )
    candidates = [a for a in db.scalars(select(Achievement)) if a.id not in already_unlocked]

    day = today()
    newly_unlocked = reached_achievements(stats, candidates)
    for achievement in newly_unlocked:
        db.add(UserAchievement(user_id=user.id, achievement_id=achievement.id, unlocked_on=day))
    return [achievement_to_dict(a, stats, day) for a in newly_unlocked]


# ---------------------------------------------------------------- finishing a session


def finish_activity(
    db: Session,
    user: User,
    *,
    mode: str,
    xp: int,
    mistakes: int,
    duration_sec: int,
    lesson_id: int | None = None,
    skill_id: int | None = None,
) -> dict:
    """
    Used when a lesson, practice or legendary run is finished:
    save it, add XP, extend the streak, unlock achievements.
    Returns the data for the "Lesson complete!" screen.
    """
    day = today()
    db.add(
        Activity(
            user_id=user.id,
            mode=mode,
            lesson_id=lesson_id,
            skill_id=skill_id,
            xp_earned=xp,
            mistakes=mistakes,
            duration_sec=duration_sec,
            completed_on=day,
        )
    )
    user.total_xp += xp
    streak_extended = update_streak(user, day)
    new_achievements = unlock_new_achievements(db, user)
    db.commit()

    return {
        "xp_earned": xp,
        "total_xp": user.total_xp,
        "streak": user.streak,
        "streak_extended": streak_extended,
        "today_xp": xp_on_day(db, user.id, day),
        "daily_goal": user.daily_goal,
        "hearts": user.hearts,
        "new_achievements": new_achievements,
    }
