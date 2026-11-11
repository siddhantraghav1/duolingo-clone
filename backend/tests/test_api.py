"""End-to-end tests through the HTTP API, using the seeded demo data."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed import reset_database


@pytest.fixture()
def client():
    with TestClient(app) as test_client:  # `with` runs startup (create tables + seed)
        reset_database()  # every test starts from the same seeded data
        yield test_client


def active_skill(client):
    path = client.get("/api/path").json()
    return next(s for unit in path for s in unit["skills"] if s["state"] == "active")


def test_path_has_completed_active_and_locked_skills(client):
    states = [s["state"] for unit in client.get("/api/path").json() for s in unit["skills"]]
    assert states[:3] == ["completed", "completed", "active"]
    assert set(states[3:]) == {"locked"}


def test_lesson_never_sends_answers(client):
    lesson = client.get(f"/api/lessons/{active_skill(client)['next_lesson_id']}").json()
    assert len(lesson["exercises"]) == 6
    assert all("answers" not in e["data"] for e in lesson["exercises"])


def test_full_lesson_loop(client):
    me = client.get("/api/me").json()
    lesson = client.get(f"/api/lessons/{active_skill(client)['next_lesson_id']}").json()
    first = lesson["exercises"][0]

    wrong = client.post(f"/api/exercises/{first['id']}/check", json={"answer": "nope"}).json()
    assert wrong["correct"] is False
    assert wrong["hearts"] == me["hearts"] - 1

    right = client.post(
        f"/api/exercises/{first['id']}/check", json={"answer": wrong["correct_answer"]}
    ).json()
    assert right["correct"] is True

    done = client.post(
        f"/api/lessons/{lesson['lesson_id']}/complete", json={"mistakes": 1, "duration_sec": 90}
    ).json()
    assert done["xp_earned"] == 10
    assert done["total_xp"] == me["total_xp"] + 10
    assert done["streak"] == me["streak"] + 1  # seeded learner was last active yesterday
    assert done["streak_extended"] is True

    # the skill is now complete, so the next one becomes active
    assert active_skill(client)["title"] == "Animals"


def test_locked_lesson_is_forbidden(client):
    last_skill = client.get("/api/path").json()[-1]["skills"][-1]
    assert client.get(f"/api/lessons/{last_skill['next_lesson_id']}").status_code == 403


def test_practice_gives_back_a_heart(client):
    hearts_before = client.get("/api/me").json()["hearts"]
    practice = client.get("/api/practice/mistakes").json()
    assert practice["mode"] == "practice" and practice["exercises"]

    done = client.post("/api/practice/complete", json={"mistakes": 0}).json()
    assert done["hearts"] == hearts_before + 1


def test_refill_hearts_costs_gems(client):
    me = client.get("/api/me").json()
    after = client.post("/api/hearts/refill").json()
    assert after["hearts"] == after["max_hearts"]
    assert after["gems"] == me["gems"] - 350


def test_leaderboard_ranks_everyone(client):
    board = client.get("/api/leaderboard").json()
    assert len(board) == 11
    assert sum(entry["is_me"] for entry in board) == 1
    assert [e["xp"] for e in board] == sorted((e["xp"] for e in board), reverse=True)


def test_simulated_days_extend_then_break_streak(client):
    me = client.get("/api/me").json()
    assert me["streak"] == 6
    client.post("/api/dev/next-day")  # last activity is now 2 days ago
    assert client.get("/api/me").json()["streak"] == 0


def test_profile_has_achievements(client):
    profile = client.get("/api/profile").json()
    assert len(profile["achievements"]) == 8
    unlocked = {a["code"] for a in profile["achievements"] if a["unlocked"]}
    assert unlocked == {"first_lesson", "on_fire", "perfectionist"}
    assert len(profile["xp_last_7_days"]) == 7
