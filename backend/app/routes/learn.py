"""
The core lesson loop:
  GET  /api/path                     -> learning path with locked/active/completed skills
  GET  /api/lessons/{id}             -> exercises of a lesson (answers hidden)
  POST /api/exercises/{id}/check     -> grade one answer (wrong = lose a heart)
  POST /api/lessons/{id}/complete    -> award XP, extend streak, unlock achievements
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..game_logic import check_answer, lesson_xp, lose_heart, now
from ..models import Exercise, Lesson, User, UserMistake
from ..schemas import CheckIn, CheckOut, CompleteIn, CompleteOut, LessonOut, UnitOut
from ..services import build_path, exercise_to_dict, find_skill, finish_activity, get_current_user

router = APIRouter(prefix="/api", tags=["learn"])


@router.get("/path", response_model=list[UnitOut])
def get_path(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return build_path(db, user)


@router.get("/lessons/{lesson_id}", response_model=LessonOut)
def get_lesson(lesson_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    skill = find_skill(build_path(db, user), lesson.skill_id)
    if skill["state"] == "locked":
        raise HTTPException(status_code=403, detail="This lesson is locked")
    if user.hearts == 0:
        raise HTTPException(status_code=403, detail="out_of_hearts")

    return {
        "mode": "lesson",
        "title": lesson.skill.title,
        "lesson_id": lesson.id,
        "skill_id": lesson.skill_id,
        "exercises": [exercise_to_dict(e) for e in lesson.exercises],
    }


@router.post("/exercises/{exercise_id}/check", response_model=CheckOut)
def check_exercise(
    exercise_id: int,
    body: CheckIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")

    correct, correct_answer = check_answer(exercise.type, exercise.data, body.answer)
    saved_mistake = db.get(UserMistake, (user.id, exercise.id))

    if not correct:
        # hearts are only lost in normal lessons (practice is the way to earn them back,
        # legendary has its own lives)
        if body.mode == "lesson":
            lose_heart(user, now())
        if saved_mistake is None:
            db.add(UserMistake(user_id=user.id, exercise_id=exercise.id))
    elif body.mode == "practice" and saved_mistake is not None:
        db.delete(saved_mistake)  # fixed the mistake

    db.commit()
    return {"correct": correct, "correct_answer": correct_answer, "hearts": user.hearts}


@router.post("/lessons/{lesson_id}/complete", response_model=CompleteOut)
def complete_lesson(
    lesson_id: int,
    body: CompleteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    return finish_activity(
        db,
        user,
        mode="lesson",
        xp=lesson_xp(body.mistakes),
        mistakes=body.mistakes,
        duration_sec=body.duration_sec,
        lesson_id=lesson.id,
        skill_id=lesson.skill_id,
    )
