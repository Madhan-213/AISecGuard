"""
AISecGuard Backend — Main Application Entry Point
Week 2: Initial project setup (health check only)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.core.config import settings
from app.api.v1.router import api_router


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
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
