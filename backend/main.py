"""
AISecGuard Backend — Main Application Entry Point
Enhanced with structured logging, phase tracking, and proper startup/shutdown lifecycle.
"""

import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router

# Import all models so SQLAlchemy metadata is populated before create_all
import app.models  # noqa: F401


# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------

def _configure_logging() -> None:
    """Configure application-wide structured logging with timestamps and levels."""
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    # Remove existing handlers to avoid duplicates on reload
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Console handler (INFO and above)
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter(fmt, datefmt=datefmt))
    root_logger.addHandler(console)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("multipart").setLevel(logging.WARNING)
    logging.getLogger("passlib").setLevel(logging.WARNING)


_configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """
    Application lifespan event handler (FastAPI 0.95+ / Starlette lifespan).

    Startup: Creates database tables if they do not exist.
      - Uses the engine from app.db.session at startup time.
      - During tests, the engine is patched to a test SQLite engine before
        the TestClient context manager starts, so create_all targets the
        test database — not the production database.
      - In production, use Alembic migrations (alembic upgrade head) instead.

    Shutdown: (reserved for future cleanup)
    """
    logger.info(
        "[STARTUP] ============================================================"
    )
    logger.info(
        "[STARTUP] AISecGuard %s starting up | db=%s",
        settings.VERSION, settings.DATABASE_URL
    )
    logger.info(
        "[STARTUP] Upload dir: %s | Max upload: %d MB | No-login: %s",
        settings.UPLOAD_DIR, settings.MAX_UPLOAD_SIZE_MB, settings.NO_LOGIN_REQUIRED
    )

    from app.db.session import engine
    from app.db.base import Base
    Base.metadata.create_all(bind=engine)
    logger.info("[STARTUP] Database tables ensured ✓")

    # Lightweight check to ensure expected_sha256 column exists in provenance_records on SQLite
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(provenance_records)"))
            cols = [r[1] for r in result.fetchall()]
            if cols and "expected_sha256" not in cols:
                conn.execute(text("ALTER TABLE provenance_records ADD COLUMN expected_sha256 VARCHAR(64)"))
                conn.commit()
                logger.info("[STARTUP] Added missing expected_sha256 column to provenance_records ✓")
    except Exception as exc:
        logger.debug("[STARTUP] Schema pragma check: %s", exc)

    logger.info("[STARTUP] CORS origins: %s", settings.CORS_ORIGINS)
    logger.info("[STARTUP] Ready — listening for requests")
    logger.info(
        "[STARTUP] ============================================================"
    )
    yield
    logger.info("[SHUTDOWN] AISecGuard backend shutting down")


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS middleware — allow frontend dev server
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routers
    application.include_router(api_router)

    return application


app = create_application()


@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint.
    Returns the current status of the AISecGuard backend.
    This endpoint does not require authentication.
    """
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
