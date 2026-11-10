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

# Task 4b: Rate limiting
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    _SLOWAPI_AVAILABLE = True
except ImportError:
    _SLOWAPI_AVAILABLE = False

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




# ---------------------------------------------------------------------------
# Rate limiter (Task 4b)
# ---------------------------------------------------------------------------
from app.core.limiter import limiter

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
    logger.info("[STARTUP] Database tables ensured [OK]")


    # Task 4a: Add role column to users table if missing (SQLite ALTER TABLE migration)
    try:
        from sqlalchemy import text as _text
        with engine.connect() as conn:
            result = conn.execute(_text("PRAGMA table_info(users)"))
            cols = [r[1] for r in result.fetchall()]
            if cols and "role" not in cols:
                conn.execute(_text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'ANALYST'"))
                conn.commit()
                logger.info("[STARTUP] Added missing role column to users table")
    except Exception as exc:
        logger.debug("[STARTUP] Role column migration check: %s", exc)

    # Lightweight check to ensure expected_sha256 column exists in provenance_records on SQLite
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(provenance_records)"))
            cols = [r[1] for r in result.fetchall()]
            if cols and "expected_sha256" not in cols:
                conn.execute(text("ALTER TABLE provenance_records ADD COLUMN expected_sha256 VARCHAR(64)"))
                conn.commit()
                logger.info("[STARTUP] Added missing expected_sha256 column to provenance_records [OK]")
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


    # Task 4b: Attach rate limiter
    if limiter is not None:
        application.state.limiter = limiter
        application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Include API routers
    application.include_router(api_router)

    # Locate and serve compiled React frontend if distribution directory exists (Docker / Production)
    from pathlib import Path
    from starlette.exceptions import HTTPException as StarletteHTTPException
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse, JSONResponse
    from fastapi import Request

    candidates = [
        Path("/app/frontend/dist"),
        Path("/app/dist"),
        Path(__file__).resolve().parent.parent / "frontend" / "dist",
        Path(__file__).resolve().parent / "dist",
    ]
    dist_dir = next((p for p in candidates if p.exists() and (p / "index.html").exists()), None)

    if dist_dir:
        assets_dir = dist_dir / "assets"
        if assets_dir.exists():
            application.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @application.get("/", include_in_schema=False)
        async def serve_root():
            return FileResponse(dist_dir / "index.html")

        @application.exception_handler(StarletteHTTPException)
        async def spa_404_fallback(request: Request, exc: StarletteHTTPException):
            if exc.status_code == 404:
                # API and system endpoints return standard 404 JSON
                path_str = request.url.path
                if path_str.startswith("/api/") or path_str in ("/health", "/docs", "/redoc", "/openapi.json"):
                    return JSONResponse(status_code=404, content={"detail": exc.detail or "Not Found"})
                
                # Check for static file in dist
                target = dist_dir / path_str.lstrip("/")
                if path_str != "/" and target.is_file():
                    return FileResponse(target)
                return FileResponse(dist_dir / "index.html")
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

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
