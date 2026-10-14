"""
AISecGuard — Database Session Management
Week 3: Engine creation, session factory, and FastAPI dependency.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import settings


from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

connect_args = {}
is_in_memory = ":memory:" in settings.DATABASE_URL or settings.DATABASE_URL.endswith("sqlite:///")

# SQLite requires check_same_thread=False for use with FastAPI
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine_kwargs = {
    "connect_args": connect_args,
    "echo": False,
}

if is_in_memory:
    # StaticPool ensures all sessions and threads share the same in-memory database
    engine_kwargs["poolclass"] = StaticPool

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

# Enable WAL mode for file-based SQLite to allow concurrent reads
if settings.DATABASE_URL.startswith("sqlite") and not is_in_memory:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session per request.
    The session is closed automatically after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
