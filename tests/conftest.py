"""
AISecGuard — pytest conftest
Provides shared fixtures for all tests.

Strategy:
  - All tests use a file-based SQLite test database (test_aisecguard.db)
  - The test engine is patched into app.db.session before the app boots
  - Tables are created fresh per test function, dropped after
  - The FastAPI dependency get_db is overridden to use the test session
"""

import os
import pickle
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

# -----------------------------------------------------------------------
# Test engine — file-based SQLite so SAEnum works correctly
# -----------------------------------------------------------------------
TEST_DB_PATH = "./test_aisecguard_pytest.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


def _ensure_tables():
    """Import all models and create tables on the test engine."""
    import app.models  # noqa: F401
    from app.db.base import Base
    Base.metadata.create_all(bind=test_engine)


def _drop_tables():
    """Drop all tables on the test engine."""
    from app.db.base import Base
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def db():
    """Per-test database session with fresh tables."""
    _drop_tables()   # clean slate
    _ensure_tables()
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        _drop_tables()
    # Remove the db file after the test
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass


@pytest.fixture(scope="function")
def client(db: Session):
    """
    FastAPI TestClient using in-process test database.

    Patches:
      1. app.db.session.engine → test_engine  (so create_all in startup is harmless)
      2. get_db dependency → yields the test session
    """
    import app.models  # noqa: F401
    import app.db.session as db_session_module
    from app.db.session import get_db

    # Patch engine so startup create_all uses test engine
    original_engine = db_session_module.engine
    original_session_local = db_session_module.SessionLocal
    db_session_module.engine = test_engine
    db_session_module.SessionLocal = TestingSessionLocal

    def override_get_db():
        yield db

    # Import the app AFTER patching the engine
    from main import app as fastapi_app
    from app.core.config import settings

    orig_no_login = getattr(settings, "NO_LOGIN_REQUIRED", True)
    settings.NO_LOGIN_REQUIRED = False
    orig_sync = getattr(settings, "SYNC_SCANS", False)
    settings.SYNC_SCANS = True
    # Task 4b: Disable rate limiting in tests to prevent 429s
    orig_rate_limit = getattr(settings, "RATE_LIMIT_ENABLED", True)
    settings.RATE_LIMIT_ENABLED = False
    from app.core.limiter import limiter
    orig_limiter_enabled = limiter.enabled
    limiter.enabled = False

    fastapi_app.dependency_overrides[get_db] = override_get_db

    with TestClient(fastapi_app) as c:
        yield c

    fastapi_app.dependency_overrides.clear()
    settings.NO_LOGIN_REQUIRED = orig_no_login
    settings.SYNC_SCANS = orig_sync
    settings.RATE_LIMIT_ENABLED = orig_rate_limit
    limiter.enabled = orig_limiter_enabled
    db_session_module.engine = original_engine
    db_session_module.SessionLocal = original_session_local


# -----------------------------------------------------------------------
# Test data helpers
# -----------------------------------------------------------------------

def make_safe_pickle_bytes() -> bytes:
    """Benign pickle — no dangerous opcodes."""
    return pickle.dumps({"test": True, "model_type": "linear_regression"})


def make_suspicious_pickle_bytes() -> bytes:
    """
    Raw pickle bytes containing a GLOBAL reference to os.system.

    SECURITY NOTE: Never deserialized — static inspection only.
    """
    return (
        b"\x80\x02"       # PROTO 2
        b"\x63"            # GLOBAL opcode
        b"os\nsystem\n"   # module=os, name=system
        b"q\x00"           # BINPUT 0
        b"."               # STOP
    )
