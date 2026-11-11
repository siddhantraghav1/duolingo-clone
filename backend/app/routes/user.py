"""
Learner endpoints:
  GET   /api/me             -> top bar stats
  PATCH /api/me/settings    -> change name / daily goal
  POST  /api/hearts/refill  -> spend gems for full hearts
  GET   /api/leaderboard    -> this week's XP ranking
  GET   /api/profile        -> stats, achievements, streak calendar

Dev tools (for demos and testing day-based logic):
  POST  /api/dev/next-day   -> pretend a day has passed
  POST  /api/dev/reset      -> wipe and re-seed the database
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..game_logic import MAX_HEARTS, REFILL_COST_GEMS, displayed_streak, now, refresh_hearts, today
from ..models import Achievement, Activity, User, UserAchievement
from ..schemas import LeaderboardEntry, MeOut, ProfileOut, SettingsIn
from ..seed import reset_database
from ..services import achievement_to_dict, get_current_user, get_user_stats, me_dict

router = APIRouter(prefix="/api", tags=["learner"])
dev_router = APIRouter(prefix="/api/dev", tags=["dev tools"])


@router.get("/me", response_model=MeOut)
def get_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return me_dict(db, user)


@router.patch("/me/settings", response_model=MeOut)
def update_settings(
    body: SettingsIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    if body.name is not None:
        user.name = body.name
    if body.daily_goal is not None:
        user.daily_goal = body.daily_goal
    db.commit()
    return me_dict(db, user)


@router.post("/hearts/refill", response_model=MeOut)
def refill_hearts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.hearts >= MAX_HEARTS:
        raise HTTPException(status_code=400, detail="Your hearts are already full")
    if user.gems < REFILL_COST_GEMS:
        raise HTTPException(status_code=400, detail="Not enough gems")

    user.gems -= REFILL_COST_GEMS
    user.hearts = MAX_HEARTS
    user.hearts_updated_at = now()
    db.commit()
    return me_dict(db, user)


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Everyone ranked by XP earned since Monday (like Duolingo's weekly leagues)."""
    day = today()
    week_start = day - timedelta(days=day.weekday())
    weekly_xp = func.coalesce(func.sum(Activity.xp_earned), 0).label("weekly_xp")

    rows = db.execute(
        select(User, weekly_xp)
        .outerjoin(Activity, and_(Activity.user_id == User.id, Activity.completed_on >= week_start))
        .group_by(User.id)
        .order_by(weekly_xp.desc(), User.name)
    ).all()

    return [
        {
            "rank": rank,
            "user_id": person.id,
            "name": person.name,
            "avatar": person.avatar,
            "xp": xp,
            "is_me": person.id == user.id,
        }
        for rank, (person, xp) in enumerate(rows, start=1)
    ]


@router.get("/profile", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    day = today()
    stats = get_user_stats(db, user)

    unlocked_on = dict(
        db.execute(
            select(UserAchievement.achievement_id, UserAchievement.unlocked_on).where(
                UserAchievement.user_id == user.id
            )
        ).all()
    )
    achievements = [
        achievement_to_dict(a, stats, unlocked_on.get(a.id))
        for a in db.scalars(select(Achievement).order_by(Achievement.id))
    ]

    active_dates = db.scalars(
        select(Activity.completed_on)
        .where(Activity.user_id == user.id, Activity.completed_on >= day - timedelta(days=90))
        .distinct()
        .order_by(Activity.completed_on)
    ).all()

    week_ago = day - timedelta(days=6)
    xp_by_day = dict(
        db.execute(
            select(Activity.completed_on, func.sum(Activity.xp_earned))
            .where(Activity.user_id == user.id, Activity.completed_on >= week_ago)
            .group_by(Activity.completed_on)
        ).all()
    )
    xp_last_7_days = [
        {"date": week_ago + timedelta(days=i), "xp": xp_by_day.get(week_ago + timedelta(days=i), 0)}
        for i in range(7)
    ]

    return {
        "name": user.name,
        "username": user.username,
        "avatar": user.avatar,
        "joined_on": user.created_at.date(),
        "total_xp": user.total_xp,
        "streak": displayed_streak(user, day),
        "longest_streak": user.longest_streak,
        "lessons_completed": stats["lessons_completed"],
        "perfect_lessons": stats["perfect_lessons"],
        "achievements": achievements,
        "active_dates": active_dates,
        "xp_last_7_days": xp_last_7_days,
    }


# ---------------------------------------------------------------- dev tools


@dev_router.post("/next-day", response_model=MeOut)
def simulate_next_day(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    one_day = timedelta(days=1)
    for activity in db.scalars(select(Activity)):
        activity.completed_on -= one_day
    for unlocked in db.scalars(select(UserAchievement)):
        unlocked.unlocked_on -= one_day
    for person in db.scalars(select(User)):
        person.hearts_updated_at -= one_day
        person.created_at -= one_day
        if person.last_active_date:
            person.last_active_date -= one_day

    refresh_hearts(user, now())
    db.commit()
    return me_dict(db, user)


@dev_router.post("/reset")
def reset_demo_data():
    reset_database()
    return {"status": "reset"}
