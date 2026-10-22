"""
AISecGuard — Hugging Face Spaces Unified Entrypoint
Runs FastAPI on port 7860, provides in-memory scanning, and delivers the compiled React UI.
"""

import os
from pathlib import Path
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from app.core.config import settings
from app.api.v1.router import api_router
from main import lifespan


def create_hf_application() -> FastAPI:
    """Create and configure application for Hugging Face Spaces."""
    application = FastAPI(
        title=f"{settings.PROJECT_NAME} — Hugging Face Space",
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Allow all origins on Hugging Face Spaces
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include REST API endpoints
    application.include_router(api_router)

    @application.get("/health", tags=["System"])
    async def health():
        return {
            "status": "ok",
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "platform": "Hugging Face Spaces (CPU 16GB)",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # Locate and serve compiled React frontend
    candidates = [
        Path("/app/frontend/dist"),
        Path("/app/dist"),
        Path(__file__).resolve().parent.parent / "frontend" / "dist",
    ]
    dist_dir = next((p for p in candidates if p.exists() and (p / "index.html").exists()), None)

    if dist_dir:
        assets_dir = dist_dir / "assets"
        if assets_dir.exists():
            application.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @application.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            # Avoid intercepting API routes or system docs
            if full_path.startswith("api/") or full_path in ["health", "docs", "redoc", "openapi.json"]:
                raise HTTPException(status_code=404, detail="Endpoint not found")
            
            target_file = dist_dir / full_path
            if full_path and target_file.is_file():
                return FileResponse(target_file)
            return FileResponse(dist_dir / "index.html")

    return application


app = create_hf_application()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("hf_app:app", host="0.0.0.0", port=port, reload=False)
