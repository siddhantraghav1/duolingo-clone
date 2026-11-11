"""
Bonus modes:
  GET  /api/practice/mistakes              -> practise your wrong answers
  POST /api/practice/complete              -> +1 heart and XP
  GET  /api/skills/{id}/legendary          -> timed challenge on a completed skill
  POST /api/skills/{id}/legendary/complete -> skill turns gold
"""
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..game_logic import LEGENDARY_XP, PRACTICE_XP, gain_heart, now
from ..models import Exercise, Skill, User, UserMistake
from ..schemas import CompleteIn, CompleteOut, LessonOut
from ..services import (
    build_path,
    completed_lesson_ids,
    exercise_to_dict,
    find_skill,
    finish_activity,
    get_current_user,
)

router = APIRouter(prefix="/api", tags=["practice"])

PRACTICE_SIZE = 8
LEGENDARY_SIZE = 10
LEGENDARY_SECONDS = 120
LEGENDARY_LIVES = 3


@router.get("/practice/mistakes", response_model=LessonOut)
def practice_mistakes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Recent mistakes first; topped up with random exercises from finished lessons."""
    exercises = list(
        db.scalars(
            select(Exercise)
            .join(UserMistake, UserMistake.exercise_id == Exercise.id)
            .where(UserMistake.user_id == user.id)
            .order_by(UserMistake.created_at.desc())
            .limit(PRACTICE_SIZE)
        )
    )

    missing = PRACTICE_SIZE - len(exercises)
    finished_lessons = completed_lesson_ids(db, user.id)
    if missing > 0 and finished_lessons:
        already_picked = [e.id for e in exercises]
        exercises += db.scalars(
            select(Exercise)
            .where(Exercise.lesson_id.in_(finished_lessons), Exercise.id.not_in(already_picked))
            .order_by(func.random())
            .limit(missing)
        )

    if not exercises:
        raise HTTPException(status_code=400, detail="Finish a lesson before practising")

    return {
        "mode": "practice",
        "title": "Practice",
        "exercises": [exercise_to_dict(e) for e in exercises],
    }


@router.post("/practice/complete", response_model=CompleteOut)
def complete_practice(
    body: CompleteIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    gain_heart(user, now())  # practising is how you earn hearts back
    return finish_activity(
        db, user, mode="practice", xp=PRACTICE_XP,
        mistakes=body.mistakes, duration_sec=body.duration_sec,
    )


def get_completed_skill(db: Session, user: User, skill_id: int) -> Skill:
    skill = db.get(Skill, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    if find_skill(build_path(db, user), skill_id)["state"] != "completed":
        raise HTTPException(status_code=403, detail="Complete this skill first")
    return skill


@router.get("/skills/{skill_id}/legendary", response_model=LessonOut)
def legendary_challenge(
    skill_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    skill = get_completed_skill(db, user, skill_id)
    exercises = [exercise for lesson in skill.lessons for exercise in lesson.exercises]
    random.shuffle(exercises)

    return {
        "mode": "legendary",
        "title": f"{skill.title} · Legendary",
        "skill_id": skill.id,
        "time_limit_sec": LEGENDARY_SECONDS,
        "lives": LEGENDARY_LIVES,
        "exercises": [exercise_to_dict(e) for e in exercises[:LEGENDARY_SIZE]],
    }


@router.post("/skills/{skill_id}/legendary/complete", response_model=CompleteOut)
def complete_legendary(
    skill_id: int,
    body: CompleteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    skill = get_completed_skill(db, user, skill_id)
    return finish_activity(
        db, user, mode="legendary", xp=LEGENDARY_XP,
        mistakes=body.mistakes, duration_sec=body.duration_sec, skill_id=skill.id,
    )
