"""
Seeded data so the app is usable immediately:
  * a Spanish course: 3 units x 3 skills x 2 lessons x 6 exercises = 108 exercises
  * a sample learner "Alex" with a 6-day streak and the first unit half done
  * 10 rival learners so the weekly leaderboard is alive
  * 8 achievement badges

"""
import random
import re
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .game_logic import MAX_HEARTS, lesson_xp, now, today
from .models import Achievement, Activity, Exercise, Lesson, Skill, Unit, User, UserMistake
from .services import DEFAULT_USERNAME, unlock_new_achievements

# Words:     (spanish, english, emoji)
# Sentences: (spanish, english, word used for the fill-in-the-blank exercise)
# "|" separates extra accepted answers, e.g. "I drink water|I am drinking water".
COURSE = [
    {
        "description": "Order food, greet people, talk about family",
        "color": "#58CC02",
        "skills": [
            {
                "title": "Food",
                "icon": "🍎",
                "words": [
                    ("el agua", "the water", "💧"),
                    ("el pan", "the bread", "🍞"),
                    ("la manzana", "the apple", "🍎"),
                    ("la leche", "the milk", "🥛"),
                    ("el café", "the coffee", "☕"),
                    ("el queso", "the cheese", "🧀"),
                ],
                "sentences": [
                    ("Yo bebo agua|Bebo agua", "I drink water|I am drinking water", "bebo"),
                    ("Yo como pan|Como pan", "I eat bread|I am eating bread", "como"),
                    ("La manzana es roja", "The apple is red", "roja"),
                    ("Ella bebe leche", "She drinks milk|She is drinking milk", "bebe"),
                    ("El café está caliente", "The coffee is hot", "caliente"),
                    ("Tú comes queso", "You eat cheese|You are eating cheese", "comes"),
                ],
            },
            {
                "title": "Greetings",
                "icon": "👋",
                "words": [
                    ("hola", "hello|hi", "👋"),
                    ("adiós", "goodbye|bye", "🚶"),
                    ("gracias", "thank you|thanks", "🙏"),
                    ("buenos días", "good morning", "🌅"),
                    ("buenas noches", "good night", "🌙"),
                    ("por favor", "please", "🥺"),
                ],
                "sentences": [
                    ("Hola, ¿cómo estás?", "Hello, how are you?|Hi, how are you?", "estás"),
                    ("Muchas gracias", "Thank you very much|Thanks a lot", "Muchas"),
                    ("Buenos días, señor", "Good morning, sir", "días"),
                    ("Me llamo Ana", "My name is Ana|I am called Ana", "llamo"),
                    ("Buenas noches, mamá", "Good night, mom|Good night, mum", "noches"),
                    ("Un café, por favor", "A coffee, please|One coffee, please", "favor"),
                ],
            },
            {
                "title": "Family",
                "icon": "👪",
                "words": [
                    ("la madre", "the mother|the mom", "👩"),
                    ("el padre", "the father|the dad", "👨"),
                    ("el hermano", "the brother", "👦"),
                    ("la hermana", "the sister", "👧"),
                    ("el bebé", "the baby", "👶"),
                    ("la abuela", "the grandmother|the grandma", "👵"),
                ],
                "sentences": [
                    ("Mi madre es alta", "My mother is tall|My mom is tall", "alta"),
                    ("Él es mi padre", "He is my father|He is my dad", "padre"),
                    ("Tengo un hermano", "I have a brother", "Tengo"),
                    ("Mi hermana come pan", "My sister eats bread|My sister is eating bread", "hermana"),
                    ("El bebé bebe leche", "The baby drinks milk|The baby is drinking milk", "bebe"),
                    ("Mi abuela es simpática", "My grandmother is nice|My grandma is nice", "simpática"),
                ],
            },
        ],
    },
    {
        "description": "Describe animals, colours and places",
        "color": "#CE82FF",
        "skills": [
            {
                "title": "Animals",
                "icon": "🐶",
                "words": [
                    ("el perro", "the dog", "🐶"),
                    ("el gato", "the cat", "🐱"),
                    ("el pájaro", "the bird", "🐦"),
                    ("el caballo", "the horse", "🐴"),
                    ("el pez", "the fish", "🐟"),
                    ("la vaca", "the cow", "🐮"),
                ],
                "sentences": [
                    ("El perro es grande", "The dog is big|The dog is large", "grande"),
                    ("Tengo un gato", "I have a cat", "gato"),
                    ("El pájaro canta", "The bird sings|The bird is singing", "canta"),
                    ("El caballo corre", "The horse runs|The horse is running", "corre"),
                    ("El pez nada", "The fish swims|The fish is swimming", "nada"),
                    ("La vaca come", "The cow eats|The cow is eating", "come"),
                ],
            },
            {
                "title": "Colors",
                "icon": "🎨",
                "words": [
                    ("rojo", "red", "🔴"),
                    ("azul", "blue", "🔵"),
                    ("verde", "green", "🟢"),
                    ("amarillo", "yellow", "🟡"),
                    ("negro", "black", "⚫"),
                    ("blanco", "white", "⚪"),
                ],
                "sentences": [
                    ("El coche es rojo", "The car is red", "rojo"),
                    ("El cielo es azul", "The sky is blue", "cielo"),
                    ("La manzana es verde", "The apple is green", "verde"),
                    ("El sol es amarillo", "The sun is yellow", "sol"),
                    ("Mi gato es negro", "My cat is black", "negro"),
                    ("La leche es blanca", "The milk is white", "blanca"),
                ],
            },
            {
                "title": "Places",
                "icon": "🏙️",
                "words": [
                    ("la casa", "the house|the home", "🏠"),
                    ("la escuela", "the school", "🏫"),
                    ("el hospital", "the hospital", "🏥"),
                    ("el parque", "the park", "🌳"),
                    ("la playa", "the beach", "🏖️"),
                    ("el restaurante", "the restaurant", "🍽️"),
                ],
                "sentences": [
                    ("Vivo en una casa", "I live in a house", "Vivo"),
                    ("Voy a la escuela", "I go to school|I go to the school|I am going to school", "escuela"),
                    ("El hospital está aquí", "The hospital is here", "aquí"),
                    ("Corremos en el parque", "We run in the park", "Corremos"),
                    ("La playa es bonita", "The beach is pretty|The beach is beautiful", "bonita"),
                    ("Comemos en el restaurante", "We eat at the restaurant|We eat in the restaurant", "Comemos"),
                ],
            },
        ],
    },
    {
        "description": "Count, get dressed and travel",
        "color": "#1CB0F6",
        "skills": [
            {
                "title": "Numbers",
                "icon": "🔢",
                "words": [
                    ("uno", "one", "1️⃣"),
                    ("dos", "two", "2️⃣"),
                    ("tres", "three", "3️⃣"),
                    ("cuatro", "four", "4️⃣"),
                    ("cinco", "five", "5️⃣"),
                    ("diez", "ten", "🔟"),
                ],
                "sentences": [
                    ("Tengo dos perros", "I have two dogs", "dos"),
                    ("Hay tres gatos", "There are three cats", "tres"),
                    ("Ella tiene cuatro hermanos", "She has four brothers|She has four siblings", "cuatro"),
                    ("Quiero un café", "I want a coffee|I want one coffee", "Quiero"),
                    ("Tengo cinco manzanas", "I have five apples", "cinco"),
                    ("Son las diez", "It is ten o'clock|It's ten o'clock|It is ten", "diez"),
                ],
            },
            {
                "title": "Clothing",
                "icon": "👕",
                "words": [
                    ("la camisa", "the shirt", "👕"),
                    ("los zapatos", "the shoes", "👟"),
                    ("el sombrero", "the hat", "🎩"),
                    ("el vestido", "the dress", "👗"),
                    ("los pantalones", "the pants|the trousers", "👖"),
                    ("el abrigo", "the coat", "🧥"),
                ],
                "sentences": [
                    ("Mi camisa es azul", "My shirt is blue", "camisa"),
                    ("Necesito zapatos", "I need shoes", "Necesito"),
                    ("El sombrero es negro", "The hat is black", "sombrero"),
                    ("Ella lleva un vestido", "She wears a dress|She is wearing a dress", "lleva"),
                    ("Los pantalones son verdes", "The pants are green|The trousers are green", "son"),
                    ("Hace frío, lleva un abrigo", "It is cold, wear a coat|It's cold, wear a coat", "frío"),
                ],
            },
            {
                "title": "Travel",
                "icon": "✈️",
                "words": [
                    ("el avión", "the airplane|the plane", "✈️"),
                    ("el tren", "the train", "🚆"),
                    ("el coche", "the car", "🚗"),
                    ("el hotel", "the hotel", "🏨"),
                    ("la maleta", "the suitcase", "🧳"),
                    ("el pasaporte", "the passport", "🛂"),
                ],
                "sentences": [
                    ("El avión es rápido", "The airplane is fast|The plane is fast", "rápido"),
                    ("Tomo el tren", "I take the train", "Tomo"),
                    ("Mi coche es rojo", "My car is red", "coche"),
                    ("El hotel está cerca", "The hotel is near|The hotel is close", "cerca"),
                    ("Mi maleta es grande", "My suitcase is big|My suitcase is large", "maleta"),
                    ("¿Dónde está mi pasaporte?", "Where is my passport?", "Dónde"),
                ],
            },
        ],
    },
]

