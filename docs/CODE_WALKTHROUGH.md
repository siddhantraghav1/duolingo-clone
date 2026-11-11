# Code Walkthrough: every file explained

This document explains the whole project file by file, in the order it was built (Phases 1–7).
It describes the **final** version of each file. Where a later phase changed an earlier file, the
explanation already includes that change.

For setup instructions, the database diagram and the API table, see the [README](../README.md).

---

## Contents

- [How the pieces fit together](#how-the-pieces-fit-together)
- [Phase 1: Backend (FastAPI + SQLite)](#phase-1-backend-fastapi--sqlite)
- [Phase 2: Frontend shell](#phase-2-frontend-shell)
- [Phase 3: Learning path](#phase-3-learning-path)
- [Phase 4: Lesson player](#phase-4-lesson-player)
- [Phase 5: Bonus features](#phase-5-bonus-features)
- [Phase 6: Leaderboard, profile, shop, settings](#phase-6-leaderboard-profile-shop-settings)
- [Phase 7: Polish, naming, deployment](#phase-7-polish-naming-deployment)
- [Interview cheat sheet](#interview-cheat-sheet)

---

## How the pieces fit together

```
BROWSER                                           SERVER
app/ pages                                        backend/app/
  └─ components/ (what you see)                     routes/*.py      (URL layer)
       └─ lib/api.ts ── /api/... ──► Next.js ──►        └─ services.py   (database helpers)
                         rewrite                             ├─ game_logic.py (rules, no DB)
                                                             └─ models.py ──► SQLite file
```

- **Routes** receive requests.
- **Services** read and write the database.
- **Game logic** decides the rules.
- **Schemas** describe the JSON going in and out.

To follow any feature, go page → `lib/api.ts` → route → `game_logic.py` → model.

---

## Phase 1: Backend (FastAPI + SQLite)

### `backend/requirements.txt`
The Python packages:
- **FastAPI**: the web framework.
- **Uvicorn**: the server that runs it.
- **SQLAlchemy**: lets us use Python classes instead of writing SQL.
- **Pydantic**: validates incoming data.
- **pytest** and **httpx**: used for testing.

### `backend/app/__init__.py` and `backend/app/routes/__init__.py`
Empty marker files. They make `app` and `routes` Python *packages*, so files can import each other
(`from .models import User`).

### `backend/app/database.py`
Connects to SQLite.
- `DEFAULT_DB_FILE` is always `backend/duolingo.db`, whichever folder the server is started from.
  The `DATABASE_URL` environment variable can override it, and the tests use this.
- `engine` is the connection to the file. `check_same_thread=False` is needed because FastAPI may
  use a different thread than the one that opened the connection.
- `enable_foreign_keys` runs `PRAGMA foreign_keys=ON` on every connection. **SQLite ignores foreign
  keys by default**, so without this `ON DELETE CASCADE` would silently do nothing.
- `Base` is the parent class of every table.
- `get_db()` is a FastAPI *dependency*: it opens a session for one request and always closes it
  afterwards (`try/finally`).

### `backend/app/models.py`: the 9 tables
Each class is one table.

**Course content: Unit → Skill → Lesson → Exercise**
- Each level points to its parent with a foreign key (`unit_id`, `skill_id`, `lesson_id`).
- `relationship(...)` gives easy Python access, such as `unit.skills` and `skill.lessons`, already
  sorted by `position`.
- `cascade="all, delete-orphan"`: deleting a unit deletes everything inside it.
- **`Exercise` stores per-type fields in one JSON column, `data`.** All five types share `type`,
  `question` and `position`, but the rest differs. For example, translate needs `sentence`,
  `words` and `answers`, while match pairs needs `pairs`. One JSON column is simpler than five
  extra tables. The `answers` key is removed before an exercise is sent to the browser.
- `audio_text` is the Spanish text to read aloud.

**Learner data**
- **`User`**: stats are plain columns (`total_xp`, `gems`, `hearts`, `streak`, `daily_goal`).
  `hearts_updated_at` and `last_active_date` are what make the time-based rules work.
- **`Activity`**: one row for every finished session. `mode` is `lesson`, `practice` or `legendary`:
  - `lesson` sets both `lesson_id` and `skill_id`
  - `legendary` sets only `skill_id`
  - `practice` sets neither

  This is the **single source of truth for history**. Lesson progress, today's XP, the weekly
  leaderboard, the streak calendar and achievement stats are all calculated from it. The index on
  `(user_id, completed_on)` keeps those queries fast.
- **`UserMistake`**: wrongly answered exercises. The composite primary key `(user_id, exercise_id)`
  makes duplicates impossible.
- **`Achievement`**: a badge definition. It unlocks when the stat named by `metric` reaches
  `target`.
- **`UserAchievement`**: who unlocked which badge, and when.

### `backend/app/schemas.py`
Pydantic classes describing the JSON of every request and response. FastAPI uses them in three ways:
- It **rejects bad input** automatically (e.g. `daily_goal` must be 10, 20, 30 or 50).
- It **filters output**, so only the declared fields are sent.
- It builds the **interactive docs at `/docs`**.

Examples: `MeOut` (top bar), `UnitOut`/`SkillOut` (path), `LessonOut` (a playable session),
`CheckIn`/`CheckOut` (grading), `CompleteOut` (results screen), `ProfileOut`. The frontend's
`lib/types.ts` mirrors this file.

### `backend/app/game_logic.py`: the rules
The most important backend file to understand. It contains **no database code**, only functions
that take values and change them, which makes it easy to unit-test.

- **Tunable numbers at the top:** `MAX_HEARTS = 5`, `HEART_REFILL_MINUTES = 30`,
  `REFILL_COST_GEMS = 350`, `LESSON_XP = 10`, `PERFECT_BONUS_XP = 5`, `PRACTICE_XP = 10`,
  `LEGENDARY_XP = 40`.
- **Hearts without a background job:**
  - `refresh_hearts` looks at how much time has passed since `hearts_updated_at`: 65 minutes ÷ 30
    gives +2 hearts. Leftover minutes still count towards the next heart.
  - `lose_heart` and `gain_heart` refresh first, then change the count.
  - `seconds_until_next_heart` drives the countdown in the UI.
- **Streak:** `update_streak(user, day)` has three cases:
  - already active today: no change
  - last active yesterday: +1
  - otherwise (first time, or a missed day): reset to 1

  `displayed_streak` shows 0 as soon as a whole day is missed, even before the next lesson resets
  the stored value.
- **XP:** `lesson_xp(mistakes)` gives 10, plus 5 for a perfect lesson.
- **Answer checking:**
  - `normalize()` lowercases the answer and removes accents, punctuation and extra spaces:
    `"¿Cómo ESTÁS?"` becomes `"como estas"`.
  - `check_answer()` accepts any of the listed answers. For match pairs it compares **sets**, so the
    order of pairs doesn't matter.
- **`hide_answers()`** removes the `answers` key before data leaves the server.
- **`reached_achievements()`** returns the badges whose target the stats meet.

### `backend/app/services.py`: shared database helpers
`game_logic.py` decides the rules; this file reads and writes the database and combines the two.

- **`get_current_user`**: the "logged-in user". Login is simplified (the brief allows it), so it
  always returns the seeded learner. Real login would only change this function. It also refreshes
  hearts on every request.
- **`me_dict`**: builds the top-bar data.
- **`xp_on_day`**, **`completed_lesson_ids`**, **`legendary_skill_ids`**: small queries on
  `activities`.
- **`build_path`**: works out every skill's state. Nothing about locking is stored:
  - all lessons done → `completed`
  - the first unfinished skill → `active`
  - everything after that → `locked`

  `selectinload` loads units, skills and lessons in 3 queries instead of dozens.
- **`find_skill`**: looks up one skill inside the built path.
- **`exercise_to_dict`**: turns an exercise into JSON, with the answers hidden.
- **`get_user_stats`**: counts lessons, perfect lessons and legendary runs. The keys match
  `Achievement.metric`.
- **`unlock_new_achievements`**: saves newly reached badges and returns them, so the frontend can
  show toasts.
- **`finish_activity`**: what happens when anything is finished. It saves the Activity, adds XP,
  updates the streak, unlocks achievements and commits. Lessons, practice and legendary all reuse it.

### `backend/app/routes/learn.py`: the core lesson loop
| Endpoint | What it does |
|---|---|
| `GET /api/path` | Returns the learning path |
| `GET /api/lessons/{id}` | Returns the exercises, without answers. 403 if the skill is locked, 403 `out_of_hearts` at 0 hearts |
| `POST /api/exercises/{id}/check` | Grades the answer. A wrong answer in a **lesson** costs a heart. Any wrong answer is saved as a mistake; answering it correctly in **practice** removes it |
| `POST /api/lessons/{id}/complete` | Calls `finish_activity` with `lesson_xp(mistakes)` |

### `backend/app/routes/practice.py`: bonus modes
- **`GET /api/practice/mistakes`:** your recent mistakes first, topped up with random exercises from
  lessons you've finished, so practice is always possible.
- **`POST /api/practice/complete`:** **+1 heart** and 10 XP. This is Duolingo's way of earning
  hearts back.
- **`GET /api/skills/{id}/legendary`:** only for completed skills (`get_completed_skill` checks).
  Shuffles 10 exercises from the skill and returns `time_limit_sec = 120` and `lives = 3`.
- **`POST /api/skills/{id}/legendary/complete`:** 40 XP. The skill turns gold on the path.

### `backend/app/routes/user.py`: learner endpoints
- **`/me`:** top-bar data. **`/me/settings`:** name and daily goal.
- **`/hearts/refill`:** 350 gems for full hearts. Errors if hearts are already full or you can't
  afford it.
- **`/leaderboard`:** XP since Monday, summed from `activities`. It uses an **outer join** so
  learners with 0 XP this week still appear.
- **`/profile`:**
  - stats
  - every badge with progress (e.g. 5/10)
  - practised dates for the calendar
  - XP for the last 7 days (one `GROUP BY` query)
- **Dev tools** (switch off with `ENABLE_DEV_TOOLS=false`):
  - `/dev/next-day` moves **every stored date one day into the past**, which is like a day passing.
    With no lesson done in between, the streak breaks.
  - `/dev/reset` re-seeds the database.

### `backend/app/main.py`: entry point
- Creates the app.
- Enables **CORS** for the allowed frontend address (`CORS_ORIGINS`).
- Plugs in the routers.
- Runs `seed_if_empty()` once at startup, through the `lifespan` function.
- `GET /` is a health check.

### `backend/app/seed.py`: demo data
- **Generated exercises:** each skill lists 6 words `(spanish, english, emoji)` and 6 sentences
  `(spanish, english, word_to_blank)`. `build_lesson_exercises()` turns them into six exercises per
  lesson:
  1. picture choice
  2. translate with a word bank
  3. fill in the blank
  4. type the answer
  5. match pairs
  6. translate back into Spanish

  That gives 3 units × 3 skills × 2 lessons × 6 = **108 exercises** from short lists.
- **Text helpers:**
  - `split_answers` reads extra accepted answers written after `|`.
  - `to_tiles` turns a sentence into word-bank tiles.
  - `without_article` accepts "dog" as well as "the dog".
- `random.Random(42)` makes the shuffles the same every time.
- **Sample learner "Alex":** 5 lessons over the past days plus practice yesterday, so a
  **6-day streak**. Finishing a lesson today makes 7, which unlocks "Week Warrior" live. Alex also
  has 4 hearts, 500 gems and a few saved mistakes.
- **10 rivals** with XP spread across this week, for the leaderboard.
- **8 badges.** Alex starts with 3 of them.
- **Functions:**
  - `seed_if_empty()` runs on startup.
  - `reset_database()` drops and re-creates everything.
  - `python -m app.seed` runs a reset by hand.

### `backend/tests/`
- **`conftest.py`:** points the app at a temporary database before any test runs, so the real file
  is never touched.
- **`test_game_logic.py`** (13 tests): streak cases, heart regeneration and limits, answer
  normalising, alternative answers, match pairs, XP bonus.
- **`test_api.py`** (9 tests): real HTTP calls through FastAPI's `TestClient`. Each test re-seeds.
  They cover:
  - path states, and that answers are hidden
  - the full lesson loop: a wrong answer costs a heart, finishing earns XP and extends the streak,
    and the next skill unlocks
  - a locked lesson returns 403
  - practice gives back a heart
  - refill, leaderboard, next-day and achievements

### `backend/pytest.ini`, `backend/.python-version`, `.gitignore`
- `pytest.ini` lets the tests import `app`.
- `.python-version` pins Python 3.12 for hosting.
- The root `.gitignore` keeps `.venv`, `node_modules`, `.next` and the `.db` file out of git.

---

## Phase 2: Frontend shell

### `frontend/next.config.ts`
- **Rewrite:** every `/api/...` request is forwarded to `BACKEND_URL` (FastAPI). The browser thinks
  it's talking to its own website, so there are **no CORS problems**. On Vercel you only set
  `BACKEND_URL`.
- `cacheComponents`, `partialPrefetching` and the `turbopack` CSS rule are the Next.js 16 defaults.

### `frontend/app/globals.css`: the design system
- **Theme colours are CSS variables:** `--bg`, `--surface`, `--line` (borders), `--ink` (text),
  `--muted`, `--faint`, plus soft feedback colours. The `.dark` block redefines them, so **dark mode
  is just a class on `<html>`**.
- `@custom-variant dark` makes `dark:` classes follow that class.
- `@theme inline` turns the variables into Tailwind classes like `bg-surface`, `border-line` and
  `text-muted`.
- `@theme` holds the **brand colours**: green `#58CC02`, blue `#1CB0F6`, red `#FF4B4B`, gold, orange
  and purple. Each has a `-dark` shade, used for 3D button edges.
- **Animations** are defined once and used everywhere: `pop`, `slide-up`, `slide-down`, `fade-in`,
  `shake`, `float`, `celebrate`.

### `frontend/app/layout.tsx`: root layout
Wraps **every** page, including the full-screen lesson player.
- Loads the **Nunito** font: free and rounded, close to Duolingo's look.
- Runs `THEME_SCRIPT` with `<Script strategy="beforeInteractive">`, so dark mode is applied before
  the page becomes interactive, with no white flash. The script comes from `lib/theme-script.ts`;
  Phase 6 explains why it's a separate file.
- Wraps everything in `UserProvider` (stats) and `ToastProvider` (pop-up messages).
- Sets the page title, "Duolingo - learn Spanish".

### `frontend/app/(main)/layout.tsx`: the menu shell
- **`(main)` is a route group.** Folders in brackets don't appear in the URL, so
  `app/(main)/shop/page.tsx` is just `/shop`. Every page inside gets the menus. The lesson pages
  live outside the group, so they are full-screen.
- **Responsive rules:**
  - **phone (<768px):** TopBar, page, bottom MobileNav
  - **tablet:** icon-only sidebar
  - **laptop (1024px+):** sidebar with labels
  - **wide (1280px+):** sidebar, page (max 600px), RightPanel

### `frontend/lib/types.ts`
TypeScript copies of the backend schemas, for autocomplete and type errors.
- `Exercise` is a **discriminated union**: after checking `exercise.type === "translate"`,
  TypeScript knows `exercise.data` has `sentence`, `words` and `tiles_lang`.

### `frontend/lib/api.ts`
**Every backend call lives in this one file.**
- `request()` handles JSON and turns HTTP errors into `ApiError`, which carries the status. That
  lets pages react to a 403 `out_of_hearts`.
- Components call readable functions like `api.checkAnswer(id, answer, mode)` instead of building
  URLs.

### `frontend/lib/user-context.tsx`
A **React Context** that fetches `/api/me` once and shares it with every component.
- Any component calls `useUser()` to get `{ me, error, refreshMe, setMe }`.
- After a lesson, `refreshMe()` updates every stat on screen.
- A timer refetches exactly when the next heart grows back.
- The `cancelled` flag ignores a late response if the component has already gone away.

### `frontend/lib/theme.ts` and `frontend/lib/theme-script.ts`
- `getTheme()` and `setTheme()` toggle the `dark` class and save the choice in `localStorage`.
  Saving is wrapped in `try`, because private browsing can block storage.
- `useTheme()` is added in Phase 6.
- `theme-script.ts` holds the inline script and the storage key.

### `frontend/lib/cn.ts`
A 3-line helper to join class names conditionally: `cn("base", active && "blue")`.

### `frontend/components/ui/`: reusable building blocks
- **`Button.tsx`:** Duolingo's 3D button. A solid colour plus a darker `box-shadow` underneath;
  when pressed (`active:`) it moves down 4px and the shadow disappears, so it feels like a key being
  pushed.
  - 6 variants: primary, secondary, danger, gold, outline, ghost. Plus a grey disabled state.
  - `buttonClasses()` is exported so a `<Link>` can look like a button.
- **`Card.tsx`:** a rounded box with a grey border.
- **`ProgressBar.tsx`:** a rounded bar with a white "shine" stripe on top. The width animates. It
  takes an optional label in the middle ("7 / 20").
- **`Modal.tsx`:** a dark backdrop with a pop-in card.
  - Closes on a backdrop click or Escape. Without `onClose` it can't be dismissed.
  - `stopPropagation` stops clicks *inside* the card from closing it.
- **`Toast.tsx`:** a context plus a `useToast()` hook. `showToast("Saved", "✅", "success")` slides a
  message down from the top; it removes itself after 3 seconds.
- **`Mascot.tsx`:** "Pip", **original** SVG art (a green sprout, not Duolingo's owl). Four moods
  change the eyes, eyebrows, mouth and arms:
  - happy (floats)
  - celebrate (arms up, bouncing)
  - sad
  - thinking
- **`Countdown.tsx`:** a live "m:ss" timer.
  - It stores *when it ends* and works out the time left each second, so it never drifts.
  - To restart it, give it a new `key`.
  - Used for the next-heart timer and the legendary timer. `formatTime()` is shared.
- **`ComingSoon.tsx`:** thinking mascot plus a title, for mocked features.
- **`SpanishFlag.tsx`:** the flag drawn as SVG, because **Windows can't display flag emojis**
  (🇪🇸 shows as the letters "ES").

### `frontend/components/layout/`: the app frame
- **`nav-items.ts`:** the 6 menu entries in one list, shared by Sidebar and MobileNav. `isActive()`
  highlights the current page ("/" only matches exactly).
- **`Sidebar.tsx`:** the left menu. Icons only on tablets, icons with labels from 1024px, and the
  green "duolingo" wordmark. The active item gets the light-blue box with a blue border.
- **`MobileNav.tsx`:** the bottom tab bar on phones.
- **`StatsBar.tsx`:** flag, 🔥 streak, 💎 gems, ❤️ hearts.
  - The **flame is grey until you practise today**, then orange.
  - If the backend is offline, it shows a red warning instead.
- **`TopBar.tsx`:** the stats bar pinned to the top below 1280px, centred to 600px.
- **`RightPanel.tsx`:** the right column from 1280px. It shows:
  - `StatsBar`
  - the **league card** (your weekly rank, reloaded when your XP changes)
  - the **daily goal card** (gold progress bar; turns into 🏆 when reached)
  - the **hearts card**, only when hearts are missing, with a live "next heart in" countdown

### `.claude/launch.json`
Tells the Claude desktop app how to start the `backend` and `frontend` dev servers for previews.
It's not needed to run the project yourself.

---

## Phase 3: Learning path

### `frontend/lib/color.ts`
`darken(hex, 0.2)` makes a colour 20% darker for 3D edges. Unit colours come from the database, so
the dark shades can't be hard-coded.

### `frontend/components/path/UnitHeader.tsx`
- The coloured "UNIT 1 · description" banner.
- **Sticky:** it stays under the top bar while you scroll through its unit, then the next banner
  pushes it away. That's pure CSS (`position: sticky`).
  - `top-[58px]` is the top bar's height; it becomes `xl:top-0` on wide screens.
  - The `bg-bg` wrapper hides the path scrolling underneath.
- The Guidebook button shows a "coming soon" toast.

### `frontend/components/path/SkillNode.tsx`
One node plus its card, split into small parts.

- **`SkillNode`**: the round 3D button. Its colour comes from its state:
  - locked: grey, faded emoji
  - active: unit colour, ring and START bubble
  - completed: 👑 badge
  - legendary: gold

  Two details worth knowing:
  - **CSS variables for colours** (`--node`, `--node-edge`) are used with Tailwind classes like
    `bg-[var(--node)]`. A plain inline `boxShadow` would always win over Tailwind's `active:`
    class, so the press-down effect wouldn't work.
  - **`left: offset` instead of `transform`** for the zig-zag shift. A transformed parent changes
    what `position: fixed` means for its children, which would break the "click anywhere to close"
    layer.
- **`StartBubble`**: the floating "START" label with a small arrow (a square rotated 45° with two
  borders).
- **`ProgressRing`**: an SVG circle.
  - `strokeDasharray` = the circumference; `strokeDashoffset` hides `(1 − progress)` of it.
  - `-rotate-90` starts the ring at the top.
- **`SkillCard`**: the card under a tapped node.
  - It is **centred in the column**, so it never goes off-screen on phones. Only its arrow moves to
    point at the node.
  - **Two wrapper divs:** the outer one positions the card with `transform`, and the inner one runs
    the pop-in animation, which also uses `transform`. On a single element the animation would undo
    the centring. That was a real bug found on phones.
- **`CardBody`**:
  - locked: a "Locked" button
  - active: "Lesson X of Y" plus START
  - completed: Practice, plus Legendary unless already gold
- **`CardButton`**: a white button with text in the unit colour.

### `frontend/app/(main)/page.tsx`: the Learn page
- **Loading:** a pulsing skeleton. **Error:** sad mascot with "Try again".
- **Zig-zag:**
  - `ZIGZAG = [0, 44, 70, 44, 0, -44, -70, -44]` is the horizontal shift of each node.
  - `nodeIndex` counts across *all* units, so the snake shape flows on into the next unit.
- **One open card at a time:** the page holds `openSkillId` and passes `isOpen` and `onToggle` to
  each node ("lifting state up").
- **Auto-scroll:** a `ref` on the active node, then `scrollIntoView({ block: "center" })`.
- **Mascot side:** each unit's mascot sits opposite the way its nodes bend.
- **`UnitTrophy`:** the last stop of each unit. Grey, or gold when every skill is done.

---

## Phase 4: Lesson player

### `frontend/lib/lesson-state.ts`: the state machine
The whole lesson flow is a **reducer**: a pure function `(state, action) → new state`, with no React
and no network calls.

- **Phases:** `answering → checking → correct / wrong → (next) … → finished`.
  - Hearts reach 0 in a lesson → `out_of_hearts`.
  - Lives or time run out in legendary → `failed`, with `failReason` set to `"lives"` or `"time"`.
- **Actions:** `answer`, `check_start`, `check_failed`, `check_result`, `continue`, `refill`,
  `time_up`.
- **Repeating mistakes:** on a wrong answer, `queue: [...queue, current]` adds the exercise to the
  end. The lesson ends only when every exercise has been answered correctly.
- **Progress** = `correctCount / total`, so mistakes don't move the bar.
- **`heartsAfterAnswer`:**
  - lesson: trusts the server's count
  - legendary: counts its own lives
  - practice: unlimited (`null`)
- **`combo`:** correct answers in a row; resets on a mistake.
- **`isLastStep()`:** tells the player whether this CONTINUE finishes the session.

### `frontend/components/exercises/`: the five exercise types
Every component receives `{ data, onAnswer, disabled, audioText }`. It keeps its own small selection
state and only reports the answer upwards; it never calls the server.

- **`shared.tsx`:**
  - `ExerciseProps` (the shared props type).
  - `useNumberKeys`: a custom hook for keys 1–9.
  - `WordTile`, the word button. Its `ghost` version is the grey slot a tile leaves behind, so the
    other tiles don't move.
  - `SpeechBubble`: the mascot "saying" a sentence, with a 🔊 button and reading on appear.
  - `shuffle` (Fisher–Yates).
- **`MultipleChoice.tsx`:** a 2×2 grid of picture cards. Tapping reads the word aloud, keys 1–4
  choose, and number badges sit in the corners.
- **`WordBank.tsx`** (translate):
  - Stores the **positions** of picked tiles, not the words, because the same word can appear
    twice.
  - Tapping a tile in the answer line sends it back.
  - The ruled lines are a CSS gradient. Spanish tiles are read aloud.
- **`FillBlank.tsx`:** splits the sentence on `___` and puts the chosen word into the gap. Keys 1–3
  choose.
- **`TypeAnswer.tsx`:** a textarea. Enter is blocked from adding a new line (Enter means CHECK). The
  Spanish word is read aloud.
- **`MatchPairs.tsx`:**
  - Both columns are shuffled **once** with `useState(() => shuffle(...))`.
  - A correct pair greys out; a wrong pair shakes red for 0.5s.
  - When everything is matched it calls `onAnswer` itself. There's no CHECK button.
  - Spanish words are read aloud.
- **`ExerciseView.tsx`:** picks the component by `exercise.type`, shows the question title and the
  "🔁 Previous mistake" label. Thanks to the discriminated union, each `case` is type-safe.

### `frontend/components/lesson/`
- **`LessonScreen.tsx`**: loads a session, then shows the player.
  - One component serves all three modes. `mode` plus `id` choose the API calls: `loadSession()` and
    `finishSession()`.
  - **Errors:**
    - 403 `out_of_hearts` → out-of-hearts modal; refilling reloads the lesson
    - "locked" or other errors → sad mascot with "Back to path"
  - It waits for both the session and `me`, because the starting hearts come from the stats.
  - **`restart()`** increases `attempt`, which reloads the session and gives the player a new `key`.
  - `LessonLoading` is reused as the `Suspense` fallback.
- **`LessonPlayer.tsx`**: connects the reducer to the screen.
  - **`check()`:**
    1. sends the answer
    2. dispatches the result
    3. plays the ding or buzz
    4. reads the Spanish aloud after a correct answer (`spanishToSpeakAfter`)
    5. on a network error, goes back to answering with a toast
  - **`handleAnswer()`:** completing match pairs checks immediately. **`skip()`** sends an empty
    answer, which counts as wrong.
  - **`handleContinue()`:** uses `isLastStep()` *before* the state changes, then saves the result
    with the time taken.
  - **`key={state.index}` on `ExerciseView`:** every exercise, including a repeat, starts as a
    brand-new component with empty selections.
  - **Keyboard:**
    - Enter = CHECK or CONTINUE. `preventDefault()` stops a focused button from also clicking,
      which would double-continue.
    - Escape = quit dialog.
  - **`timeUp`** is wrapped in `useCallback`, so the legendary countdown doesn't restart its timer
    effect on every render.
  - **Screens:**
    1. lesson
    2. saving… (with "Try again" if saving fails)
    3. results
    4. streak, only for the first activity of the day
    5. back to the path

    `LessonFailed` is shown for legendary.
- **`LessonHeader.tsx`:**
  - ✕ (quit), the progress bar (gold in legendary) and "🔥 N IN A ROW" from 3 correct.
  - The **⏱ timer** when there is a time limit.
  - The hearts counter (∞ in practice).
- **`FeedbackBar.tsx`**: Duolingo's signature bottom bar.
  - **Answering:** SKIP plus CHECK (grey until an answer is chosen).
  - **Correct:** green, slides up, ✓, a rotating compliment, and a green CONTINUE.
  - **Wrong:** red, ✕, "Correct solution: …", and a red CONTINUE.
  - On phones, SKIP is hidden and the button spans the full width.
- **`OutOfHearts.tsx`:** sad mascot with three options:
  - **Refill for 350 💎** (updates the stats everywhere)
  - **Practice to earn hearts** (`/review`)
  - **End session**
- **`EndScreens.tsx`:**
  - **`LessonComplete`:** confetti and the fanfare (once, in `useEffect`), plus three stat boxes:
    XP, Accuracy (labelled "Perfect" at 100%) and Time. It also shows an optional note and "Daily
    goal reached".
  - **`StreakScreen`:** a big 🔥 with the number.
  - **`LessonFailed`:** "Out of lives" or "Time's up!".
  - **`EndLayout`:** the shared layout.

### `frontend/app/lesson/[lessonId]/page.tsx`
- `[lessonId]` is a **dynamic segment**: `/lesson/6` gives `lessonId = "6"`.
- **Next.js 16 rule:** with Cache Components, a URL value is only known at request time, so it must
  be read **inside `<Suspense>`**. The page shows `LessonLoading` while a small async component
  awaits `params`, then renders `<LessonScreen mode="lesson" id={…} />`.
- It's outside `(main)`, so it's full-screen.

### Package: `canvas-confetti`
The celebration effect, with its TypeScript types.

---

## Phase 5: Bonus features

### `frontend/lib/sounds.ts`
- **Sound effects generated in the browser** with the Web Audio API. No audio files means nothing to
  download and no copyright questions.
- `note()` creates an oscillator (the tone) and a gain (the volume). The quick fade in and out
  prevents clicks.
  - "correct" = two rising notes (A5 → E6)
  - "wrong" = a low buzz
  - "complete" = a four-note fanfare
- `isSoundOn()` / `setSoundOn()` store the preference. `useSoundOn()` is added in Phase 6.
- `playSound()` never throws: the app works without audio.

### `frontend/lib/speech.ts`
- **Text-to-speech** with the browser's free Web Speech API.
- `speak(text)` stops anything still being read, sets Spanish (`es-ES`), slows the rate to 0.9 for
  learners, and prefers a Spanish voice if the device has one.
- It respects the sound setting.

### Exercise and player updates (already included above)
- Audio when exercises appear, when words are tapped, and after correct answers.
- Number-key shortcuts and Escape to quit.
- A `time_up` action and `failReason` in the reducer.
- The timer in the header, and the practice note on the results screen.

### `frontend/app/review/page.tsx`
"Practice your mistakes": `<LessonScreen mode="practice" />`. It has no URL value, so it needs no
`Suspense`.

### `frontend/app/legendary/[skillId]/page.tsx`
The same `Suspense` pattern as the lesson page, with `mode="legendary"`.

### `frontend/app/(main)/practice/page.tsx`: the Practice hub
- The "Practice your mistakes" card links to `/review`. Its text depends on whether your hearts are
  full.
- "Legendary challenges" lists your completed skills (from `/api/path`) with gold Start or Replay
  buttons.

---

## Phase 6: Leaderboard, profile, shop, settings

### `frontend/app/(main)/leaderboard/page.tsx`
- Loads the weekly ranking.
- **Zones:** `PROMOTE = 3` and `DEMOTE = 2`. The divider lines are drawn between rows by comparing
  ranks.
- Gold, silver and bronze rank colours; your row is highlighted as "(you)".
- **`Shield`:** SVG league badges. Bronze is active; the others are locked.
- **"Days left" is computed in the fetch callback, not during render.** Next.js 16 pre-renders pages
  on the server, and reading the clock during render raises a "current-time prerender error".

### `frontend/app/(main)/profile/page.tsx`
Layout:
- header: avatar, name, @username, join date, "Edit profile"
- 2×2 stats
- weekly XP chart
- streak calendar with best streak
- achievements (count unlocked / total)
- a Friends placeholder

"Today" is taken from the server's data (`xp_last_7_days`), not the browser clock.

### `frontend/components/profile/XpChart.tsx`
Built with a data-visualisation checklist:
- **Colour was validated, not guessed.** A palette checker showed brand gold is too light on both
  backgrounds. `#1899D6` (`blue-dark`) passes 3:1 contrast in light **and** dark mode.
- Thin bars with 4px rounded tops on one baseline. One series, so no legend.
- Only today's bar shows a number. Hover any column ("Sunday, Nov 8 · 15 XP"); the whole column is
  the hover target.
- A hidden `<table>` gives screen readers the same data.

### `frontend/components/profile/StreakCalendar.tsx`
- `new Date(year, month, 0)` gives the last day of the month.
- Empty cells push day 1 under the right weekday.
- A `Set` makes "was this day practised?" a fast lookup.
- Practised days are orange; today has a blue ring.

### `frontend/components/profile/AchievementBadge.tsx`
- **Unlocked:** gold tile and "✓ Unlocked Nov 11".
- **Locked:** greyscale tile and a gold progress bar ("5 / 10").

### `frontend/app/(main)/shop/page.tsx`
- **Refill hearts** works: it calls the API, updates the stats with `setMe` and shows a toast. The
  button is disabled when hearts are full or you can't afford it.
- **Mocked (allowed by the brief):** the Super Duolingo banner, Unlimited hearts, Streak Freeze and
  Timer Boost all show "coming soon". `ShopItem` is the shared row layout.

### `frontend/app/(main)/settings/page.tsx`
- **`NameForm`** has `key={me.name}`, so when the name changes (e.g. after a reset) React creates a
  fresh form with the new value. `preventDefault()` stops the browser's own form submit from
  reloading the page.
- **Daily goal:** 4 cards (Casual 10 · Regular 20 · Serious 30 · Intense 50) that save immediately.
- **`ToggleRow`:** an accessible switch (`role="switch"`, `aria-checked`) for dark mode and sound.
- **Demo tools:** Next day, and Reset with a confirm dialog.
- **Account:** "Coming soon" rows.

### `useTheme()` in `lib/theme.ts` and `useSoundOn()` in `lib/sounds.ts`
- Both use React's **`useSyncExternalStore`**, the correct way to read values that live *outside*
  React (the `<html>` class and `localStorage`).
- `setTheme` / `setSoundOn` fire a small browser event, and the hook re-reads the value.
- On the server they return a default, so the server HTML matches the browser's first render.

### Why `lib/theme-script.ts` exists
The root layout is a **Server Component**. When `theme.ts` started using a client-only hook,
importing it into the layout crashed the server with HTTP 500. The inline script string now lives
in a file with no React imports.

---

## Phase 7: Polish, naming, deployment

| Change | Why |
|---|---|
| App renamed **"lingo" → "Duolingo"** (sidebar wordmark, page title, "Super Duolingo" in the shop) | Requested name. The README states it's an educational clone, not affiliated |
| `frontend/app/icon.svg` | Browser-tab icon (the mascot's face); Next.js serves `app/icon.svg` automatically. Replaced the default `favicon.ico` |
| `frontend/app/not-found.tsx` | Friendly 404 page with the sad mascot and "Back to learning" |
| Deleted `frontend/README.md` | Leftover from create-next-app; the root README covers everything |
| Removed `frontend/.git` | create-next-app had started a separate repository inside `frontend/` (only its automatic first commit). The project must be **one** repository containing `frontend/` and `backend/` |
| `render.yaml` | Render "Blueprint" to deploy the backend in a few clicks |
| `backend/.python-version` | Pins Python 3.12 on the host |
| `README.md` | Setup, tech stack, architecture, ER diagram, API table, game rules, deployment, assumptions |
| `docs/CODE_WALKTHROUGH.md` | This document |

**Verified at the end:**
- The production build (`npm run build`) succeeds. All pages prerender, and the lesson and legendary
  pages are partially prerendered with streamed content.
- 22 backend tests pass, and lint and TypeScript are clean.

**Note on `frontend/AGENTS.md`:** created automatically by `next dev`. It tells AI coding tools to
read the Next.js 16 docs bundled in `node_modules/next/dist/docs/`. It's safe to commit or ignore.

---

## Interview cheat sheet

Short answers to "why did you do it this way?":

1. **Why does the server check answers?** So answers never reach the browser (no cheating through
   DevTools) and the rules live in one place.
2. **How do hearts refill without a background job?** We store when they last changed and work out
   the regrowth whenever the user is read (`refresh_hearts`).
3. **How is the streak tested?** `update_streak` is a pure function with unit tests, and
   `/dev/next-day` shifts every stored date so it can be shown live.
4. **Why one `activities` table?** One history table feeds progress, daily XP, the leaderboard, the
   calendar and achievements, so no number is stored twice.
5. **Why JSON for exercise data?** Five exercise types with different fields; one JSON column (with
   Pydantic and TypeScript types describing it) is simpler than five near-empty tables.
6. **Why is locking not stored?** It can be derived from finished lessons, so it can never go out of
   sync.
7. **Why a reducer for the lesson?** The lesson is a state machine, and a pure reducer makes every
   transition readable and predictable.
8. **Why the `/api` rewrite?** The browser sees one origin, so no CORS setup is needed in the
   browser, and the backend address is a single environment variable.
9. **Why `Suspense` around the lesson pages?** Next.js 16 with Cache Components requires request-time
   URL values to be read inside a `Suspense` boundary.
10. **Why `key={...}` tricks?** Changing a component's `key` gives a fresh component, which is the
    simplest way to reset its state (each exercise, the name form, countdowns).
