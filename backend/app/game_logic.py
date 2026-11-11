"""
The game rules: hearts, streak, XP, answer checking and achievements.

"""
import re
import unicodedata
from datetime import date, datetime, timedelta

# ---------------------------------------------------------------- tunable numbers

MAX_HEARTS = 5
HEART_REFILL_MINUTES = 30  # one heart comes back every 30 minutes
REFILL_COST_GEMS = 350

LESSON_XP = 10
PERFECT_BONUS_XP = 5  # extra XP for a lesson with no mistakes
PRACTICE_XP = 10
LEGENDARY_XP = 40


def now() -> datetime:
    return datetime.now()


def today() -> date:
    return date.today()


# ---------------------------------------------------------------- hearts


def refresh_hearts(user, current_time: datetime) -> None:
    if user.hearts >= MAX_HEARTS:
        user.hearts = MAX_HEARTS
        user.hearts_updated_at = current_time
        return

    refill_time = timedelta(minutes=HEART_REFILL_MINUTES)
    hearts_gained = int((current_time - user.hearts_updated_at) / refill_time)
    if hearts_gained <= 0:
        return

    user.hearts = min(MAX_HEARTS, user.hearts + hearts_gained)
    user.hearts_updated_at += refill_time * hearts_gained
    if user.hearts == MAX_HEARTS:
        user.hearts_updated_at = current_time


def lose_heart(user, current_time: datetime) -> None:
    refresh_hearts(user, current_time)
    if user.hearts > 0:
        user.hearts -= 1


def gain_heart(user, current_time: datetime) -> None:
    refresh_hearts(user, current_time)
    user.hearts = min(MAX_HEARTS, user.hearts + 1)
    if user.hearts == MAX_HEARTS:
        user.hearts_updated_at = current_time


def seconds_until_next_heart(user, current_time: datetime) -> int | None:
    if user.hearts >= MAX_HEARTS:
        return None
    next_heart_at = user.hearts_updated_at + timedelta(minutes=HEART_REFILL_MINUTES)
    return max(0, int((next_heart_at - current_time).total_seconds()))


# ---------------------------------------------------------------- streak


def update_streak(user, day: date) -> bool:
    last = user.last_active_date
    if last == day:
        return False  # already counted today

    if last == day - timedelta(days=1):
        user.streak += 1  # practised yesterday -> streak continues
    else:
        user.streak = 1  # first time, or missed a day -> start again

    user.longest_streak = max(user.longest_streak, user.streak)
    user.last_active_date = day
    return True


def displayed_streak(user, day: date) -> int:
    if user.last_active_date is None:
        return 0
    if day - user.last_active_date > timedelta(days=1):
        return 0
    return user.streak


# ---------------------------------------------------------------- XP


def lesson_xp(mistakes: int) -> int:
    return LESSON_XP + (PERFECT_BONUS_XP if mistakes == 0 else 0)


# ---------------------------------------------------------------- answer checking


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")  # drop accent marks
    text = re.sub(r"[^\w\s]", " ", text)  # punctuation -> space
    return " ".join(text.split())


def check_answer(exercise_type: str, data: dict, answer) -> tuple[bool, str]:
    """Return (is_correct, correct_answer_to_show_the_learner)."""
    if exercise_type == "match_pairs":
        expected = {tuple(pair) for pair in data["pairs"]}
        given = {tuple(pair) for pair in answer} if isinstance(answer, list) else set()
        return given == expected, ""

    accepted = data["answers"]  # first one is the "main" answer
    if not isinstance(answer, str):
        return False, accepted[0]
    is_correct = normalize(answer) in {normalize(a) for a in accepted}
    return is_correct, accepted[0]


def hide_answers(data: dict) -> dict:
    return {key: value for key, value in data.items() if key != "answers"}


# ---------------------------------------------------------------- achievements


def reached_achievements(stats: dict, achievements: list) -> list:
    return [a for a in achievements if stats.get(a.metric, 0) >= a.target]
