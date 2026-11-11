"""
Runs before any test: point the app at a throw-away SQLite file so tests never
touch the real duolingo.db.
"""
import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test.db")