LESSONS_PER_SKILL = 2

# (code, title, description, icon, metric, target)
ACHIEVEMENTS = [
    ("first_lesson", "First Steps", "Complete your first lesson", "🎓", "lessons_completed", 1),
    ("scholar", "Scholar", "Complete 10 lessons", "📚", "lessons_completed", 10),
    ("on_fire", "On Fire", "Reach a 3 day streak", "🔥", "longest_streak", 3),
    ("week_warrior", "Week Warrior", "Reach a 7 day streak", "📅", "longest_streak", 7),
    ("xp_hunter", "XP Hunter", "Earn 250 XP", "⚡", "total_xp", 250),
    ("xp_master", "XP Master", "Earn 1000 XP", "💎", "total_xp", 1000),
    ("perfectionist", "Perfectionist", "Finish a lesson with no mistakes", "🎯", "perfect_lessons", 1),
    ("legendary", "Legendary", "Pass a legendary challenge", "👑", "legendary_completed", 1),
]

RIVALS = [
    ("Sofia", "🐱"), ("Mateo", "🐯"), ("Priya", "🦄"), ("Liam", "🐸"), ("Yuki", "🐼"),
    ("Omar", "🦁"), ("Emma", "🐰"), ("Arjun", "🐵"), ("Chloe", "🐨"), ("Diego", "🐧"),
]


