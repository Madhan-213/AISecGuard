"""
AISecGuard — API v1 Router
Week 3: Registers artifact, scan, and finding endpoints.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import artifacts, scans, findings

api_router = APIRouter()

api_router.include_router(
    artifacts.router,
    prefix="/api/v1/artifacts",
    tags=["Artifacts"],
)

api_router.include_router(
    scans.router,
    prefix="/api/v1/scans",
    tags=["Scans"],
)

api_router.include_router(
    findings.router,
    prefix="/api/v1/findings",
    tags=["Findings"],
)
