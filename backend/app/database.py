"""
Database setup: one SQLite file, one engine, one session factory.

Every request gets its own Session through `get_db()`, and the session is
closed when the request finishes.
"""
import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker


DEFAULT_DB_FILE = Path(__file__).resolve().parent.parent / "duolingo.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_FILE.as_posix()}")


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def enable_foreign_keys(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
    


def get_db():
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