# ---------------------------------------------------------------- small text helpers


def split_answers(text: str) -> list[str]:
    """'I drink water|I am drinking water' -> ['I drink water', 'I am drinking water']"""
    return [part.strip() for part in text.split("|")]


def to_tiles(sentence: str) -> list[str]:
    """'Hola, ¿cómo estás?' -> ['Hola', 'cómo', 'estás']  (word-bank tiles)"""
    return [word.strip(",.!?¿¡") for word in sentence.split()]


def without_article(text: str) -> str:
    """'the dog' -> 'dog', so both are accepted when typing."""
    for article in ("the ", "a "):
        if text.startswith(article):
            return text[len(article):]
    return text


# ---------------------------------------------------------------- exercise generator


def word_bank_exercise(sentence, correct_answers, distractor_pool, tiles_lang, audio_text, rng):
    answer_tiles = to_tiles(correct_answers[0])
    used = {tile.lower() for tile in answer_tiles}
    distractors = rng.sample(sorted(w for w in distractor_pool if w not in used), 3)
    word_bank = answer_tiles + distractors
    rng.shuffle(word_bank)
    return {
        "type": "translate",
        "question": "Translate this sentence",
        "data": {
            "sentence": sentence,
            "words": word_bank,
            "tiles_lang": tiles_lang,
            "answers": correct_answers,
        },
        "audio_text": audio_text,
    }


