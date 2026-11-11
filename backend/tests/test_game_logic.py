"""Unit tests for the pure game rules (no database, no HTTP)."""
from datetime import date, datetime, timedelta

from app.game_logic import (
    HEART_REFILL_MINUTES,
    MAX_HEARTS,
    check_answer,
    displayed_streak,
    lesson_xp,
    lose_heart,
    normalize,
    refresh_hearts,
    seconds_until_next_heart,
    update_streak,
)
from app.models import User

TODAY = date(2026, 11, 11)
NOW = datetime(2026, 11, 11, 12, 0)


def make_user(**fields) -> User:
    values = dict(hearts=MAX_HEARTS, hearts_updated_at=NOW, streak=0,
                  longest_streak=0, last_active_date=None)
    values.update(fields)
    return User(**values)


# ---------------------------------------------------------------- streak


def test_first_activity_starts_streak_at_one():
    user = make_user()
    assert update_streak(user, TODAY) is True
    assert user.streak == 1


def test_activity_next_day_extends_streak():
    user = make_user(streak=4, longest_streak=4, last_active_date=TODAY - timedelta(days=1))
    assert update_streak(user, TODAY) is True
    assert user.streak == 5
    assert user.longest_streak == 5


def test_second_activity_same_day_does_not_change_streak():
    user = make_user(streak=3, last_active_date=TODAY)
    assert update_streak(user, TODAY) is False
    assert user.streak == 3


def test_missing_a_day_resets_streak():
    user = make_user(streak=10, longest_streak=10, last_active_date=TODAY - timedelta(days=2))
    update_streak(user, TODAY)
    assert user.streak == 1
    assert user.longest_streak == 10  # best streak is remembered


def test_displayed_streak_is_zero_after_missed_day():
    assert displayed_streak(make_user(streak=5, last_active_date=TODAY - timedelta(days=1)), TODAY) == 5
    assert displayed_streak(make_user(streak=5, last_active_date=TODAY - timedelta(days=2)), TODAY) == 0


# ---------------------------------------------------------------- hearts


def test_hearts_grow_back_over_time():
    user = make_user(hearts=2, hearts_updated_at=NOW - timedelta(minutes=HEART_REFILL_MINUTES * 2 + 5))
    refresh_hearts(user, NOW)
    assert user.hearts == 4
    # the 5 leftover minutes still count toward the next heart
    assert seconds_until_next_heart(user, NOW) == (HEART_REFILL_MINUTES - 5) * 60


def test_hearts_never_go_above_max():
    user = make_user(hearts=4, hearts_updated_at=NOW - timedelta(days=1))
    refresh_hearts(user, NOW)
    assert user.hearts == MAX_HEARTS
    assert seconds_until_next_heart(user, NOW) is None


def test_losing_a_heart_from_full_starts_the_timer():
    user = make_user(hearts=MAX_HEARTS, hearts_updated_at=NOW - timedelta(hours=5))
    lose_heart(user, NOW)
    assert user.hearts == MAX_HEARTS - 1
    assert seconds_until_next_heart(user, NOW) == HEART_REFILL_MINUTES * 60


def test_hearts_never_go_below_zero():
    user = make_user(hearts=0, hearts_updated_at=NOW)
    lose_heart(user, NOW)
    assert user.hearts == 0


# ---------------------------------------------------------------- answers & XP


def test_normalize_ignores_case_accents_and_punctuation():
    assert normalize("¿Cómo  ESTÁS?") == "como estas"


def test_check_answer_accepts_any_listed_answer():
    data = {"answers": ["I drink water", "I am drinking water"]}
    assert check_answer("translate", data, "i am drinking water.") == (True, "I drink water")
    assert check_answer("translate", data, "I eat bread") == (False, "I drink water")


def test_check_match_pairs_ignores_order():
    data = {"pairs": [["el perro", "the dog"], ["el gato", "the cat"]]}
    assert check_answer("match_pairs", data, [["el gato", "the cat"], ["el perro", "the dog"]])[0]
    assert not check_answer("match_pairs", data, [["el gato", "the dog"]])[0]


def test_perfect_lesson_gets_bonus_xp():
    assert lesson_xp(mistakes=0) == 15
    assert lesson_xp(mistakes=2) == 10
