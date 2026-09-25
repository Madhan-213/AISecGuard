"""
AISecGuard Backend — Main Application Entry Point
Week 3: Database initialization, all Week 3 routes registered.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.core.config import settings
from app.api.v1.router import api_router

# Import all models so SQLAlchemy metadata is populated before create_all
import app.models  # noqa: F401


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
    from app.db.session import engine
    from app.db.base import Base
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown logic (if needed in future weeks)


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