def build_lesson_exercises(skill: dict, lesson_index: int, english_pool, spanish_pool, rng) -> list[dict]:
    """Six exercises: picture choice, translate, fill blank, type, match pairs, translate back."""
    words, sentences = skill["words"], skill["sentences"]
    start = lesson_index * 3
    word_choice, word_typed, _ = words[start:start + 3]
    to_english, with_blank, to_spanish = sentences[start:start + 3]

    exercises = []

    # 1. Multiple choice: pick the picture card for an English word
    es, en, emoji = word_choice
    others = rng.sample([w for w in words if w != word_choice], 3)
    choices = [{"text": w[0], "emoji": w[2]} for w in [word_choice, *others]]
    rng.shuffle(choices)
    exercises.append({
        "type": "multiple_choice",
        "question": f"Which one of these is “{split_answers(en)[0]}”?",
        "data": {"choices": choices, "answers": [es]},
        "audio_text": None,
    })

    # 2. Translate Spanish -> English using the word bank
    es, en, _ = to_english
    spanish = split_answers(es)[0]
    exercises.append(
        word_bank_exercise(spanish, split_answers(en), english_pool, "en", spanish, rng)
    )

    # 3. Fill in the blank
    es, en, blank = with_blank
    spanish = split_answers(es)[0]
    other_blanks = [s[2] for s in sentences if s[2] != blank]
    blank_choices = [blank, *rng.sample(other_blanks, 2)]
    rng.shuffle(blank_choices)
    exercises.append({
        "type": "fill_blank",
        "question": "Fill in the blank",
        "data": {
            "sentence": re.sub(rf"\b{re.escape(blank)}\b", "___", spanish, count=1),
            "translation": split_answers(en)[0],
            "choices": blank_choices,
            "answers": [blank],
        },
        "audio_text": spanish,
    })

    # 4. Type the answer (Spanish word -> English)
    es, en, _ = word_typed
    accepted = split_answers(en)
    accepted += [without_article(a) for a in accepted if without_article(a) != a]
    exercises.append({
        "type": "type_answer",
        "question": "Type this in English",
        "data": {"text": es, "answers": accepted},
        "audio_text": es,
    })

    # 5. Match pairs (5 Spanish <-> English pairs)
    pairs = [[w[0], split_answers(w[1])[0]] for w in rng.sample(words, 5)]
    exercises.append({
        "type": "match_pairs",
        "question": "Tap the matching pairs",
        "data": {"pairs": pairs},
        "audio_text": None,
    })

    # 6. Translate English -> Spanish using the word bank
    es, en, _ = to_spanish
    exercises.append(
        word_bank_exercise(split_answers(en)[0], split_answers(es), spanish_pool, "es", None, rng)
    )

    return exercises


# ---------------------------------------------------------------- seeding steps


def seed_course(db: Session, rng: random.Random) -> None:
    all_sentences = [s for unit in COURSE for skill in unit["skills"] for s in skill["sentences"]]
    english_pool = {t.lower() for s in all_sentences for t in to_tiles(split_answers(s[1])[0])}
    spanish_pool = {t.lower() for s in all_sentences for t in to_tiles(split_answers(s[0])[0])}

    for unit_position, unit_data in enumerate(COURSE, start=1):
        unit = Unit(
            position=unit_position,
            title=f"Unit {unit_position}",
            description=unit_data["description"],
            color=unit_data["color"],
        )
        for skill_position, skill_data in enumerate(unit_data["skills"], start=1):
            skill = Skill(position=skill_position, title=skill_data["title"], icon=skill_data["icon"])
            unit.skills.append(skill)
            for lesson_index in range(LESSONS_PER_SKILL):
                lesson = Lesson(position=lesson_index + 1)
                skill.lessons.append(lesson)
                exercises = build_lesson_exercises(
                    skill_data, lesson_index, english_pool, spanish_pool, rng
                )
                for position, exercise in enumerate(exercises, start=1):
                    lesson.exercises.append(Exercise(position=position, **exercise))
        db.add(unit)
    db.flush()


def seed_achievements(db: Session) -> None:
    for code, title, description, icon, metric, target in ACHIEVEMENTS:
        db.add(Achievement(code=code, title=title, description=description,
                           icon=icon, metric=metric, target=target))
    db.flush()


def seed_learner(db: Session) -> None:
    """Alex finished the first 5 lessons, one a day, and practised yesterday -> 6 day streak."""
    current, day = now(), today()
    learner = User(
        username=DEFAULT_USERNAME, name="Alex", avatar="🦊",
        gems=500, hearts=MAX_HEARTS - 1, hearts_updated_at=current - timedelta(minutes=10),
        streak=6, longest_streak=6, last_active_date=day - timedelta(days=1),
        daily_goal=20, created_at=current - timedelta(days=45),
    )
    db.add(learner)
    db.flush()

    lessons = db.scalars(
        select(Lesson).join(Skill).join(Unit).order_by(Unit.position, Skill.position, Lesson.position)
    ).all()

    history = []
    for days_ago, (lesson, mistakes) in zip(range(6, 1, -1), zip(lessons[:5], [0, 2, 1, 0, 3])):
        history.append(Activity(
            user_id=learner.id, mode="lesson", lesson_id=lesson.id, skill_id=lesson.skill_id,
            xp_earned=lesson_xp(mistakes), mistakes=mistakes, duration_sec=150,
            completed_on=day - timedelta(days=days_ago),
        ))
    history.append(Activity(user_id=learner.id, mode="practice", xp_earned=10,
                            duration_sec=120, completed_on=day - timedelta(days=1)))
    # an older 4-day run of practice a few weeks ago (shows on the streak calendar)
    for days_ago in range(15, 19):
        history.append(Activity(user_id=learner.id, mode="practice", xp_earned=10,
                                duration_sec=120, completed_on=day - timedelta(days=days_ago)))
    db.add_all(history)
    learner.total_xp = sum(a.xp_earned for a in history)

    # a few earlier mistakes, so "Practice your mistakes" has content
    for lesson in lessons[:2]:
        for exercise in lesson.exercises[:2]:
            db.add(UserMistake(user_id=learner.id, exercise_id=exercise.id))

    db.flush()
    unlock_new_achievements(db, learner)


def seed_rivals(db: Session, rng: random.Random) -> None:
    current, day = now(), today()
    week_start = day - timedelta(days=day.weekday())
    days_this_week = (day - week_start).days + 1

    for name, avatar in RIVALS:
        streak = rng.randint(1, 60)
        rival = User(
            username=name.lower(), name=name, avatar=avatar,
            gems=rng.randint(100, 2000), hearts=MAX_HEARTS, hearts_updated_at=current,
            streak=streak, longest_streak=streak + rng.randint(0, 30),
            last_active_date=day - timedelta(days=rng.randint(0, 1)),
            created_at=current - timedelta(days=rng.randint(60, 400)),
        )
        db.add(rival)
        db.flush()

        activities = [
            Activity(user_id=rival.id, mode="practice", xp_earned=rng.choice([10, 15, 20, 40]),
                     completed_on=week_start + timedelta(days=rng.randrange(days_this_week)))
            for _ in range(rng.randint(1, 8))
        ]
        # older history so total XP looks realistic
        activities.append(Activity(user_id=rival.id, mode="practice",
                                   xp_earned=rng.randint(200, 4000),
                                   completed_on=day - timedelta(days=60)))
        db.add_all(activities)
        rival.total_xp = sum(a.xp_earned for a in activities)


def seed_database(db: Session) -> None:
    rng = random.Random(42)  # fixed seed -> the same content every time
    seed_course(db, rng)
    seed_achievements(db)
    seed_learner(db)
    seed_rivals(db, rng)
    db.commit()


def seed_if_empty() -> None:
    """Create tables if needed and seed once (called when the server starts)."""
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(User)) == 0:
            seed_database(db)


def reset_database() -> None:
    """Delete everything and seed again."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_database(db)


if __name__ == "__main__":
    reset_database()
    print("Database reset and seeded.")
